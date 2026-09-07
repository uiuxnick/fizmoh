import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

/**
 * A tracked link.
 *
 * The campaign screen has always shown a click count and nothing has ever
 * incremented it — there was no redirect to count at. This is it: the customer
 * lands here, is counted once, and is sent on.
 *
 * Counted once per person on purpose. A number that goes up every time
 * somebody reopens a chat measures curiosity about the chat, not interest in
 * the offer.
 */
export const GET = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ recipientId: string }> }) => {
    const { recipientId } = await params
    const fallback = process.env.NEXT_PUBLIC_BASE_URL || "https://app.fizmoh.cloud"

    const recipient = await db.campaignRecipient.findUnique({
      where: { id: recipientId },
      select: { id: true, campaignId: true, clickedAt: true },
    })
    // An unknown id still lands somewhere sensible. A customer who taps a link
    // should never see an error page because of our bookkeeping.
    if (!recipient) return NextResponse.redirect(fallback, 302)

    const campaign = await db.campaign.findUnique({
      where: { id: recipient.campaignId },
      select: { linkUrl: true },
    })

    if (!recipient.clickedAt) {
      await db.$transaction([
        db.campaignRecipient.update({
          where: { id: recipient.id },
          data: { clickedAt: new Date() },
        }),
        db.campaign.update({
          where: { id: recipient.campaignId },
          data: { totalClicked: { increment: 1 } },
        }),
      ]).catch(() => {})
    }

    return NextResponse.redirect(campaign?.linkUrl || fallback, 302)
  },
)
