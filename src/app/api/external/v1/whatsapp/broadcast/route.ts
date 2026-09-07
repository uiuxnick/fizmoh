import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { validateApiKey } from "@/lib/api-keys"
import { withTenant } from "@/lib/tenant-context"
import { sendTemplateMessage } from "@/lib/whatsapp"

export const POST = withErrors(async (request: NextRequest) => {
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || !body.templateName) {
    return NextResponse.json({ error: "'templateName' is required" }, { status: 400 })
  }

  const recipients = Array.isArray(body.recipients) ? body.recipients : []
  if (recipients.length === 0) {
    return NextResponse.json({ error: "'recipients' array is required with at least one recipient" }, { status: 400 })
  }

  if (recipients.length > 500) {
    return NextResponse.json({ error: "Maximum 500 recipients allowed per broadcast API request" }, { status: 400 })
  }

  const results: { phone: string; success: boolean; messageId?: string; error?: string }[] = []

  await withTenant({ tenantId: keyInfo.tenantId, slug: "" }, async () => {
    for (const recipient of recipients) {
      const phone = typeof recipient === "string" ? recipient : recipient.phone
      const variables = typeof recipient === "object" && Array.isArray(recipient.variables)
        ? recipient.variables
        : (body.defaultVariables || [])

      if (!phone) continue

      const res = await sendTemplateMessage({
        to: phone,
        templateName: body.templateName,
        language: body.language || "en_US",
        variables,
        headerImageUrl: recipient.headerImageUrl || body.headerImageUrl,
        buttonUrl: recipient.buttonUrl || body.buttonUrl,
      })

      results.push({
        phone,
        success: res.success,
        messageId: res.messageId,
        error: res.error,
      })
    }
  })

  const successfulCount = results.filter(r => r.success).length

  return NextResponse.json({
    success: true,
    total: results.length,
    sent: successfulCount,
    failed: results.length - successfulCount,
    results,
  })
})
