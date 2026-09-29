import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { processAttendeeCheckIn } from "@/lib/training-service"

export const dynamic = "force-dynamic"

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId || PLATFORM
  const body = await request.json()

  const qrToken = body.qrToken || body.token || body.attendeeId
  if (!qrToken || typeof qrToken !== "string") {
    return NextResponse.json({ error: "QR token or attendee token is required" }, { status: 400 })
  }

  const result = await processAttendeeCheckIn(tenantId, qrToken.trim())
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.message }, { status: 404 })
  }

  return NextResponse.json(result)
})
