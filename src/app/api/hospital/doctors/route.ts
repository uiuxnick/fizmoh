import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (req?: Request) => {
  const tenantId = await resolveHospTenantId(req)
  const includeInactive = req ? new URL(req.url).searchParams.get("includeInactive") === "1" : false
  const docs = await db.hospDoctor.findMany({
    where: { tenantId, ...(includeInactive ? {} : { isActive: true }) },
    include: { department: true, schedules: true },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(docs)
})

export const POST = withErrors(async (req: NextRequest) => {
  const actor = currentTenant()
  if (!actor?.tenantId) return NextResponse.json({ error: "Staff sign-in required" }, { status: 401 })
  if (actor.role && !["OWNER", "SUPER_ADMIN", "MANAGER", "ADMIN"].includes(actor.role)) return NextResponse.json({ error: "Only hospital administrators can manage doctors" }, { status: 403 })
  const tenantId = await resolveHospTenantId(req)
  const body = await req.json()
  const schedules = Array.isArray(body.schedules) ? body.schedules : []
  const departmentId = String(body.departmentId || "")
  const department = await db.hospDepartment.findFirst({ where: { id: departmentId, tenantId, isActive: true } })
  if (!department) return NextResponse.json({ error: "Department not found" }, { status: 400 })
  const doc = await db.hospDoctor.create({
    data: {
      tenantId,
      departmentId,
      name: String(body.name || "").trim(),
      specialization: body.specialization ? String(body.specialization) : null,
      photo: body.photo ? String(body.photo) : null,
      mobile: body.mobile ? String(body.mobile) : null,
      email: body.email ? String(body.email) : null,
      languages: body.languages ? String(body.languages) : null,
      isActive: body.isActive !== false,
    },
  })
  if (schedules?.length) {
    await db.hospDoctorSchedule.createMany({
      data: schedules.map((s: any) => ({
        doctorId: doc.id,
        dayOfWeek: Number(s.dayOfWeek),
        startTime: String(s.startTime),
        endTime: String(s.endTime),
        appointmentDuration: Number(s.appointmentDuration || 30),
        isActive: s.isActive !== false,
      })),
    })
  }
  return NextResponse.json(doc, { status: 201 })
})
