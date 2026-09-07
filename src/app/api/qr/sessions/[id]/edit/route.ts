import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withSessionTenant, isRouteError, qrRateLimited } from "@/lib/qr-review"

/** The customer may reword the selected suggestion. The final text is theirs. */
export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const limited = qrRateLimited(request.headers, "write")
  if (limited) return limited
  const body = await request.json().catch(() => null)
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : ""
  if (!text) return NextResponse.json({ error: "Review text cannot be empty" }, { status: 400 })

  const result = await withSessionTenant(id, async () => {
    const { db } = await import("@/lib/db")
    const session = await db.reviewSession.findUnique({ where: { id } })
    if (!session) return { error: "No such session", status: 404 }
    await db.reviewSession.update({
      where: { id },
      data: { editedText: text, finalText: text, status: "EDITED" },
    })
    return { ok: true }
  })

  if (isRouteError(result)) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
})
