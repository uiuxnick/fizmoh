import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import {
  getCourseByIdOrSlug,
  saveTenantCourse,
  deleteTenantCourse,
  type Course,
} from "@/lib/training-service"

export const dynamic = "force-dynamic"

export const GET = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId || request.nextUrl.searchParams.get("tenantId") || PLATFORM

    const course = await getCourseByIdOrSlug(tenantId, id)
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    return NextResponse.json({ course })
  },
)

export const PUT = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId || PLATFORM
    const body = (await request.json()) as Partial<Course>

    const existing = await getCourseByIdOrSlug(tenantId, id)
    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const updated = await saveTenantCourse(tenantId, {
      ...existing,
      ...body,
      id: existing.id,
    })

    return NextResponse.json({ success: true, course: updated })
  },
)

export const POST = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId || PLATFORM
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "duplicate") {
      const source = await getCourseByIdOrSlug(tenantId, id)
      if (!source) {
        return NextResponse.json({ error: "Source course not found" }, { status: 404 })
      }

      const duplicateCourse: Partial<Course> = {
        ...source,
        id: `course_${Date.now()}`,
        name: `${source.name} (Copy)`,
        shortTitle: `${source.shortTitle} (Copy)`,
        slug: `${source.slug}-copy-${Date.now().toString().slice(-4)}`,
        courseId: `${source.courseId}-COPY`,
        status: "DRAFT",
        reservedSeats: 0,
        confirmedSeats: 0,
        availableSeats: source.maxSeats,
      }

      const saved = await saveTenantCourse(tenantId, duplicateCourse)
      return NextResponse.json({ success: true, course: saved, message: "Course duplicated successfully" })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  },
)

export const DELETE = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId || PLATFORM

    await deleteTenantCourse(tenantId, id)
    return NextResponse.json({ success: true, message: "Course deleted successfully" })
  },
)
