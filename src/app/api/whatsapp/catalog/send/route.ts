import { withErrors } from "@/lib/api-handler"
import { sendSingleProductMessage, sendMultiProductMessage, getWhatsAppConfig } from "@/lib/whatsapp"
import { NextRequest, NextResponse } from "next/server"
import { currentTenant } from "@/lib/tenant"
import { sessionFromRequest } from "@/lib/auth"

/**
 * Send WhatsApp Interactive Catalog Messages (Single Product / Multi-Product Showcase)
 */
export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const { to, catalogId, type = "multi", productRetailerId, headerText, bodyText, footerText, sections } = body

  if (!to) {
    return NextResponse.json({ error: "Missing 'to' phone number" }, { status: 400 })
  }

  const effectiveCatalogId = catalogId || process.env.META_CATALOG_ID
  if (!effectiveCatalogId) {
    return NextResponse.json({ error: "Missing 'catalogId' parameter or META_CATALOG_ID configuration" }, { status: 400 })
  }

  if (type === "single") {
    if (!productRetailerId) {
      return NextResponse.json({ error: "Missing 'productRetailerId' for single product message" }, { status: 400 })
    }

    const result = await sendSingleProductMessage({
      to,
      catalogId: effectiveCatalogId,
      productRetailerId,
      bodyText,
      footerText,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send Single Product Message" }, { status: 400 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } else {
    // Multi-product message
    const finalHeaderText = headerText || "🛍️ Browse Our Catalog"
    const finalBodyText = bodyText || "Explore our products and order directly on WhatsApp!"
    const finalSections = sections || [
      {
        title: "Featured Items",
        productItems: [{ productRetailerId: productRetailerId || "featured_01" }],
      },
    ]

    const result = await sendMultiProductMessage({
      to,
      catalogId: effectiveCatalogId,
      headerText: finalHeaderText,
      bodyText: finalBodyText,
      footerText,
      sections: finalSections,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send Multi-Product Message" }, { status: 400 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  }
})
