import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"

export async function GET(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.campaign.read")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  const where: any = { tenantId }
  if (status) where.status = status

  const campaigns = await db.emailCampaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      template: {
        select: { id: true, name: true, category: true, isRtl: true },
      },
    },
  })

  return NextResponse.json({ campaigns })
}

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.campaign.create")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const body = await request.json().catch(() => ({}))

  const {
    name,
    description,
    campaignType = "STANDARD",
    senderName,
    senderEmail,
    replyTo,
    subject,
    preheader,
    templateId,
    designJson,
    htmlContent,
    plainText,
    listIds,
    segmentIds,
    tagIds,
    scheduledAt,
  } = body

  if (!name || !subject || !senderEmail) {
    return NextResponse.json(
      { error: "Campaign name, sender email, and subject line are required" },
      { status: 400 }
    )
  }

  const campaign = await db.emailCampaign.create({
    data: {
      tenantId,
      name,
      description: description || null,
      campaignType,
      status: scheduledAt ? "SCHEDULED" : "DRAFT",
      senderName: senderName || "Fizmoh Team",
      senderEmail,
      replyTo: replyTo || senderEmail,
      subject,
      preheader: preheader || null,
      templateId: templateId || null,
      designJson: designJson || null,
      htmlContent: htmlContent || null,
      plainText: plainText || null,
      listIds: Array.isArray(listIds) ? listIds : [],
      segmentIds: Array.isArray(segmentIds) ? segmentIds : [],
      tagIds: Array.isArray(tagIds) ? tagIds : [],
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    },
  })

  return NextResponse.json({ campaign })
}
