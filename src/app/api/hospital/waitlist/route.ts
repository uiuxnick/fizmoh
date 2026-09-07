import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

export const POST = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const body = await req.json()
  const entry = await db.hospWaitlist.create({ data: { tenantId, ...body } })
  return NextResponse.json(entry, { status: 201 })
})

export const GET = withErrors(async (req: NextRequest) => {
  const tenantId = await resolveHospTenantId(req)
  const url = new URL(req.url)
  const dateStr = url.searchParams.get("date")
  const where: any = { tenantId }
  if (dateStr) where.preferredDate = new Date(dateStr)
  const list = await db.hospWaitlist.findMany({ where, include: { patient: true }, orderBy: { createdAt: "asc" } })
  return NextResponse.json(list)
})
