import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

const STATUSES = ["NEW", "PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"]

/** Move a private feedback item through the queue, or leave a note. */
export const PATCH = withErrors(withModule("DIGITAL_QR", async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const existing = await db.privateFeedback.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "No such feedback item" }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.status === "string" && STATUSES.includes(body.status)) data.status = body.status
  if (typeof body.internalNote === "string") data.internalNote = body.internalNote.slice(0, 2000)
  if (typeof body.assignedToId === "string") data.assignedToId = body.assignedToId || null

  const feedback = await db.privateFeedback.update({ where: { id }, data })
  return NextResponse.json({ feedback })
}))
