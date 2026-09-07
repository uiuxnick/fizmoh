import { db } from "@/lib/db"
import { htmlToText, pageTitle, indexSource } from "@/lib/knowledge"
import crypto from "crypto"
import { assertSafeHttpUrl } from "@/lib/safe-url"

/**
 * Reads a website so the assistant can answer from it.
 *
 * Written to be a well-behaved visitor rather than the fastest possible one:
 * robots.txt is honoured, requests are spaced out, and the crawl identifies
 * itself. The site being read is usually the operator's own, but "usually" is
 * not a licence to hammer it, and a crawler that gets a domain blocked has
 * cost more than it gathered.
 */

/*
 * How this crawler introduces itself to other people's servers.
 *
 * It announced itself as "OmanAdventuresBot" whichever workspace it was
 * indexing for, so every site it touched — and every site owner reading their
 * logs or writing a robots rule — was told the wrong organisation was
 * crawling them. The crawler belongs to the platform, so it says so.
 */
const BOT_NAME = "FizmohBot"
const USER_AGENT = `${BOT_NAME}/1.0 (+https://app.fizmoh.cloud; knowledge base indexer)`
const REQUEST_TIMEOUT_MS = 15_000
const POLITE_DELAY_MS = 400

/** Files that are not prose, however tempting the link looks. */
const SKIP_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|ico|css|js|mjs|json|xml|zip|gz|mp4|mp3|wav|avi|mov|woff2?|ttf|eot)(\?|$)/i

export interface CrawlOptions {
  startUrl: string
  maxPages?: number
  sourceId: string
}

export interface CrawlResult {
  pagesFetched: number
  pagesIndexed: number
  chunks: number
  skipped: string[]
  error?: string
}

/** The paths robots.txt tells us to leave alone. */
async function disallowedPaths(origin: string): Promise<string[]> {
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) return []
    const text = await response.text()

    // Only the rules that apply to everyone, or to us by name. A block aimed
    // at a different bot is not ours to obey or to ignore on its behalf.
    const rules: string[] = []
    let applies = false
    for (const line of text.split("\n")) {
      const clean = line.split("#")[0].trim()
      if (!clean) continue
      const [rawField, ...rest] = clean.split(":")
      const field = rawField.trim().toLowerCase()
      const value = rest.join(":").trim()
      if (field === "user-agent") {
        // Match the name we actually send, or a robots rule aimed at us is missed.
        applies = value === "*" || value.toLowerCase().includes(BOT_NAME.toLowerCase())
      } else if (field === "disallow" && applies && value) {
        rules.push(value)
      }
    }
    return rules
  } catch {
    // No robots.txt, or it could not be read. Absence is permission; a failure
    // to fetch is not, but treating it as a block would make one flaky request
    // cancel an entire crawl.
    return []
  }
}

function allowed(url: URL, disallow: string[]): boolean {
  return !disallow.some(rule => url.pathname.startsWith(rule))
}

/** Internal links worth following, normalised and de-duplicated by the caller. */
function linksFrom(html: string, base: URL): string[] {
  const found = new Set<string>()
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html))) {
    const href = match[1].trim()
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) continue
    try {
      const url = new URL(href, base)
      if (url.origin !== base.origin) continue
      if (SKIP_EXTENSIONS.test(url.pathname)) continue
      // The fragment is the same page; the query usually is not, but keeping
      // both would crawl every filter combination a shop offers.
      url.hash = ""
      url.search = ""
      found.add(url.toString())
    } catch { /* a malformed href is not worth a crash */ }
  }
  return [...found]
}

/**
 * Walks a site breadth-first and indexes each page as its own source.
 *
 * Breadth-first rather than depth-first because the pages closest to the
 * entry point are the ones a customer is most likely to be asking about, and a
 * page limit should spend itself on those rather than on the deepest corner of
 * a blog archive.
 */
export async function crawlSite(options: CrawlOptions): Promise<CrawlResult> {
  const maxPages = Math.min(options.maxPages ?? 25, 100)
  const result: CrawlResult = { pagesFetched: 0, pagesIndexed: 0, chunks: 0, skipped: [] }

  let start: URL
  try {
    start = new URL(options.startUrl)
  } catch {
    return { ...result, error: "That does not look like a valid URL" }
  }
  if (!/^https?:$/.test(start.protocol)) {
    return { ...result, error: "Only http and https addresses can be crawled" }
  }
  try { await assertSafeHttpUrl(start.toString()) }
  catch (error) { return { ...result, error: error instanceof Error ? error.message : "Unsafe URL" } }

  const disallow = await disallowedPaths(start.origin)
  const queue: string[] = [start.toString()]
  const seen = new Set<string>(queue)
  const parent = await db.knowledgeSource.findUnique({ where: { id: options.sourceId } })
  if (!parent) return { ...result, error: "Source not found" }

  while (queue.length > 0 && result.pagesFetched < maxPages) {
    const current = queue.shift()!
    const url = new URL(current)

    if (!allowed(url, disallow)) {
      result.skipped.push(`${url.pathname} (robots.txt)`)
      continue
    }

    let html = ""
    try {
      await assertSafeHttpUrl(current)
      const response = await fetch(current, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: "error",
      })
      if (!response.ok) { result.skipped.push(`${url.pathname} (HTTP ${response.status})`); continue }
      const contentType = response.headers.get("content-type") || ""
      if (!contentType.includes("html")) { result.skipped.push(`${url.pathname} (not HTML)`); continue }
      html = await response.text()
      result.pagesFetched++
    } catch (error) {
      result.skipped.push(`${url.pathname} (${error instanceof Error ? error.message : "fetch failed"})`)
      continue
    }

    for (const link of linksFrom(html, start)) {
      if (!seen.has(link) && seen.size < maxPages * 4) {
        seen.add(link)
        queue.push(link)
      }
    }

    const text = htmlToText(html)
    // A page that is mostly navigation has nothing worth quoting on it.
    if (text.length < 200) { result.skipped.push(`${url.pathname} (too little text)`); continue }

    const title = pageTitle(html) || url.pathname
    const child = await db.knowledgeSource.create({
      data: {
        title: `${parent.title} — ${title}`.slice(0, 200),
        type: "URL",
        url: current,
        status: "INDEXING",
        contentHash: crypto.createHash("sha1").update(text).digest("hex"),
        createdById: parent.createdById,
      },
    })
    const indexed = await indexSource({ sourceId: child.id, text, url: current, heading: title })
    result.pagesIndexed++
    result.chunks += indexed.chunks

    // Spacing the requests out. The site is usually the operator's own, and a
    // crawl that knocks it over during business hours helps nobody.
    if (queue.length > 0) await new Promise(resolve => setTimeout(resolve, POLITE_DELAY_MS))
  }

  await db.knowledgeSource.update({
    where: { id: options.sourceId },
    data: {
      status: "READY",
      chunkCount: result.chunks,
      lastIndexedAt: new Date(),
      error: result.pagesIndexed === 0 ? "No readable pages were found" : null,
    },
  })

  return result
}
