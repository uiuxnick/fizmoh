import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (req: NextRequest) => {
  const actor = currentTenant()
  if (!actor?.tenantId) return NextResponse.json({ error: "Staff sign-in required" }, { status: 401 })
  if (actor.role && !["OWNER", "SUPER_ADMIN", "MANAGER", "ADMIN"].includes(actor.role)) return NextResponse.json({ error: "Patient directory access is restricted" }, { status: 403 })
  const tenantId = await resolveHospTenantId(req)
  const url = new URL(req.url)
  const q = url.searchParams.get("q") || ""
  const patients = await db.hospPatient.findMany({
    where: {
      tenantId,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { mrn: { contains: q, mode: "insensitive" } },
        { mobile: { contains: q } },
      ],
    },
    include: {
      _count: { select: { chemoBookings: true, appointments: true, treatments: true } },
    },
    take: 50,
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(patients)
})

export const POST = withErrors(async (req: NextRequest) => {
  // Public registration is required by the patient booking portal; ownership
  // is enforced by the tenant resolved from the public hospital configuration.
  const tenantId = await resolveHospTenantId(req)
  const body = await req.json()

  const data = {
    tenantId,
    mrn: body.mrn ? String(body.mrn).trim() : "",
    fullName: String(body.fullName || "").trim(),
    mobile: String(body.mobile || "").trim(),
    email: body.email ? String(body.email).trim() : null,
    dob: body.dob ? new Date(body.dob) : null,
    gender: body.gender ? String(body.gender).trim() : null,
    nationalId: body.nationalId ? String(body.nationalId).trim() : null,
    emergContact: body.emergContact ? String(body.emergContact).trim() : null,
  }

  if (!data.fullName || !data.mobile) {
    return NextResponse.json({ error: "Full name and mobile are required" }, { status: 400 })
  }

  // Auto-generate MRN if not provided
  if (!data.mrn) {
    const count = await db.hospPatient.count({ where: { tenantId } })
    data.mrn = "MRN" + String(count + 10001).padStart(5, "0")
  }

  const patient = await db.hospPatient.create({ data })
  return NextResponse.json(patient, { status: 201 })
})
