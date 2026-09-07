import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

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
      tenant = await db.tenant.findFirst({
        where: {
          OR: [
            { slug: tenantSlug },
            ...(tenantSlug === "fizmoh-support" || tenantSlug === "fizmoh" ? [{ slug: "oman-adventures" }, { name: { contains: "Fizmoh", mode: "insensitive" as const } }] : []),
          ],
        },
        select: { id: true, name: true, slug: true, logoUrl: true },
      })
      if (tenant) {
        widget = await (db as any).liveChatWidget.findFirst({
          where: { tenantId: tenant.id, enabled: true },
          orderBy: { createdAt: "asc" },
        })
      }
    } else {
      // Return the default active widget (preferring Fizmoh Support)
      tenant = await db.tenant.findFirst({
        where: { OR: [{ name: { contains: "Fizmoh", mode: "insensitive" as const } }, { slug: "oman-adventures" }] },
        select: { id: true, name: true, slug: true, logoUrl: true },
      })
      if (!tenant) {
        tenant = await db.tenant.findFirst({
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, slug: true, logoUrl: true },
        })
      }
      if (tenant) {
        widget = await (db as any).liveChatWidget.findFirst({
          where: { tenantId: tenant.id, enabled: true },
          orderBy: { createdAt: "asc" },
        })
      }
    }

    // Default configuration if not found
    const defaultResponse = {
      id: widget?.id || "default",
      tenantId: tenant?.id || "",
      tenantName: tenant?.name || "Fizmoh Support",
      tenantSlug: tenant?.slug || "fizmoh-support",
      primaryColor: widget?.primaryColor || "#00E785",
      position: widget?.position || "bottom-right",
      headerTitle: widget?.headerTitle || "Fizmoh Support",
      headerSubtitle: widget?.headerSubtitle || "Typically replies in under 5 minutes",
      agentName: widget?.agentName || "Fizmoh Support",
      agentRole: widget?.agentRole || "Support & Growth Specialist",
      avatarUrl: widget?.avatarUrl || tenant?.logoUrl || "/fizmoh-logo-light.png",
      welcomeMessage: widget?.welcomeMessage || "Hi there! 👋 Welcome to Fizmoh Support. How can we help you with WhatsApp Business, Automation, or APIs today?",
      proactivePrompt: widget?.proactivePrompt ?? "Need help? Chat with Fizmoh Support!",
      proactiveDelay: widget?.proactiveDelay ?? 5,
      whatsappEnabled: widget?.whatsappEnabled ?? true,
      whatsappNumber: widget?.whatsappNumber || process.env.WHATSAPP_PHONE_NUMBER || "+96890000000",
      whatsappMessage: widget?.whatsappMessage || "Hello Fizmoh Support! I have a question about your WhatsApp platform & pricing.",
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
