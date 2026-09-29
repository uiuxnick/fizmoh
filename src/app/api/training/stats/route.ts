import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import {
  getTenantCourses,
  getTenantRegistrations,
  getTenantFeedback,
} from "@/lib/training-service"

export const dynamic = "force-dynamic"

export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || request.nextUrl.searchParams.get("tenantId") || PLATFORM

  const [courses, registrations, feedback] = await Promise.all([
    getTenantCourses(tenantId),
    getTenantRegistrations(tenantId),
    getTenantFeedback(tenantId),
  ])

  const totalCourses = courses.length
  const activeCourses = courses.filter(c => c.status === "PUBLISHED").length

  const totalRegistrations = registrations.length
  const confirmedRegistrations = registrations.filter(
    r => r.status === "CONFIRMED" || r.status === "ATTENDED" || r.status === "COMPLETED",
  ).length

  let totalRevenue = 0
  let paidRevenue = 0
  let totalAttendees = 0
  let checkedInAttendees = 0
  let waitingListCount = 0

  for (const reg of registrations) {
    totalRevenue += reg.totalAmount || 0
    if (reg.paymentStatus === "PAID") {
      paidRevenue += reg.totalAmount || 0
    }
    if (reg.status === "WAITLISTED") {
      waitingListCount += reg.numberOfSeats || 1
    }

    if (Array.isArray(reg.attendees)) {
      totalAttendees += reg.attendees.length
      for (const att of reg.attendees) {
        if (att.checkInStatus === "CHECKED_IN") {
          checkedInAttendees++
        }
      }
    }
  }

  const attendanceRate = totalAttendees > 0 ? Math.round((checkedInAttendees / totalAttendees) * 100) : 0
  const avgRating =
    feedback.length > 0
      ? Number((feedback.reduce((acc, f) => acc + (f.overallRating || 5), 0) / feedback.length).toFixed(1))
      : 5.0

  return NextResponse.json({
    kpis: {
      totalCourses,
      activeCourses,
      totalRegistrations,
      confirmedRegistrations,
      totalRevenue,
      paidRevenue,
      totalAttendees,
      checkedInAttendees,
      attendanceRate,
      waitingListCount,
      avgRating,
      currency: courses[0]?.currency || "OMR",
    },
    recentRegistrations: registrations.slice(0, 10),
  })
})
