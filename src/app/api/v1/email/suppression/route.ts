import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"

export async function GET(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.subscribers.read")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const suppressions = await db.emailSuppression.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json({ suppressions })
}

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.subscribers.create")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const body = await request.json().catch(() => ({}))
  const { email, reason = "MANUAL" } = body

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
  }

  const cleanEmail = email.trim().toLowerCase()

  const suppression = await db.emailSuppression.upsert({
    where: { tenantId_email: { tenantId, email: cleanEmail } },
    create: { tenantId, email: cleanEmail, reason, source: "ADMIN_MANUAL" },
    update: { reason, source: "ADMIN_MANUAL" },
  })

  // Update subscriber status if exists
  await db.emailSubscriber.updateMany({
    where: { tenantId, email: cleanEmail },
    data: { status: "SUPPRESSED" },
  })

  return NextResponse.json({ suppression })
}
