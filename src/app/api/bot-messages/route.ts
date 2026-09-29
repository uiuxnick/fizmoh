import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"
import { BOT_MESSAGES, loadBotMessages, saveBotMessages, type BotMessageOverrides } from "@/lib/bot-messages"
import { getConfigValue } from "@/lib/app-config"

/** The catalogue plus this workspace's overrides, for the editor. */
export const GET = withErrors(async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })

  const hardcodedOn = (await getConfigValue("hardcoded_flows_enabled").catch(() => "")).trim().toLowerCase()
  const isHardcodedFlowsEnabled = hardcodedOn === "true" || hardcodedOn === "1" || hardcodedOn === "on"
  if (!isHardcodedFlowsEnabled) {
    return NextResponse.json({ messages: [], enabled: false })
  }

  const overrides = await loadBotMessages()
  return NextResponse.json({
    enabled: true,
    messages: BOT_MESSAGES.map(m => ({
      key: m.key,
      group: m.group,
      label: m.label,
      vars: m.vars ?? [],
      defaultEn: m.en,
      defaultAr: m.ar,
      en: overrides[m.key]?.en ?? "",
      ar: overrides[m.key]?.ar ?? "",
    })),
  })
})

export const PUT = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  // Same bar as the rest of the workspace's settings.
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can edit the bot's messages" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body.messages !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  await saveBotMessages(body.messages as BotMessageOverrides)
  return NextResponse.json({ success: true })
})
