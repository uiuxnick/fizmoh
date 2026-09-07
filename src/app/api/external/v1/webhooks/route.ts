import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { validateApiKey } from "@/lib/api-keys"
import { withTenant } from "@/lib/tenant-context"
import { db, raw } from "@/lib/db"
import crypto from "crypto"

export const GET = withErrors(async (request: NextRequest) => {
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const settings = await raw.systemSetting.findMany({
    where: {
      tenantId: keyInfo.tenantId,
      key: { startsWith: "dev_webhook_" },
    },
  })

  const webhooks = settings.map(s => {
    try {
      const parsed = JSON.parse(s.value)
      return { id: s.key.replace("dev_webhook_", ""), ...parsed }
    } catch {
      return null
    }
  }).filter(Boolean)

  return NextResponse.json({ success: true, webhooks })
})

export const POST = withErrors(async (request: NextRequest) => {
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const url = body?.url?.trim()
  const events = Array.isArray(body?.events) ? body.events : ["message.received", "order.paid"]

  if (!url || !/^https:\/\//i.test(url)) {
    return NextResponse.json({ error: "A valid HTTPS 'url' is required" }, { status: 400 })
  }

  const id = crypto.randomBytes(8).toString("hex")
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`

  const webhookData = {
    url,
    events,
    secret,
    isActive: true,
    createdAt: new Date().toISOString(),
  }

  await raw.systemSetting.upsert({
    where: { tenantId_key: { tenantId: keyInfo.tenantId, key: `dev_webhook_${id}` } },
    update: { value: JSON.stringify(webhookData) },
    create: { tenantId: keyInfo.tenantId, key: `dev_webhook_${id}`, value: JSON.stringify(webhookData) },
  })

  return NextResponse.json({
    success: true,
    webhook: {
      id,
      url,
      events,
      secret,
      isActive: true,
      createdAt: webhookData.createdAt,
    },
  })
})

export const DELETE = withErrors(async (request: NextRequest) => {
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const keyInfo = await validateApiKey(apiKeyHeader)
  if (!keyInfo) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing API key" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "'id' query parameter is required" }, { status: 400 })
  }

  await raw.systemSetting.deleteMany({
    where: {
      tenantId: keyInfo.tenantId,
      key: `dev_webhook_${id}`,
    },
  })

  return NextResponse.json({ success: true, message: "Webhook subscription deleted" })
})
