import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"

export async function GET(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.subscribers.read")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const segments = await db.emailSegment.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ segments })
}

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.subscribers.create")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const body = await request.json().catch(() => ({}))
  const { name, description, ruleLogic = "AND", conditions = [] } = body

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Segment name is required" }, { status: 400 })
  }

  const segment = await db.emailSegment.create({
    data: {
      tenantId,
      name: name.trim(),
      description: description || null,
      ruleLogic,
      conditionsJson: conditions,
      subscriberCount: 0,
      lastCalculatedAt: new Date(),
    },
  })

  return NextResponse.json({ segment })
}
