import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"

export async function GET(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.automation.read")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const automations = await db.emailAutomation.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ automations })
}

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.automation.manage")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const body = await request.json().catch(() => ({}))
  const { name, description, triggerType, status = "ACTIVE", steps = [] } = body

  if (!name || !triggerType) {
    return NextResponse.json({ error: "Automation name and triggerType required" }, { status: 400 })
  }

  const automation = await db.emailAutomation.create({
    data: {
      tenantId,
      name,
      description: description || null,
      triggerType,
      status,
      stepsJson: steps,
    },
  })

  return NextResponse.json({ automation })
}
