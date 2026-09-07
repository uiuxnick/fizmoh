import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get("unreadOnly") === "true"
  const forRole = searchParams.get("forRole")
  const tenantId = currentTenant()?.tenantId

  const where: any = { isRead: false }
  if (!unreadOnly) delete where.isRead
  if (forRole) where.forRole = forRole
  // Strict tenant isolation
  where.tenantId = tenantId || null

  const notifications = await db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json({ notifications })
})

export const PATCH = withErrors(async (request: NextRequest) => {
  const body = await request.json()
  const { id, markAllRead } = body
  const tenantId = currentTenant()?.tenantId

  if (markAllRead) {
    await db.notification.updateMany({
      where: {
        isRead: false,
        tenantId: tenantId || null,
      },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true })
  }

  if (id) {
    await db.notification.updateMany({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "id or markAllRead required" }, { status: 400 })
})
