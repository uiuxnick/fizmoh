import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"

/** Withdrawing an invitation that should not have been sent. */
export const DELETE = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  }
  const staff = await db.staff.findFirst({ where: { id: session.staffId } })
  if (!staff || !["SUPER_ADMIN", "OPS_ADMIN", "MANAGER"].includes(staff.role)) {
    return NextResponse.json({ error: "Only an administrator can do that" }, { status: 403 })
  }

  const { id } = await context.params
  // Revoked rather than deleted, so a link that arrives later can say it was
  // withdrawn instead of simply not working.
  await db.invitation.updateMany({ where: { id }, data: { revokedAt: new Date() } })
  return NextResponse.json({ revoked: true })
})
