import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule, withinLimit, limitReached } from "@/lib/entitlements"
import { buildSegmentWhere, consentFilter } from "@/lib/segments"
import { runCampaignSlice } from "@/lib/campaign-send"
import { parseCards } from "@/lib/carousel"

/**
 * Send a broadcast campaign.
 * Per BRD §6.5.3: "Send broadcast campaigns to segmented subscriber lists ...
 * respecting WhatsApp's 24-hour session and template rules" and "manage
 * opt-out/unsubscribe automatically per WhatsApp/Meta policy".
 *
 * Recipients are materialised first (one CampaignRecipient row per customer,
 * unique per campaign) so the send is idempotent: a retry, a double-click, or
 * a cron re-run picks up only what is still PENDING.
 */

export const maxDuration = 300

export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  // A broadcast is the fastest way to spend a month of allowance, so it is checked before the first message rather than partway through.
  const room = await withinLimit("messagesPerMonth")
  if (!room.ok) return limitReached("messagesPerMonth", room.used, room.cap)

  const { id } = await params

  const campaign = await db.campaign.findUnique({
    where: { id },
    include: { template: true, segment: true },
  })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  if (campaign.status === "SENDING") {
    return NextResponse.json({ error: "Campaign is already sending" }, { status: 409 })
  }
  if (campaign.status === "SENT") {
    return NextResponse.json({ error: "Campaign has already been sent" }, { status: 409 })
  }

  if (campaign.channel === "WHATSAPP" && !campaign.template) {
    // Meta only delivers marketing messages as approved templates. Without one
    // this campaign would silently reach nobody outside an open session.
    return NextResponse.json(
      { error: "WhatsApp campaigns require an approved template" },
      { status: 400 },
    )
  }
  if (campaign.channel === "WHATSAPP" && campaign.template?.status !== "APPROVED") {
    return NextResponse.json(
      { error: `Template is ${campaign.template?.status || "missing"} — Meta only delivers APPROVED templates` },
      { status: 400 },
    )
  }
  if ((campaign.channel === "FACEBOOK" || campaign.channel === "INSTAGRAM") && !campaign.customContent && !campaign.template?.bodyContent) {
    return NextResponse.json(
      { error: `${campaign.channel === "FACEBOOK" ? "Facebook" : "Instagram"} campaigns require message content` },
      { status: 400 },
    )
  }

  // ─── Carousel cards ───
  //
  // A carousel template is only delivered if the send repeats every card, each
  // with its media. Sending one with body variables alone — which is what this
  // did — makes Meta reject the whole message for a parameter mismatch, so a
  // carousel campaign reported "sent" and reached nobody.
  const templateCards = parseCards(campaign.template?.cards)
  if (templateCards.length > 0) {
    const withoutImages = templateCards.filter(c => !/^https:\/\//i.test(c.imageUrl || ""))
    if (withoutImages.length > 0) {
      // Meta fetches card media itself, so a relative path or a local file is
      // unreachable and the send fails per recipient with no useful reason.
      await db.campaign.update({
        where: { id: campaign.id },
        data: { status: "DRAFT", lastError: "Carousel cards need public https images" },
      })
      return NextResponse.json(
        { error: "Every carousel card needs a public https image before this can be sent" },
        { status: 400 },
      )
    }
  }

  /** How many values a card's body expects, so the count always matches. */
  function cardValues(body: string, name: string): string[] {
    const slots = new Set(
      [...String(body || "").matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map(m => Number(m[1])),
    )
    return Array.from({ length: slots.size }, () => name)
  }

  // ─── Materialise recipients ───
  const rules = campaign.segment?.filterRules
    ? (typeof campaign.segment.filterRules === "string"
        ? JSON.parse(campaign.segment.filterRules)
        : campaign.segment.filterRules)
    : []

  const audience = await db.customer.findMany({
    where: {
      ...buildSegmentWhere(Array.isArray(rules) ? rules : []),
      ...consentFilter(campaign.channel),
    },
    select: { id: true, name: true, phone: true, email: true },
  })

  if (audience.length > 0) {
    await db.campaignRecipient.createMany({
      data: audience.map(c => ({
        campaignId: campaign.id,
        customerId: c.id,
        phone: c.phone,
      })),
      skipDuplicates: true,
    })
  }

  await db.campaign.update({
    where: { id: campaign.id },
    data: { status: "SENDING", startedAt: new Date(), lastError: null, pausedAt: null, cancelledAt: null },
  })

  // One slice per request. A campaign of any size finishes across as many
  // runs as it needs, and the cron picks up whatever is left — which is what
  // stops a send of more than a thousand people stalling half way with no
  // way back.
  const result = await runCampaignSlice(campaign.id)

  return NextResponse.json({
    ...result,
    audience: audience.length,
    // Said plainly, because "sent: 1000, remaining: 4200" reads like a
    // failure otherwise.
    message:
      result.remaining > 0
        ? `${result.sent} sent. ${result.remaining} still to go — they continue automatically.`
        : `${result.sent} sent.`,
  })
})
