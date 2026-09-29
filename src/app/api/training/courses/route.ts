import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { getTenantCourses, saveTenantCourse, type Course } from "@/lib/training-service"

export const dynamic = "force-dynamic"

export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || request.nextUrl.searchParams.get("tenantId") || PLATFORM
  const courses = await getTenantCourses(tenantId)

  const category = request.nextUrl.searchParams.get("category")
  const status = request.nextUrl.searchParams.get("status")

  let filtered = courses
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
  const tenantId = tenant?.tenantId || PLATFORM
  const body = (await request.json()) as Partial<Course>

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Course name is required" }, { status: 400 })
  }

  const course = await saveTenantCourse(tenantId, body)
  return NextResponse.json({ success: true, course })
})
