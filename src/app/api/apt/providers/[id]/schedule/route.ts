import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "PLATFORM", "MANAGER"]

export const GET = withErrors(withModule("APPOINTMENTS", async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const provider = await db.aptProvider.findFirst({
    where: { id, tenantId: tenant.tenantId },
  })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const schedules = await db.aptSchedule.findMany({
    where: { providerId: id, tenantId: tenant.tenantId },
    orderBy: { dayOfWeek: "asc" },
  })

  return NextResponse.json({ schedules })
}))

export const PUT = withErrors(withModule("APPOINTMENTS", async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can update schedules" }, { status: 403 })
  }
  const { id } = await params

  const provider = await db.aptProvider.findFirst({
    where: { id, tenantId: tenant.tenantId },
  })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { schedules } = body // Array of { dayOfWeek, isWorkingDay, shifts, breaks }

  if (!Array.isArray(schedules)) {
    return NextResponse.json({ error: "Invalid schedule format" }, { status: 400 })
  }

  for (const s of schedules) {
    if (typeof s.dayOfWeek !== "number" || s.dayOfWeek < 0 || s.dayOfWeek > 6) continue
    await db.aptSchedule.upsert({
      where: { providerId_dayOfWeek: { providerId: id, dayOfWeek: s.dayOfWeek } },
      create: {
        tenantId: tenant.tenantId,
        providerId: id,
        dayOfWeek: s.dayOfWeek,
        isWorkingDay: Boolean(s.isWorkingDay),
        shiftsJson: JSON.stringify(s.shifts || []),
        breaksJson: JSON.stringify(s.breaks || []),
      },
      update: {
        isWorkingDay: Boolean(s.isWorkingDay),
        shiftsJson: JSON.stringify(s.shifts || []),
        breaksJson: JSON.stringify(s.breaks || []),
      },
    })
  }

  const updated = await db.aptSchedule.findMany({
    where: { providerId: id, tenantId: tenant.tenantId },
    orderBy: { dayOfWeek: "asc" },
  })
  return NextResponse.json({ schedules: updated })
}))
