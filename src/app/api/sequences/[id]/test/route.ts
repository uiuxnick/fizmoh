import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { withModule } from "@/lib/entitlements"
import { testSequenceStep } from "@/lib/sequences"

const CAMPAIGN_TEST_ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "MARKETING", "PLATFORM"]

export const POST = withErrors(withModule("BROADCAST", async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenant = currentTenant()
  const role = (tenant?.role || session.role || "").toUpperCase()
  if (role && !CAMPAIGN_TEST_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to test sequences" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { step, recipientPhone, recipientEmail } = body

  if (!step || !step.messageBody) {
    return NextResponse.json({ error: "step with messageBody is required" }, { status: 400 })
  }

  const tenantId = tenant?.tenantId || PLATFORM
  const result = await testSequenceStep(tenantId, step, {
    phone: recipientPhone,
    email: recipientEmail,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to send test message" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}))
