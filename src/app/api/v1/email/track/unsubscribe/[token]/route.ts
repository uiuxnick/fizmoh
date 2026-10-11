import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { decodeTrackingToken } from "@/lib/email-marketing/tracking"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const payload = decodeTrackingToken(token)

  if (!payload || !payload.sId || !payload.tId) {
    return new NextResponse(
      "<html><body style='font-family: sans-serif; text-align: center; padding: 40px;'><h2>Invalid or expired unsubscribe link.</h2></body></html>",
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  try {
    const subscriber = await db.emailSubscriber.findFirst({
      where: { id: payload.sId, tenantId: payload.tId },
    })

    if (subscriber) {
      await db.emailSubscriber.update({
        where: { id: subscriber.id },
        data: {
          status: "UNSUBSCRIBED",
          unsubscribedAt: new Date(),
          unsubscribeReason: "Recipient clicked one-click unsubscribe",
        },
      })

      await db.emailSuppression.upsert({
        where: { tenantId_email: { tenantId: subscriber.tenantId, email: subscriber.email } },
        create: {
          tenantId: subscriber.tenantId,
          email: subscriber.email,
          reason: "UNSUBSCRIBE",
          source: payload.cId || "Direct Unsubscribe",
        },
        update: {
          reason: "UNSUBSCRIBE",
        },
      })

      if (payload.cId) {
        await db.emailCampaign.updateMany({
          where: { id: payload.cId, tenantId: payload.tId },
          data: { unsubCount: { increment: 1 } },
        }).catch(() => {})
      }
    }
  } catch {
    // Suppress error
  }

  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><title>Unsubscribed</title></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 80vh; margin: 0;">
      <div style="background: #ffffff; padding: 36px 32px; border-radius: 12px; max-width: 460px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">You've Been Unsubscribed</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Your email has been removed from this mailing list and you will no longer receive marketing messages from this sender.
        </p>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">Fizmoh Email Marketing Platform</p>
      </div>
    </body>
    </html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}
