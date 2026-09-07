import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async () => {
  const tenantCtx = currentTenant()
  if (!tenantCtx?.tenantId) {
    return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  }

  const tenantId = tenantCtx.tenantId

  let widget = await (db as any).liveChatWidget.findFirst({
    where: { tenantId },
  })

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, logoUrl: true },
  })

  if (!widget) {
    widget = await (db as any).liveChatWidget.create({
      data: {
        tenantId,
        name: `${tenant?.name || "Website"} Chat Widget`,
        enabled: true,
        primaryColor: "#00E785",
        position: "bottom-right",
        headerTitle: tenant?.name || "Customer Support",
        headerSubtitle: "Typically replies in under 5 minutes",
        agentName: "Sarah - Support Team",
        agentRole: "Support Specialist",
        avatarUrl: tenant?.logoUrl || null,
        welcomeMessage: "Hi there! 👋 How can we help you today?",
        proactivePrompt: "Need help? Chat with our team!",
        proactiveDelay: 5,
        whatsappEnabled: true,
        whatsappNumber: process.env.WHATSAPP_PHONE_NUMBER || "",
        whatsappMessage: "Hello! I have a question about your services.",
        webChatEnabled: true,
        requireLeadForm: true,
        requirePhone: false,
        enableAiAgent: true,
        enableSmartReplies: true,
      },
    })
  }

  // Count active live chat sessions
  const totalSessions = await db.conversation.count({
    where: { tenantId, channel: "LIVE_CHAT" },
  })

  const openSessions = await db.conversation.count({
    where: { tenantId, channel: "LIVE_CHAT", status: "OPEN" },
  })

  return NextResponse.json({
    widget,
    stats: {
      totalSessions,
      openSessions,
    },
    tenant: {
      id: tenant?.id,
      name: tenant?.name,
      slug: tenant?.slug,
      logoUrl: tenant?.logoUrl,
    },
    embedSnippet: `<script src="https://app.fizmoh.cloud/widget.js" data-widget-id="${widget.id}" async></script>`,
  })
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenantCtx = currentTenant()
  if (!tenantCtx?.tenantId) {
    return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  }

  const tenantId = tenantCtx.tenantId
  const body = await request.json()

  let widget = await (db as any).liveChatWidget.findFirst({
    where: { tenantId },
  })

  const updateData: any = {
    name: body.name !== undefined ? String(body.name) : undefined,
    enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
    primaryColor: body.primaryColor !== undefined ? String(body.primaryColor) : undefined,
    position: body.position !== undefined ? String(body.position) : undefined,
    headerTitle: body.headerTitle !== undefined ? String(body.headerTitle) : undefined,
    headerSubtitle: body.headerSubtitle !== undefined ? String(body.headerSubtitle) : undefined,
    agentName: body.agentName !== undefined ? String(body.agentName) : undefined,
    agentRole: body.agentRole !== undefined ? String(body.agentRole) : undefined,
    avatarUrl: body.avatarUrl !== undefined ? (body.avatarUrl ? String(body.avatarUrl) : null) : undefined,
    welcomeMessage: body.welcomeMessage !== undefined ? String(body.welcomeMessage) : undefined,
    proactivePrompt: body.proactivePrompt !== undefined ? (body.proactivePrompt ? String(body.proactivePrompt) : null) : undefined,
    proactiveDelay: body.proactiveDelay !== undefined ? Number(body.proactiveDelay) : undefined,
    whatsappEnabled: body.whatsappEnabled !== undefined ? Boolean(body.whatsappEnabled) : undefined,
    whatsappNumber: body.whatsappNumber !== undefined ? (body.whatsappNumber ? String(body.whatsappNumber) : null) : undefined,
    whatsappMessage: body.whatsappMessage !== undefined ? String(body.whatsappMessage) : undefined,
    webChatEnabled: body.webChatEnabled !== undefined ? Boolean(body.webChatEnabled) : undefined,
    requireLeadForm: body.requireLeadForm !== undefined ? Boolean(body.requireLeadForm) : undefined,
    requirePhone: body.requirePhone !== undefined ? Boolean(body.requirePhone) : undefined,
    enableAiAgent: body.enableAiAgent !== undefined ? Boolean(body.enableAiAgent) : undefined,
    enableSmartReplies: body.enableSmartReplies !== undefined ? Boolean(body.enableSmartReplies) : undefined,
    allowedDomains: Array.isArray(body.allowedDomains) ? body.allowedDomains : undefined,
  }

  // Remove undefined keys
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key])

  if (widget) {
    widget = await (db as any).liveChatWidget.update({
      where: { id: widget.id },
      data: updateData,
    })
  } else {
    widget = await (db as any).liveChatWidget.create({
      data: {
        tenantId,
        ...updateData,
      },
    })
  }

  return NextResponse.json({
    widget,
    embedSnippet: `<script src="https://app.fizmoh.cloud/widget.js" data-widget-id="${widget.id}" async></script>`,
  })
})
