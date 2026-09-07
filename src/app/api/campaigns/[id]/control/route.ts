import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import { runCampaignSlice, refreshTotals } from "@/lib/campaign-send"
import { z } from "zod"

/**
 * The brake, and the way back.
 *
 * A broadcast reaches thousands of people and cannot be recalled once it has
 * left, which is exactly why the person who started it needs to be able to
 * stop the part that has not. Pause and cancel are read by the send loop
 * before every single recipient, so stopping takes one message, not one batch.
 */

const schema = z.object({
  action: z.enum(["pause", "resume", "cancel", "retry_failed"]),
})

export const POST = withErrors(withModule("BROADCAST", 
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const session = await sessionFromRequest(request)
    if (session?.kind !== "staff") {
      return NextResponse.json({ error: "Sign in first" }, { status: 401 })
    }

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Unknown action" }, { status: 400 })

    const campaign = await db.campaign.findUnique({ where: { id } })
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

    switch (parsed.data.action) {
      case "pause": {
        await db.campaign.update({ where: { id }, data: { pausedAt: new Date() } })
        return NextResponse.json({ ok: true, status: "PAUSED" })
      }

      case "resume": {
        await db.campaign.update({
          where: { id },
          data: { pausedAt: null, status: "SENDING", cancelledAt: null },
        })
        // Picked up immediately rather than at the next cron tick: somebody
        // who just pressed resume is watching the screen.
        const result = await runCampaignSlice(id)
        return NextResponse.json({ ok: true, ...result })
      }

      case "cancel": {
        // Cancelling stops what has not gone. What has already been sent has
        // been sent — nothing here pretends otherwise.
        await db.campaign.update({
          where: { id },
          data: { cancelledAt: new Date(), status: "CANCELLED" },
        })
        const abandoned = await db.campaignRecipient.updateMany({
          where: { campaignId: id, status: "PENDING" },
          data: { status: "SKIPPED", skipReason: "CANCELLED" },
        })
        await refreshTotals(id)
        return NextResponse.json({ ok: true, stopped: abandoned.count })
      }

      case "retry_failed": {
        // A failure is usually the network or a rate limit rather than the
        // person, so the attempt counter is reset with the status.
        const reset = await db.campaignRecipient.updateMany({
          where: { campaignId: id, status: "FAILED" },
          data: { status: "PENDING", attempts: 0, error: null },
        })
        if (reset.count === 0) {
          return NextResponse.json({ ok: true, retried: 0, message: "Nothing failed" })
        }
        await db.campaign.update({
          where: { id },
          data: { status: "SENDING", pausedAt: null, cancelledAt: null, sentAt: null },
        })
        const result = await runCampaignSlice(id)
        return NextResponse.json({ ok: true, retried: reset.count, ...result })
      }
    }
  },
))
