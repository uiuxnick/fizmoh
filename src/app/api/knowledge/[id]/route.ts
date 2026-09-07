import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { createAuditLog } from "@/lib/slots-server"

export const GET = withErrors(async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params
  const source = await db.knowledgeSource.findUnique({
    where: { id },
    include: { chunks: { orderBy: { ordinal: "asc" }, select: { id: true, content: true, ordinal: true } } },
  })
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 })
  return NextResponse.json({ source })
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
