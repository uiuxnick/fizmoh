import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { createAuditLog } from "@/lib/slots-server"

import { indexSource } from "@/lib/knowledge"

export const GET = withErrors(async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params
  const source = await db.knowledgeSource.findUnique({
    where: { id },
    include: { chunks: { orderBy: { ordinal: "asc" }, select: { id: true, content: true, ordinal: true } } },
  })
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 })
  return NextResponse.json({ source })
})

export const PUT = withErrors(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const { id } = await context.params
  const source = await db.knowledgeSource.findUnique({ where: { id } })
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 200) : source.title
  const hasNewText = typeof body.text === "string" && body.text.trim().length > 0

  if (!hasNewText && title !== source.title) {
    await db.knowledgeSource.update({ where: { id }, data: { title } })
  }

  let indexResult = null
  if (hasNewText) {
    await db.knowledgeSource.update({ where: { id }, data: { title, status: "INDEXING" } })
    indexResult = await indexSource({
      sourceId: id,
      text: body.text.trim(),
      url: source.url,
      heading: title,
    })
  }

  await createAuditLog({
    staffId: session.staffId,
    action: "UPDATE_KNOWLEDGE",
    entity: "KNOWLEDGE",
    entityId: id,
    details: JSON.stringify({ title, updatedText: hasNewText, chunks: indexResult?.chunks }),
  })

  const updated = await db.knowledgeSource.findUnique({
    where: { id },
    include: { chunks: { orderBy: { ordinal: "asc" }, select: { id: true, content: true, ordinal: true } } },
  })

  return NextResponse.json({ source: updated, ...indexResult })
})

export const DELETE = withErrors(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const { id } = await context.params
  const source = await db.knowledgeSource.findUnique({ where: { id } })
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 })

  // The passages go with it — the relation cascades — so nothing is left
  // behind for the assistant to quote from a document that was withdrawn.
  await db.knowledgeSource.delete({ where: { id } })
  await createAuditLog({
    staffId: session.staffId, action: "DELETE_KNOWLEDGE", entity: "KNOWLEDGE", entityId: id,
    details: JSON.stringify({ title: source.title, type: source.type }),
  })
  return NextResponse.json({ deleted: true })
})
