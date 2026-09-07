import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { indexSource, htmlToText } from "@/lib/knowledge"
import { createAuditLog } from "@/lib/slots-server"

const MAX_BYTES = 10 * 1024 * 1024

/** Pulls readable text out of an upload, or explains why it cannot. */
async function extract(file: File): Promise<{ text: string } | { error: string }> {
  const name = file.name.toLowerCase()
  const bytes = Buffer.from(await file.arrayBuffer())

  if (name.endsWith(".pdf")) {
    try {
      // Imported lazily: a PDF parser is a large dependency to load on every
      // request that does not involve a PDF.
      const { extractText, getDocumentProxy } = await import("unpdf")
      const pdf = await getDocumentProxy(new Uint8Array(bytes))
      const { text } = await extractText(pdf, { mergePages: true })
      const joined = Array.isArray(text) ? text.join("\n\n") : text
      if (!joined || joined.trim().length < 50) {
        // A scan has no text layer, only pictures of text.
        return { error: "That PDF has no selectable text — it looks like a scan. Run it through OCR first, or paste the text in." }
      }
      return { text: joined }
    } catch (error) {
      return { error: `Could not read that PDF: ${error instanceof Error ? error.message : "unknown error"}` }
    }
  }

  if (/\.(html?|htm)$/.test(name)) return { text: htmlToText(bytes.toString("utf8")) }
  if (/\.(txt|md|markdown|csv|tsv|json|yaml|yml)$/.test(name)) return { text: bytes.toString("utf8") }

  if (/\.(docx?|xlsx?|pptx?)$/.test(name)) {
    return { error: "Word and Excel files are not supported yet — save it as PDF or plain text." }
  }
  return { error: "That file type cannot be read. Use PDF, text, Markdown, CSV or HTML." }
}

export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "No file was uploaded" }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is larger than 10 MB" }, { status: 400 })
  if (file.size === 0) return NextResponse.json({ error: "That file is empty" }, { status: 400 })

  const extracted = await extract(file)
  if ("error" in extracted) return NextResponse.json({ error: extracted.error }, { status: 400 })
  if (extracted.text.trim().length < 50) {
    return NextResponse.json({ error: "There is almost no readable text in that file" }, { status: 400 })
  }

  const title = (form?.get("title") as string | null)?.trim() || file.name
  const source = await db.knowledgeSource.create({
    data: { title: title.slice(0, 200), type: "FILE", status: "INDEXING", createdById: session.staffId },
  })
  const result = await indexSource({ sourceId: source.id, text: extracted.text, heading: title })

  await createAuditLog({
    staffId: session.staffId, action: "ADD_KNOWLEDGE", entity: "KNOWLEDGE", entityId: source.id,
    details: JSON.stringify({ title, type: "FILE", chunks: result.chunks }),
  })

  return NextResponse.json({ source: await db.knowledgeSource.findUnique({ where: { id: source.id } }), ...result }, { status: 201 })
})
