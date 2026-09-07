import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { indexSource, htmlToText, pageTitle } from "@/lib/knowledge"
import { crawlSite } from "@/lib/crawler"
import { createAuditLog } from "@/lib/slots-server"
import { z } from "zod"
import { assertSafeHttpUrl } from "@/lib/safe-url"

const createSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TEXT"),
    title: z.string().trim().min(1).max(200),
    text: z.string().trim().min(20).max(500_000),
  }),
  z.object({
    type: z.literal("FAQ"),
    title: z.string().trim().min(1).max(200),
    question: z.string().trim().min(3).max(500),
    answer: z.string().trim().min(3).max(10_000),
  }),
  z.object({
    type: z.literal("URL"),
    url: z.string().trim().url().max(2000),
  }),
  z.object({
    type: z.literal("SITE"),
    url: z.string().trim().url().max(2000),
    maxPages: z.coerce.number().int().min(1).max(100).default(25),
  }),
])

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const sources = await db.knowledgeSource.findMany({
    where: searchParams.get("type") ? { type: searchParams.get("type")! } : {},
    orderBy: { createdAt: "desc" },
    take: 500,
  })
  const [totalChunks, embedded] = await Promise.all([
    db.knowledgeChunk.count(),
    db.knowledgeChunk.count({ where: { NOT: { embedding: { isEmpty: true } } } }),
  ])
  return NextResponse.json({ sources, totalChunks, embedded })
})

export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid source" }, { status: 400 })
  const body = parsed.data

  // ── pasted text and FAQ entries index immediately ──
  if (body.type === "TEXT" || body.type === "FAQ") {
    const text = body.type === "FAQ" ? `Q: ${body.question}\n\nA: ${body.answer}` : body.text
    const source = await db.knowledgeSource.create({
      data: { title: body.title, type: body.type, status: "INDEXING", createdById: session.staffId },
    })
    const result = await indexSource({ sourceId: source.id, text })
    await createAuditLog({
      staffId: session.staffId, action: "ADD_KNOWLEDGE", entity: "KNOWLEDGE", entityId: source.id,
      details: JSON.stringify({ title: body.title, type: body.type, chunks: result.chunks }),
    })
    return NextResponse.json({ source: await db.knowledgeSource.findUnique({ where: { id: source.id } }), ...result }, { status: 201 })
  }

  // ── a single page ──
  if (body.type === "URL") {
    let safeUrl: URL
    try { safeUrl = await assertSafeHttpUrl(body.url) }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unsafe URL" }, { status: 400 }) }
    const source = await db.knowledgeSource.create({
      data: { title: safeUrl.toString(), type: "URL", url: safeUrl.toString(), status: "INDEXING", createdById: session.staffId },
    })
    try {
      const response = await fetch(safeUrl, {
        headers: { "User-Agent": "OmanAdventuresBot/1.0 (knowledge base indexer)" },
        signal: AbortSignal.timeout(20_000),
        redirect: "error",
      })
      if (!response.ok) throw new Error(`The page returned HTTP ${response.status}`)
      const html = await response.text()
      const text = htmlToText(html)
      if (text.length < 100) throw new Error("That page has almost no readable text on it")
      const title = pageTitle(html) || body.url
      await db.knowledgeSource.update({ where: { id: source.id }, data: { title: title.slice(0, 200) } })
      const result = await indexSource({ sourceId: source.id, text, url: safeUrl.toString(), heading: title })
      return NextResponse.json({ source: await db.knowledgeSource.findUnique({ where: { id: source.id } }), ...result }, { status: 201 })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read that page"
      await db.knowledgeSource.update({ where: { id: source.id }, data: { status: "ERROR", error: message } })
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  // ── a whole site ──
  // Crawling takes minutes, so the source is created now and filled in behind
  // the response. The screen polls, rather than the browser holding a request
  // open long enough to be cut off by a proxy.
  let safeSiteUrl: URL
  try { safeSiteUrl = await assertSafeHttpUrl(body.url) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unsafe URL" }, { status: 400 }) }
  const source = await db.knowledgeSource.create({
    data: { title: `Site: ${safeSiteUrl.hostname}`, type: "SITE", url: safeSiteUrl.toString(), status: "INDEXING", createdById: session.staffId },
  })
  void crawlSite({ startUrl: safeSiteUrl.toString(), maxPages: body.maxPages, sourceId: source.id }).catch(async error => {
    await db.knowledgeSource.update({
      where: { id: source.id },
      data: { status: "ERROR", error: error instanceof Error ? error.message : "Crawl failed" },
    })
  })
  await createAuditLog({
    staffId: session.staffId, action: "CRAWL_SITE", entity: "KNOWLEDGE", entityId: source.id,
    details: JSON.stringify({ url: body.url, maxPages: body.maxPages }),
  })
  return NextResponse.json({ source, crawling: true }, { status: 202 })
})
