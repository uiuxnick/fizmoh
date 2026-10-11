import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"
import { getEmailProvider } from "@/lib/email-marketing/providers"
import { withTenant } from "@/lib/tenant-context"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.campaign.send")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const { id } = await params

  const campaign = await db.emailCampaign.findUnique({
    where: { id },
  })

  if (!campaign || campaign.tenantId !== tenantId) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  if (campaign.status === "SENDING" || campaign.status === "SENT") {
    return NextResponse.json({ error: "Campaign has already been sent or is currently sending" }, { status: 400 })
  }

  // 1. Gather targeted subscribers (respecting suppression and unsubscribes)
  const listIds = Array.isArray(campaign.listIds) ? (campaign.listIds as string[]) : []

  const whereSub: any = {
    tenantId,
    status: "SUBSCRIBED",
  }

  if (listIds.length > 0) {
    whereSub.listMemberships = { some: { listId: { in: listIds } } }
  }

  const subscribers = await db.emailSubscriber.findMany({
    where: whereSub,
    take: 500, // Process first batch
    select: { id: true, email: true, firstName: true, lastName: true },
  })

  if (subscribers.length === 0) {
    return NextResponse.json({ error: "No subscribed recipients found in the selected target lists." }, { status: 400 })
  }

  // Update campaign to SENDING
  await db.emailCampaign.update({
    where: { id },
    data: {
      status: "SENDING",
      totalRecipients: subscribers.length,
      sentAt: new Date(),
    },
  })

  // 2. Dispatch batch with idempotency key inside tenant context
  const provider = getEmailProvider("SMTP")
  let sentCount = 0

  for (const sub of subscribers) {
    const idempotencyKey = `${campaign.id}:${sub.id}`
    const html = campaign.htmlContent || `<p>${campaign.subject}</p>`

    try {
      const result = await withTenant(auth!.tenant, () =>
        provider.send({
          to: sub.email,
          fromName: campaign.senderName,
          fromEmail: campaign.senderEmail,
          replyTo: campaign.replyTo || undefined,
          subject: campaign.subject,
          html,
          text: campaign.plainText || undefined,
          idempotencyKey,
        }),
      )

      await db.emailCampaignRecipient.upsert({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
        create: {
          tenantId,
          campaignId: campaign.id,
          subscriberId: sub.id,
          email: sub.email,
          status: result.success ? "SENT" : "FAILED",
          providerMessageId: result.messageId || null,
          idempotencyKey,
          sentAt: new Date(),
        },
        update: {
          status: result.success ? "SENT" : "FAILED",
          providerMessageId: result.messageId || null,
          sentAt: new Date(),
        },
      })

      if (result.success) sentCount++
    } catch {
      // Continue next recipient
    }
  }

  await db.emailCampaign.update({
    where: { id },
    data: {
      status: "SENT",
      sentCount,
      deliveredCount: sentCount,
      completedAt: new Date(),
    },
  })

  return NextResponse.json({
    success: true,
    campaignId: campaign.id,
    sentCount,
    totalRecipients: subscribers.length,
  })
}
