import { validateAdditionalDates } from "@/lib/course-schedule"
import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"
import { modulesFor } from "@/lib/entitlements"
import {
  getCourseByIdOrSlug,
  saveTenantCourse,
  deleteTenantCourse,
  propagateCourseTemplateToCertificates,
  applyTemplateToAllPastAndFuture,
  type Course,
} from "@/lib/training-service"

export const dynamic = "force-dynamic"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "PLATFORM"]

export const GET = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId || request.nextUrl.searchParams.get("tenantId")
    if (!tenantId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 })
    }

    const allowed = await modulesFor(tenantId)
    if (!allowed.includes("TRAINING")) {
      return NextResponse.json({ error: "Training & Course module is not enabled for this workspace", code: "MODULE_NOT_ENTITLED" }, { status: 403 })
    }

    const course = await getCourseByIdOrSlug(tenantId, id)
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const isStaff = !!(tenant?.staffId && tenant.tenantId === tenantId)
    if (!isStaff && course.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    return NextResponse.json({ course })
  },
)

export const PUT = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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

    const { id } = await params
    const body = (await request.json()) as any
    try { validateAdditionalDates(body.additionalDates) } catch (error) {
      console.error(`[PUT /api/training/courses/${id}] date validation error:`, error, JSON.stringify(body.additionalDates))
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid course dates" }, { status: 400 })
    }

    const existing = await getCourseByIdOrSlug(tenantId, id)
    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const targetTenantId = existing.tenantId || tenantId
    const { applyToExistingCertificates, applyToAllPastAndFuture, ...courseData } = body

    const updated = await saveTenantCourse(targetTenantId, {
      ...existing,
      ...courseData,
      id: existing.id,
      tenantId: targetTenantId,
    })

    let propagatedCount = 0
    let coursesUpdated = 0

    if (applyToAllPastAndFuture) {
      const res = await applyTemplateToAllPastAndFuture(targetTenantId, {
        certificateTitle: updated.certificateTitle,
        certificateSubtitle: updated.certificateSubtitle,
        certificateBodyText: updated.certificateBodyText,
        trainerCompany: updated.trainerCompany,
        trainerName: updated.trainerName,
        trainerDesignation: updated.trainerDesignation,
        showTrainerDesignation: updated.showTrainerDesignation,
        showCourseDates: updated.showCourseDates,
        templateTheme: updated.templateTheme,
        borderStyle: updated.borderStyle,
        sealType: updated.sealType,
        accentColor: updated.certificateAccentColor,
      })
      propagatedCount = res.propagatedCertificates
      coursesUpdated = res.updatedCourses
    } else if (applyToExistingCertificates) {
      propagatedCount = await propagateCourseTemplateToCertificates(targetTenantId, existing.id, {
        certificateTitle: updated.certificateTitle,
        certificateSubtitle: updated.certificateSubtitle,
        certificateBodyText: updated.certificateBodyText,
        trainerCompany: updated.trainerCompany,
        trainerName: updated.trainerName,
        trainerDesignation: updated.trainerDesignation,
        showTrainerDesignation: updated.showTrainerDesignation,
        courseDates: updated.customCourseDates,
        showCourseDates: updated.showCourseDates,
        templateTheme: updated.templateTheme,
        borderStyle: updated.borderStyle,
        sealType: updated.sealType,
        accentColor: updated.certificateAccentColor,
      })
    }

    return NextResponse.json({ success: true, course: updated, propagatedCount, coursesUpdated })
  },
)

export const POST = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })
    }

    if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions to duplicate courses" }, { status: 403 })
    }

    const allowed = await modulesFor(tenantId)
    if (!allowed.includes("TRAINING")) {
      return NextResponse.json({ error: "Training & Course module is not enabled for this workspace", code: "MODULE_NOT_ENTITLED" }, { status: 403 })
    }

    const { id } = await params
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
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })
    }

    if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions to delete courses" }, { status: 403 })
    }

    const allowed = await modulesFor(tenantId)
    if (!allowed.includes("TRAINING")) {
      return NextResponse.json({ error: "Training & Course module is not enabled for this workspace", code: "MODULE_NOT_ENTITLED" }, { status: 403 })
    }

    const { id } = await params
    await deleteTenantCourse(tenantId, id)
    return NextResponse.json({ success: true, message: "Course deleted successfully" })
  },
)
