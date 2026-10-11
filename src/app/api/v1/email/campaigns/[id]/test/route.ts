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
  const body = await request.json().catch(() => ({}))
  const testRecipient = body.recipientEmail || body.email

  if (!testRecipient || !testRecipient.includes("@")) {
    return NextResponse.json({ error: "Valid test recipient email is required" }, { status: 400 })
  }

  const campaign = await db.emailCampaign.findUnique({
    where: { id },
  })

  if (!campaign || campaign.tenantId !== tenantId) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const html = campaign.htmlContent || `<div style="font-family: sans-serif; padding: 20px;"><h2>${campaign.subject}</h2><p>This is a test preview from Fizmoh Email Marketing.</p></div>`

  const provider = getEmailProvider("SMTP")
  const result = await withTenant(auth!.tenant, () =>
    provider.send({
      to: testRecipient,
      fromName: campaign.senderName,
      fromEmail: campaign.senderEmail,
      replyTo: campaign.replyTo || undefined,
      subject: `[TEST] ${campaign.subject}`,
      html,
      text: campaign.plainText || undefined,
    }),
  )

  if (!result.success) {
    return NextResponse.json(
      { error: `Test email failed to send: ${result.error || "Provider error"}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
    recipient: testRecipient,
  })
}
