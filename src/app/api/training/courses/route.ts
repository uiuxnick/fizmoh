import { validateAdditionalDates } from "@/lib/course-schedule"
import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"
import { modulesFor } from "@/lib/entitlements"
import { getTenantCourses, saveTenantCourse, type Course } from "@/lib/training-service"

export const dynamic = "force-dynamic"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "PLATFORM"]

export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || request.nextUrl.searchParams.get("tenantId")
  if (!tenantId) {
    return NextResponse.json({ courses: [], total: 0 })
  }

  const allowed = await modulesFor(tenantId)
  if (!allowed.includes("TRAINING")) {
    return NextResponse.json({ error: "Training & Course module is not enabled for this workspace", code: "MODULE_NOT_ENTITLED" }, { status: 403 })
  }

  const courses = await getTenantCourses(tenantId)
  const category = request.nextUrl.searchParams.get("category")
  const status = request.nextUrl.searchParams.get("status")

  const isStaff = !!(tenant?.staffId && tenant.tenantId === tenantId)

  let filtered = courses
  if (!isStaff) {
    filtered = filtered.filter(c => c.status === "PUBLISHED")
  }
  if (category && category !== "ALL") {
    filtered = filtered.filter(c => c.category.toLowerCase() === category.toLowerCase())
  }
  if (status && status !== "ALL") {
    filtered = filtered.filter(c => c.status === status)
  }

  return NextResponse.json({ courses: filtered, total: filtered.length })
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })
  }

  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to manage courses" }, { status: 403 })
  }

  const allowed = await modulesFor(tenantId)
  if (!allowed.includes("TRAINING")) {
    return NextResponse.json({ error: "Training & Course module is not enabled for this workspace", code: "MODULE_NOT_ENTITLED" }, { status: 403 })
  }

  const body = (await request.json()) as Partial<Course>
  try { validateAdditionalDates(body.additionalDates) } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid course dates" }, { status: 400 })
  }

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Course name is required" }, { status: 400 })
  }

  const course = await saveTenantCourse(tenantId, body)
  return NextResponse.json({ success: true, course })
})
