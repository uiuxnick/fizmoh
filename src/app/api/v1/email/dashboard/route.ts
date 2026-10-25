import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"

export async function GET(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.dashboard.view")
  if (response) return response

  const tenantId = auth!.tenant.tenantId

  // Aggregate tenant email marketing statistics
  const [
    totalSubscribers,
    activeSubscribers,
    unsubscribed,
    bounced,
    totalCampaigns,
    scheduledCampaigns,
    totalSent,
    deliveredCount,
    uniqueOpens,
    uniqueClicks,
  ] = await Promise.all([
    db.emailSubscriber.count({ where: { tenantId } }),
    db.emailSubscriber.count({ where: { tenantId, status: "SUBSCRIBED" } }),
    db.emailSubscriber.count({ where: { tenantId, status: "UNSUBSCRIBED" } }),
    db.emailSubscriber.count({ where: { tenantId, status: "BOUNCED" } }),
    db.emailCampaign.count({ where: { tenantId } }),
    db.emailCampaign.count({ where: { tenantId, status: "SCHEDULED" } }),
    db.emailCampaignRecipient.count({ where: { tenantId, status: { in: ["SENT", "DELIVERED"] } } }),
    db.emailCampaignRecipient.count({ where: { tenantId, status: "DELIVERED" } }),
    db.emailCampaignRecipient.count({ where: { tenantId, openedAt: { not: null } } }),
    db.emailCampaignRecipient.count({ where: { tenantId, clickedAt: { not: null } } }),
  ])

  const deliveryRate = totalSent > 0 ? Number(((deliveredCount / totalSent) * 100).toFixed(1)) : 100
  const openRate = deliveredCount > 0 ? Number(((uniqueOpens / deliveredCount) * 100).toFixed(1)) : 0
  const clickRate = deliveredCount > 0 ? Number(((uniqueClicks / deliveredCount) * 100).toFixed(1)) : 0
  const ctor = uniqueOpens > 0 ? Number(((uniqueClicks / uniqueOpens) * 100).toFixed(1)) : 0

  const recentCampaigns = await db.emailCampaign.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      subject: true,
      status: true,
      totalRecipients: true,
      sentCount: true,
      uniqueOpenCount: true,
      uniqueClickCount: true,
      sentAt: true,
      scheduledAt: true,
    },
  })

  return NextResponse.json({
    metrics: {
      totalSubscribers,
      activeSubscribers,
      unsubscribed,
      bounced,
      totalCampaigns,
      scheduledCampaigns,
      totalSent,
      deliveredCount,
      deliveryRate,
      uniqueOpens,
      openRate,
      uniqueClicks,
      clickRate,
      ctor,
    },
    recentCampaigns,
  })
}
