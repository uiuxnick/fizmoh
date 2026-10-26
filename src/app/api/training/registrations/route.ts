import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"
import { modulesFor } from "@/lib/entitlements"
import {
  getTenantRegistrations,
  createCourseRegistration,
  type RegisterCourseInput,
} from "@/lib/training-service"

export const dynamic = "force-dynamic"

const REG_ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "AGENT", "CHAT_AGENT", "PLATFORM"]

export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const allowed = await modulesFor(tenantId)
  if (!allowed.includes("TRAINING")) {
    return NextResponse.json({ error: "Training & Course module is not enabled for this workspace", code: "MODULE_NOT_ENTITLED" }, { status: 403 })
  }

  const all = await getTenantRegistrations(tenantId)

  const courseId = request.nextUrl.searchParams.get("courseId")
  const status = request.nextUrl.searchParams.get("status")
  const paymentStatus = request.nextUrl.searchParams.get("paymentStatus")
  const search = request.nextUrl.searchParams.get("search")?.toLowerCase().trim()

  let filtered = all
  if (courseId && courseId !== "ALL") {
    filtered = filtered.filter(r => r.courseId === courseId || r.courseSlug === courseId)
  }
  if (status && status !== "ALL") {
    filtered = filtered.filter(r => r.status === status)
  }
  if (paymentStatus && paymentStatus !== "ALL") {
    filtered = filtered.filter(r => r.paymentStatus === paymentStatus)
  }
  if (search) {
    filtered = filtered.filter(
      r =>
        r.customerName.toLowerCase().includes(search) ||
        r.customerPhone.includes(search) ||
        r.customerEmail.toLowerCase().includes(search) ||
        r.registrationNumber.toLowerCase().includes(search) ||
        (r.companyName && r.companyName.toLowerCase().includes(search)),
    )
  }

  return NextResponse.json({
    registrations: filtered,
    total: filtered.length,
  })
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })
  }

  if (tenant.role && !REG_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to manage registrations" }, { status: 403 })
  }

  const allowed = await modulesFor(tenantId)
  if (!allowed.includes("TRAINING")) {
    return NextResponse.json({ error: "Training & Course module is not enabled for this workspace", code: "MODULE_NOT_ENTITLED" }, { status: 403 })
  }

  const body = (await request.json()) as RegisterCourseInput

  if (!body.courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 })
  }
  if (!body.customerName) {
    return NextResponse.json({ error: "customerName is required" }, { status: 400 })
  }

  const result = await createCourseRegistration(tenantId, {
    ...body,
    source: body.source || "MANUAL",
  })

  return NextResponse.json({ success: true, ...result })
})
