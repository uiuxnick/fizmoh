import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import { sendWhatsApp, sendEmail } from "@/lib/notifications"
import { parseCards } from "@/lib/carousel"
import { placeholderCount, resolveVariables } from "@/lib/campaign-send"
import { z } from "zod"

/**
 * One copy, to yourself, before it goes to everybody.
 *
 * The single most useful thing missing from broadcasting: there was no way to
 * see what a campaign actually looked like without sending it to the whole
 * list, and a template that renders wrong renders wrong for all of them.
 *
 * It sends the real message through the real path — same variables, same
 * media, same carousel — because a preview that takes a different route
 * proves nothing about the one that matters.
 */

const schema = z.object({
  to: z.string().trim().min(5).max(254),
})

export const POST = withErrors(withModule("BROADCAST", 
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const session = await sessionFromRequest(request)
    if (session?.kind !== "staff") {
      return NextResponse.json({ error: "Sign in first" }, { status: 401 })
    }

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a number or an email address" }, { status: 400 })
    }

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: { template: true },
    })
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

    // Stands in for a recipient, so the test shows what a real one would see
    // rather than a row of empty placeholders.
    const sample = {
      name: session.email?.split("@")[0] || "there",
      phone: parsed.data.to,
      email: parsed.data.to,
      loyaltyTier: "GOLD",
    }

    if (campaign.channel === "EMAIL") {
      const result = await sendEmail({
        to: parsed.data.to,
        subject: `[Test] ${campaign.subject || campaign.name}`,
        html: campaign.customContent || campaign.template?.bodyContent || "",
      })
      return NextResponse.json(
        { ok: result.success, error: result.error },
        { status: result.success ? 200 : 502 },
      )
    }

    if (campaign.channel === "FACEBOOK" || campaign.channel === "INSTAGRAM") {
      const { decryptSecret } = await import("@/lib/secret-box")
      const { messengerAdapter } = await import("@/lib/social/messenger-adapter")
      const { instagramAdapter } = await import("@/lib/social/instagram-adapter")
      const { resolveSocialText } = await import("@/lib/campaign-send")

      const socialAccount = await db.socialAccount.findFirst({
        where: {
          ...(campaign.tenantId ? { tenantId: campaign.tenantId } : {}),
          channel: campaign.channel,
          isActive: true,
          status: "CONNECTED",
        },
      })
      if (!socialAccount) {
        return NextResponse.json(
          { error: `No active connected ${campaign.channel === "FACEBOOK" ? "Facebook Page" : "Instagram account"} found` },
          { status: 400 },
        )
      }
      const adapter = campaign.channel === "FACEBOOK" ? messengerAdapter : instagramAdapter
      const token = decryptSecret(socialAccount.accessToken)
      const text = resolveSocialText(
        campaign.customContent || campaign.template?.bodyContent || "",
        sample,
      )

      let recipientId = parsed.data.to.trim()
      if (campaign.channel === "INSTAGRAM") {
        const clean = recipientId.replace(/^@/, "").toLowerCase()
        const customer = await db.customer.findFirst({
          where: {
            channel: "INSTAGRAM",
            OR: [
              { socialId: recipientId },
              { socialUsername: { equals: clean, mode: "insensitive" } },
              { name: { contains: clean, mode: "insensitive" } },
              { phone: recipientId },
            ],
          },
        })
        if (customer?.socialId) {
          recipientId = customer.socialId
        }
      } else if (campaign.channel === "FACEBOOK") {
        const clean = recipientId.replace(/^@/, "").toLowerCase()
        const customer = await db.customer.findFirst({
          where: {
            channel: "FACEBOOK",
            OR: [
              { socialId: recipientId },
              { name: { contains: clean, mode: "insensitive" } },
              { phone: recipientId },
            ],
          },
        })
        if (customer?.socialId) {
          recipientId = customer.socialId
        }
      }

      let result: any
      if (campaign.headerMediaUrl) {
        const mediaType = (campaign.headerMediaType as any) || "IMAGE"
        result = await adapter.sendAttachment(token, recipientId, campaign.headerMediaUrl, mediaType)
        if (result.ok && text) {
          result = await adapter.sendText(token, recipientId, text)
        }
      } else {
        result = await adapter.sendText(token, recipientId, text)
      }

      return NextResponse.json(
        { ok: result.ok, error: result.metaRestriction || result.error, messageId: result.externalMessageId },
        { status: result.ok ? 200 : 502 },
      )
    }

    if (!campaign.template) {
      return NextResponse.json(
        { error: "A WhatsApp campaign needs an approved template" },
        { status: 400 },
      )
    }

    const cards = parseCards(campaign.template.cards)
    const result = await sendWhatsApp({
      to: parsed.data.to,
      templateName: campaign.template.name,
      language: campaign.template.language || "en_US",
      templateVariables: resolveVariables(
        campaign.variableMap,
        sample,
        placeholderCount(campaign.template.bodyContent || ""),
      ),
      imageUrl: campaign.headerMediaType === "IMAGE" ? campaign.headerMediaUrl || undefined : undefined,
      videoUrl: campaign.headerMediaType === "VIDEO" ? campaign.headerMediaUrl || undefined : undefined,
      documentUrl: campaign.headerMediaType === "DOCUMENT" ? campaign.headerMediaUrl || undefined : undefined,
      cards: cards.length
        ? cards.map(card => ({
            imageUrl: card.imageUrl,
            variables: resolveVariables(campaign.variableMap, sample, placeholderCount(card.body)),
          }))
        : undefined,
    })

    return NextResponse.json(
      { ok: result.success, error: result.error, messageId: result.messageId },
      { status: result.success ? 200 : 502 },
    )
  },
)
)
