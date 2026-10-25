import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.domains.read")
  if (response) return response

  const tenantId = auth!.tenant.tenantId

  const settings = await db.systemSetting.findMany({
    where: {
      tenantId,
      key: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_from", "smtp_from_name"] },
    },
  })

  const config: Record<string, any> = {}
  for (const s of settings) {
    config[s.key] = s.value
  }

  // Also check if password exists without exposing it
  const passRow = await db.systemSetting.findFirst({
    where: { tenantId, key: "smtp_password" },
  })
  config.smtp_password_configured = !!passRow?.value

  return NextResponse.json({ config })
}

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.domains.manage")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const body = await request.json().catch(() => ({}))
  const { host, port, user, password, from, fromName } = body

  if (!host || !from) {
    return NextResponse.json({ error: "Host and From address are required" }, { status: 400 })
  }

  const entries: [string, string][] = [
    ["smtp_host", String(host).trim()],
    ["smtp_port", String(port || 587).trim()],
    ["smtp_user", String(user || "").trim()],
    ["smtp_from", String(from).trim()],
    ["smtp_from_name", String(fromName || "").trim()],
  ]

  if (password) {
    entries.push(["smtp_password", String(password).trim()])
  }

  for (const [key, value] of entries) {
    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId, key } },
      create: { tenantId, key, value, type: "STRING", category: "EMAIL" },
      update: { value, type: "STRING" },
    })
  }

  return NextResponse.json({ success: true, message: "SMTP configuration saved" })
}
