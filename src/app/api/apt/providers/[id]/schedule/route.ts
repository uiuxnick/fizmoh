import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const schedules = await db.aptSchedule.findMany({
    where: { providerId: id, tenantId: tenant.tenantId },
    orderBy: { dayOfWeek: "asc" },
  })

  return NextResponse.json({ schedules })
})

export const PUT = withErrors(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const { schedules } = body // Array of { dayOfWeek, isWorkingDay, shifts, breaks }

  if (!Array.isArray(schedules)) {
    return NextResponse.json({ error: "Invalid schedule format" }, { status: 400 })
  }

  for (const s of schedules) {
    await db.aptSchedule.upsert({
      where: { providerId_dayOfWeek: { providerId: id, dayOfWeek: s.dayOfWeek } },
      create: {
        tenantId: tenant.tenantId,
        providerId: id,
        dayOfWeek: s.dayOfWeek,
        isWorkingDay: s.isWorkingDay,
        shiftsJson: JSON.stringify(s.shifts || []),
        breaksJson: JSON.stringify(s.breaks || []),
      },
      update: {
        isWorkingDay: s.isWorkingDay,
        shiftsJson: JSON.stringify(s.shifts || []),
        breaksJson: JSON.stringify(s.breaks || []),
      },
    })
  }

  const updated = await db.aptSchedule.findMany({ where: { providerId: id } })
  return NextResponse.json({ schedules: updated })
})
