import { currentTenant } from "@/lib/tenant"
import { db } from "@/lib/db"
import { getAIConfig, activeKey } from "@/lib/ai-provider"

/**
 * The assistant's own reading material.
 *
 * Until now it could describe tours, because tours are rows it can query, but
 * it could not answer "what's your cancellation policy?" — that lives in a
 * document nobody had given it. This turns pasted text, uploaded files,
 * crawled pages and FAQs into passages it can quote from.
 *
 * Retrieval is deliberately two things at once. Keyword search finds the exact
 * term a customer used and is unbeatable for names, prices and references that
 * appear verbatim. Vector search finds the passage that means the same thing
 * in different words — "can I bring my kids" against a paragraph headed
 * "children under 12". Each fails where the other works, so both run and the
 * results are fused.
 */

/**
 * Passages are small enough to quote and large enough to make sense alone.
 *
 * 900 was too generous. A single passage swallowed the refund rules, the
 * children's rates and the packing list, so its vector was an average of three
 * unrelated topics and matched none of them strongly — "do babies pay" scored
 * below the threshold against a passage that answered it outright.
 */
const CHUNK_CHARS = 550
const CHUNK_OVERLAP = 120

/**
 * 512 dimensions rather than the default 1536.
 *
 * OpenAI's v3 embeddings can be truncated at request time with almost no loss
 * of quality at this scale, and it makes the in-process scan three times
 * cheaper in both memory and arithmetic.
 */
const EMBED_MODEL = "text-embedding-3-small"
const EMBED_DIMS = 512

// ── Chunking ─────────────────────────────────────────────────────────────────

/**
 * Splits text into passages, preferring to break where the author did.
 *
 * A cut in the middle of a sentence produces a passage that is quoted back to
 * a customer half-formed, so paragraph and sentence boundaries are used where
 * one falls near the target size.
 */
export function chunkText(text: string, size = CHUNK_CHARS, overlap = CHUNK_OVERLAP): string[] {
  const cleaned = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim()
  if (!cleaned) return []
  if (cleaned.length <= size) return [cleaned]

  /*
   * Split on sections before splitting on length.
   *
   * A document is usually already organised by topic, and cutting purely by
   * character count ignores that: the refund rules and the packing list end up
   * in one passage whose meaning is the average of both, which is nothing.
   * Where a document has sections, each is chunked on its own.
   */
  const sections = cleaned.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
  if (sections.length > 1) {
    const out: string[] = []
    let buffer = ""
    const flush = () => { if (buffer) { out.push(buffer); buffer = "" } }

    for (const section of sections) {
      /*
       * A heading belongs to what follows it, never to what came before.
       *
       * Merging small sections by size alone put "What to bring on a desert
       * tour." at the end of the passage about refunds, and left the packing
       * list in a passage with no heading at all. Both were then wrong: one
       * promised advice it did not contain, the other contained advice it
       * could not be found by.
       */
      if (isHeading(section)) {
        flush()
        buffer = section
        continue
      }

      // A section too big to be a passage is split by length on its own.
      if (section.length > size) {
        flush()
        out.push(...splitByLength(section, size, overlap))
        continue
      }

      // Otherwise sections accumulate until the passage is a useful size, so
      // a single short paragraph does not become a passage by itself.
      if (buffer && (buffer + "\n\n" + section).length > size) {
        flush()
        buffer = section
      } else {
        buffer = buffer ? `${buffer}\n\n${section}` : section
      }
    }
    flush()
    return out
  }

  return splitByLength(cleaned, size, overlap)
}

/**
 * Whether a section is a heading rather than prose.
 *
 * One short line, and not a sentence — headings announce a topic, so keeping
 * one with the text beneath it is what makes that text findable by the topic
 * it is about.
 */
function isHeading(section: string): boolean {
  if (section.includes("\n")) return false
  if (section.length > 80) return false
  // Markdown headings say so outright.
  if (/^#{1,6}\s/.test(section)) return true
  // Otherwise: no mid-sentence punctuation, and few enough words to be a label.
  const words = section.split(/\s+/).length
  return words <= 10 && !/[,;:]/.test(section)
}

/** Length-based splitting, preferring a sentence or paragraph boundary. */
function splitByLength(cleaned: string, size: number, overlap: number): string[] {
  if (cleaned.length <= size) return [cleaned]

  const chunks: string[] = []
  let start = 0

  while (start < cleaned.length) {
    let end = Math.min(start + size, cleaned.length)

    if (end < cleaned.length) {
      // Look back over the last third for somewhere sensible to cut.
      const window = cleaned.slice(start + Math.floor(size * 0.6), end)
      const paragraph = window.lastIndexOf("\n\n")
      const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "))
      const offset = paragraph >= 0 ? paragraph + 2 : sentence >= 0 ? sentence + 2 : -1
      if (offset > 0) end = start + Math.floor(size * 0.6) + offset
    }

    const piece = cleaned.slice(start, end).trim()
    if (piece) chunks.push(piece)
    if (end >= cleaned.length) break
    start = Math.max(start + 1, end - overlap)
  }

  return chunks
}

/** Strips a document down to the words, so markup is never indexed. */
export function htmlToText(html: string): string {
  return html
    // Whole elements whose contents are never prose.
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Block boundaries become line breaks, so paragraphs survive as paragraphs.
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#\d+;/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function pageTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? htmlToText(match[1]).slice(0, 200) : null
}

// ── Embeddings ───────────────────────────────────────────────────────────────

/**
 * Turns passages into vectors.
 *
 * Batched, because one request per passage would make indexing a long document
 * take minutes and cost the same. An empty result rather than a throw: a
 * knowledge base that cannot embed should degrade to keyword-only, not refuse
 * to index at all.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const config = await getAIConfig()
  const key = config.provider === "openai" ? activeKey(config) : process.env.OPENAI_API_KEY || ""
  if (!key) {
    console.error("No OpenAI key available for embeddings — falling back to keyword search only")
    return texts.map(() => [])
  }

  const out: number[][] = []
  const BATCH = 96
  for (let i = 0; i < texts.length; i += BATCH) {
    /*
     * Coerced, and inside the try.
     *
     * `t.slice` was called on whatever the caller passed. One non-string in
     * the array — a null chunk, a number, an object from a parsed document —
     * threw `t.slice is not a function`, and because the map sat outside the
     * try the throw escaped `embed` entirely. That is the opposite of what
     * this function promises above: it is supposed to degrade to keyword-only,
     * never to refuse. In practice it surfaced as "AI processing error" in the
     * webhook and the customer got no reply at all.
     */
    try {
      const batch = texts
        .slice(i, i + BATCH)
        .map(t => (typeof t === "string" ? t : String(t ?? "")).slice(0, 8000))
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: EMBED_MODEL, input: batch, dimensions: EMBED_DIMS }),
      })
      const data = await response.json()
      if (!response.ok || !data.data) {
        console.error("Embedding failed:", JSON.stringify(data).slice(0, 200))
        batch.forEach(() => out.push([]))
        continue
      }
      for (const item of data.data) out.push(item.embedding as number[])
    } catch (error) {
      console.error("Embedding error:", error)
      // One empty vector per text in this batch, so the caller's indexes still
      // line up with what it asked about.
      const size = Math.min(BATCH, texts.length - i)
      for (let n = 0; n < size; n++) out.push([])
    }
  }
  return out
}

function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// ── Indexing ─────────────────────────────────────────────────────────────────

export interface IndexInput {
  sourceId: string
  text: string
  url?: string | null
  heading?: string | null
}

/** Replaces a source's passages with freshly chunked and embedded ones. */
export async function indexSource(input: IndexInput): Promise<{ chunks: number; embedded: boolean }> {
  const pieces = chunkText(input.text)
  if (pieces.length === 0) {
    await db.knowledgeChunk.deleteMany({ where: { sourceId: input.sourceId } })
    await db.knowledgeSource.update({
      where: { id: input.sourceId },
      data: { status: "READY", chunkCount: 0, charCount: 0, lastIndexedAt: new Date() },
    })
    return { chunks: 0, embedded: false }
  }

  const vectors = await embed(pieces)
  const embedded = vectors.some(v => v.length > 0)

  // Replaced rather than merged: a re-index of changed content must not leave
  // the old wording behind to be quoted back at a customer.
  await db.knowledgeChunk.deleteMany({ where: { sourceId: input.sourceId } })
  await db.knowledgeChunk.createMany({
    data: pieces.map((content, ordinal) => ({
      sourceId: input.sourceId,
      content,
      ordinal,
      heading: input.heading ?? null,
      url: input.url ?? null,
      embedding: vectors[ordinal] ?? [],
    })),
  })

  await db.knowledgeSource.update({
    where: { id: input.sourceId },
    data: {
      status: "READY",
      chunkCount: pieces.length,
      charCount: input.text.length,
      lastIndexedAt: new Date(),
      error: embedded ? null : "Indexed for keyword search only — no embedding key available",
    },
  })

  return { chunks: pieces.length, embedded }
}

// ── Search ───────────────────────────────────────────────────────────────────

export interface Passage {
  id: string
  content: string
  sourceId: string
  sourceTitle: string
  url: string | null
  score: number
  matchedBy: "keyword" | "meaning" | "both"
}

const ARABIC = /[؀-ۿ]/

/**
 * Finds the passages most likely to answer a question.
 *
 * Two searches, fused by reciprocal rank rather than by score. Cosine
 * similarity and text-search rank are not measured in the same units and
 * cannot be added together meaningfully; position in each list can be. A
 * passage that both methods rank highly finishes above one that only a single
 * method loved, which is the behaviour we want.
 */
export async function searchKnowledge(query: string, limit = 5): Promise<Passage[]> {
  const cleaned = query.trim()
  if (cleaned.length < 2) return []

  /*
   * One business's knowledge, never another's.
   *
   * The keyword half of this search is raw SQL, and raw SQL goes straight to
   * the database — the scoped client cannot narrow what it never sees. So the
   * ranking ran across every tenant's chunks at once, and the passages handed
   * to the assistant could come from a different business entirely. The table
   * is empty today, which is the only reason this has not already put one
   * customer's internal documents in front of another's.
   *
   * Refused outright without a workspace rather than searching everything:
   * an assistant with no idea whose customer it is answering has nothing
   * useful to say.
   */
  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return []

  const config = ARABIC.test(cleaned) ? "arabic" : "english"

  // ── keyword ──
  let keyword: { id: string; rank: number }[] = []
  try {
    keyword = await db.$queryRawUnsafe<{ id: string; rank: number }[]>(
      `SELECT id, ts_rank(to_tsvector('${config}', content), plainto_tsquery('${config}', $1)) AS rank
       FROM "KnowledgeChunk"
       WHERE "tenantId" = $2
         AND to_tsvector('${config}', content) @@ plainto_tsquery('${config}', $1)
       ORDER BY rank DESC
       LIMIT 30`,
      cleaned,
      tenantId,
    )
  } catch (error) {
    console.error("Keyword search failed:", error)
  }

  // ── meaning ──
  let semantic: { id: string; score: number }[] = []
  const [queryVector] = await embed([cleaned])
  if (queryVector?.length) {
    // Only rows that actually carry an embedding, so a keyword-only source
    // does not drag empty vectors through the scan.
    // Stated rather than relied upon. The scoped client would narrow this, but
    // this function must be correct beside the raw query above, which it will
    // not — and reading every embedding in the database was also the reason
    // this got slower for everyone as any one tenant added documents.
    const rows = await db.knowledgeChunk.findMany({
      where: { tenantId },
      select: { id: true, embedding: true },
    })
    semantic = rows
      .filter(r => r.embedding.length > 0)
      .map(r => ({ id: r.id, score: cosine(queryVector, r.embedding) }))
      /*
       * A short question carries little signal, so its vector sits further
       * from everything — "do babies pay" scored 0.22 against the passage that
       * answers it. The ranking still puts the best passage first; this only
       * decides what is too weak to be worth showing at all, and the model is
       * separately told to say when the passages do not cover the question.
       */
      .filter(r => r.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
  }

  // ── fuse ──
  const K = 60
  const fused = new Map<string, { score: number; keyword: boolean; semantic: boolean }>()
  keyword.forEach((row, index) => {
    const entry = fused.get(row.id) || { score: 0, keyword: false, semantic: false }
    entry.score += 1 / (K + index + 1)
    entry.keyword = true
    fused.set(row.id, entry)
  })
  semantic.forEach((row, index) => {
    const entry = fused.get(row.id) || { score: 0, keyword: false, semantic: false }
    entry.score += 1 / (K + index + 1)
    entry.semantic = true
    fused.set(row.id, entry)
  })

  const top = [...fused.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, limit)
  if (top.length === 0) return []

  const chunks = await db.knowledgeChunk.findMany({
    where: { tenantId, id: { in: top.map(([id]) => id) } },
    include: { source: { select: { title: true } } },
  })
  const byId = new Map(chunks.map(c => [c.id, c]))

  return top.flatMap(([id, meta]) => {
    const chunk = byId.get(id)
    if (!chunk) return []
    return [{
      id: chunk.id,
      content: chunk.content,
      sourceId: chunk.sourceId,
      sourceTitle: chunk.source.title,
      url: chunk.url,
      score: meta.score,
      matchedBy: meta.keyword && meta.semantic ? "both" : meta.keyword ? "keyword" : "meaning",
    } as Passage]
  })
}

/** Whether this workspace has anything to search. */
export async function knowledgeReady(): Promise<boolean> {
  // Scoped explicitly: unscoped, this answered "yes" to a business with no
  // documents because some other business had uploaded some.
  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return false
  return (await db.knowledgeChunk.count({ where: { tenantId } })) > 0
}
