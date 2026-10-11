import { NextRequest, NextResponse } from "next/server"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"
import { sendEmail } from "@/lib/notifications"
import { withTenant } from "@/lib/tenant-context"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.domains.manage")
  if (response) return response

  const body = await request.json().catch(() => ({}))
  const { testEmail } = body

  if (!testEmail || !testEmail.includes("@")) {
    return NextResponse.json({ error: "Please provide a valid recipient email address" }, { status: 400 })
  }

  const result = await withTenant(auth!.tenant, () =>
    sendEmail({
      to: testEmail,
      subject: "Fizmoh Email Marketing — SMTP Connection Test",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e7e5e4; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #059669; margin-top: 0;">SMTP Test Successful!</h2>
          <p style="color: #44403c; line-height: 1.6;">
            Your custom outgoing SMTP mail server has been verified and successfully delivered this message from <strong>${auth?.tenant.slug || "Fizmoh"}</strong>.
          </p>
          <div style="background: #f5f5f4; border-radius: 8px; padding: 12px; margin: 20px 0; font-size: 13px; color: #57534e;">
            <div><strong>Timestamp:</strong> ${new Date().toUTCString()}</div>
            <div><strong>Recipient:</strong> ${testEmail}</div>
            <div><strong>Status:</strong> Handshake & Authenticated</div>
          </div>
          <p style="font-size: 12px; color: #78716c; margin-bottom: 0;">
            Sent automatically via Fizmoh Email Marketing system test engine.
          </p>
        </div>
      `,
      text: "Your SMTP server is configured and working with Fizmoh Email Marketing.",
    }),
  )

  if (!result.success) {
    return NextResponse.json({
      success: false,
      error: result.error || "SMTP test failed. Please check your credentials, port, and firewall.",
    }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
    message: `Test email successfully dispatched to ${testEmail}!`,
  })
}
