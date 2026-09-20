import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

export const GET = withErrors(async () => {
  const campaigns = await db.campaign.findMany({
    include: { template: true, segment: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ campaigns })
})

export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json()
  const templateId = body.templateId && body.templateId !== "__none" ? body.templateId : null
  const segmentId = body.segmentId && body.segmentId !== "__all" ? body.segmentId : null

  const campaign = await db.campaign.create({
    data: {
      name: body.name,
      channel: body.channel || "WHATSAPP",
      templateId,
      segmentId,
      subject: body.subject || null,
      customContent: body.customContent || null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      status: body.scheduledAt ? "SCHEDULED" : "DRAFT",
    },
  })
  return NextResponse.json({ campaign }, { status: 201 })
})
