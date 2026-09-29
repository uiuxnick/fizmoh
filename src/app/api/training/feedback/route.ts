import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { getTenantFeedback, submitCourseFeedback } from "@/lib/training-service"

export const dynamic = "force-dynamic"

export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || request.nextUrl.searchParams.get("tenantId") || PLATFORM
  const courseId = request.nextUrl.searchParams.get("courseId") || undefined

  const list = await getTenantFeedback(tenantId, courseId)
  return NextResponse.json({ feedback: list, total: list.length })
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || request.nextUrl.searchParams.get("tenantId") || PLATFORM
  const body = await request.json()

  if (!body.courseId || !body.attendeeName) {
    return NextResponse.json(
      { error: "courseId and attendeeName are required" },
      { status: 400 },
    )
  }

  const record = await submitCourseFeedback(tenantId, {
    courseId: body.courseId,
    registrationId: body.registrationId,
    attendeeName: body.attendeeName,
    attendeeEmail: body.attendeeEmail || "",
    overallRating: Number(body.overallRating) || 5,
    trainerRating: Number(body.trainerRating) || 5,
    contentRating: Number(body.contentRating) || 5,
    venueRating: Number(body.venueRating) || 5,
    comments: body.comments || "",
    recommendToOthers: body.recommendToOthers !== false,
  })

  return NextResponse.json({ success: true, feedback: record })
})
