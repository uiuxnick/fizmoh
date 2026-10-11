import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { decodeTrackingToken } from "@/lib/email-marketing/tracking"

// 1x1 transparent GIF buffer
const TRANSPARENT_GIF_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const payload = decodeTrackingToken(token)

  if (payload && payload.rId && payload.tId) {
    try {
      const updatedRecipient = await db.emailCampaignRecipient.updateMany({
        where: { id: payload.rId, tenantId: payload.tId },
        data: {
          openedAt: new Date(),
          status: "DELIVERED",
        },
      })

      if (updatedRecipient.count > 0) {
        if (payload.cId) {
          await db.emailCampaign.updateMany({
            where: { id: payload.cId, tenantId: payload.tId },
            data: {
              openCount: { increment: 1 },
              uniqueOpenCount: { increment: 1 },
            },
          })
        }

        await db.emailEvent.create({
          data: {
            tenantId: payload.tId,
            recipientId: payload.rId,
            eventType: "OPEN",
            ipHash: null,
            userAgent: request.headers.get("user-agent") || null,
          },
        })
      }
    } catch {
      // Do not block tracking pixel display
    }
  }

  return new NextResponse(TRANSPARENT_GIF_PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  })
}
