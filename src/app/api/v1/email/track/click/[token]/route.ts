import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { decodeTrackingToken } from "@/lib/email-marketing/tracking"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const payload = decodeTrackingToken(token)

  if (!payload || !payload.url) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Open-redirect protection: verify URL scheme is http or https
  let destination = payload.url
  try {
    const parsed = new URL(destination)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      destination = "/"
    }
  } catch {
    destination = "/"
  }

  if (payload.rId && payload.tId) {
    try {
      const updatedRecipient = await db.emailCampaignRecipient.updateMany({
        where: { id: payload.rId, tenantId: payload.tId },
        data: {
          clickedAt: new Date(),
        },
      })

      if (updatedRecipient.count > 0) {
        if (payload.cId) {
          await db.emailCampaign.updateMany({
            where: { id: payload.cId, tenantId: payload.tId },
            data: {
              clickCount: { increment: 1 },
              uniqueClickCount: { increment: 1 },
            },
          })
        }

        await db.emailEvent.create({
          data: {
            tenantId: payload.tId,
            recipientId: payload.rId,
            eventType: "CLICK",
            linkUrl: payload.url,
            userAgent: request.headers.get("user-agent") || null,
          },
        })
      }
    } catch {
      // Continue redirect
    }
  }

  return NextResponse.redirect(new URL(destination, request.url))
}
