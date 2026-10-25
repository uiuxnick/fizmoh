import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { SUPPORT_PHONE, SUPPORT_WELCOME, supportOrigin } from "@/lib/platform-support"

function corsHeaders(origin: string | null = "*") {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const widgetId = searchParams.get("widgetId")
  const tenantSlug = searchParams.get("tenant") || searchParams.get("tenantSlug")

  // Fizmoh's own support belongs to the platform owner, never a fallback tenant.
  if (!widgetId && tenantSlug === "fizmoh-support") {
    return NextResponse.json({
      id: "platform-support", platformSupport: true, enabled: true,
      headerTitle: "Fizmoh Support", agentName: "Fizmoh Support", agentRole: "AI & platform support team",
      headerSubtitle: "AI help · Human support on request", primaryColor: "#059669",
      welcomeMessage: SUPPORT_WELCOME, proactivePrompt: "Need help? Chat or create a support ticket.", proactiveDelay: 5,
      whatsappEnabled: true, whatsappNumber: SUPPORT_PHONE, whatsappMessage: "Hello Fizmoh Support, I need assistance.",
      webChatEnabled: true, requireLeadForm: true, requirePhone: true, enableAiAgent: true,
    }, { headers: { ...corsHeaders(supportOrigin(request.headers.get("origin"))), "Cache-Control": "no-store" } })
  }

  try {
    let widget: any = null
    let tenant: any = null

    if (widgetId) {
      widget = await (db as any).liveChatWidget.findUnique({
        where: { id: widgetId },
        include: { tenant: { select: { id: true, name: true, slug: true, logoUrl: true } } },
      })
      if (widget) {
        tenant = widget.tenant
      }
    } else if (tenantSlug) {
      tenant = await db.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true, name: true, slug: true, logoUrl: true },
      })
      if (tenant) {
        widget = await (db as any).liveChatWidget.findFirst({
          where: { tenantId: tenant.id, enabled: true },
          orderBy: { createdAt: "desc" },
        })
      }
    }

    const origin = request.headers.get("origin")
    if (origin && widget?.allowedDomains && Array.isArray(widget.allowedDomains) && widget.allowedDomains.length > 0) {
      const originHost = origin.replace(/^https?:\/\//i, "").replace(/:\d+$/, "").toLowerCase()
      const isAllowed = widget.allowedDomains.some((d: any) => {
        const clean = String(d).trim().toLowerCase().replace(/^https?:\/\//i, "").replace(/\/.*$/, "")
        return clean && (originHost === clean || originHost.endsWith("." + clean))
      })
      if (!isAllowed) {
        return NextResponse.json(
          { error: "Widget embedding not authorized for this domain" },
          { status: 403, headers: corsHeaders(origin) },
        )
      }
    }

    let tenantWaNumber = ""
    if (tenant?.id) {
      const acc = await db.whatsAppAccount.findFirst({
        where: { tenantId: tenant.id, displayPhone: { not: null } },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: { displayPhone: true },
      })
      if (acc?.displayPhone) {
        tenantWaNumber = acc.displayPhone.replace(/[^0-9+]/g, "")
      }
    }

    const resolvedWaNumber = widget?.whatsappNumber || tenantWaNumber || (tenantSlug === "fizmoh-support" ? SUPPORT_PHONE : "")

    // Default configuration if not found
    const defaultResponse = {
      id: widget?.id || "default",
      tenantId: tenant?.id || "",
      tenantName: tenant?.name || (tenantSlug === "fizmoh-support" ? "Fizmoh Support" : "Customer Support"),
      tenantSlug: tenant?.slug || tenantSlug || "fizmoh-support",
      primaryColor: widget?.primaryColor || "#00E785",
      position: widget?.position || "bottom-right",
      headerTitle: widget?.headerTitle || (tenant?.name ? `${tenant.name} Support` : "Customer Support"),
      headerSubtitle: widget?.headerSubtitle || "Typically replies in under 5 minutes",
      agentName: widget?.agentName || "Customer Support",
      agentRole: widget?.agentRole || "Support Specialist",
      avatarUrl: widget?.avatarUrl || tenant?.logoUrl || "/fizmoh-logo-light.png",
      welcomeMessage: widget?.welcomeMessage || "Hi there! 👋 How can we help you today?",
      proactivePrompt: widget?.proactivePrompt ?? "Need help? Chat with our team!",
      proactiveDelay: widget?.proactiveDelay ?? 5,
      whatsappEnabled: widget?.whatsappEnabled ?? Boolean(resolvedWaNumber),
      whatsappNumber: resolvedWaNumber,
      whatsappMessage: widget?.whatsappMessage || "Hello! I have a question about your services.",
      webChatEnabled: widget?.webChatEnabled ?? true,
      requireLeadForm: widget?.requireLeadForm ?? true,
      requirePhone: widget?.requirePhone ?? false,
      enableAiAgent: widget?.enableAiAgent ?? true,
      enabled: widget?.enabled ?? true,
    }

    return NextResponse.json(defaultResponse, {
      headers: corsHeaders(request.headers.get("origin")),
    })
  } catch (error: any) {
    console.error("Failed to fetch widget config:", error)
    return NextResponse.json(
      { error: "Failed to load widget config" },
      { status: 500, headers: corsHeaders(request.headers.get("origin")) },
    )
  }
}
