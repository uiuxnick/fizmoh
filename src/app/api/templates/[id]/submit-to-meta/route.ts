import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { parseCards, validateCarousel, carouselComponent } from "@/lib/carousel"
import { getWhatsAppConfig, isWhatsAppConfigured, uploadTemplateMedia } from "@/lib/whatsapp"

/**
 * Sends a template to Meta for approval.
 *
 * Three things here were wrong and each failed in a way that did not say what
 * was wrong:
 *
 *   - A carousel card's example image was sent as a URL. Meta wants a handle
 *     from its upload API and answers a link with "Invalid parameter", which
 *     reads like the whole template is malformed.
 *   - Credentials were read straight from the environment, so a token saved in
 *     the settings screen was ignored and submission failed as unconfigured.
 *   - Every button became its own BUTTONS component. Meta takes one BUTTONS
 *     component holding an array, and rejects the rest.
 */
export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const template = await db.template.findUnique({ where: { id } })

  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 })
  if (template.channel !== "WHATSAPP") {
    return NextResponse.json({ error: "Only WhatsApp templates can be submitted to Meta" }, { status: 400 })
  }

  // Meta is strict about the name and rejects anything else outright.
  const name = template.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 512)
  if (!name) return NextResponse.json({ error: "The template needs a name" }, { status: 400 })

  // A carousel is checked here rather than rejected days later with a message
  // that does not say which card was wrong.
  const cards = parseCards(template.cards)
  const isCarousel = template.type === "CAROUSEL" || cards.length > 0
  if (isCarousel) {
    const problems = validateCarousel(cards)
    if (problems.length > 0) {
      return NextResponse.json({ error: "This carousel cannot be submitted yet", problems }, { status: 400 })
    }
  }

  const config = await getWhatsAppConfig()
  if (!(await isWhatsAppConfigured()) || !config.wabaId) {
    const updated = await db.template.update({ where: { id }, data: { status: "PENDING" } })
    return NextResponse.json({
      template: updated,
      simulation: true,
      message: "Marked as pending — WhatsApp is not configured, so nothing was sent to Meta.",
    })
  }

  // Each distinct image is uploaded once, however many cards use it.
  const handles: Record<string, string> = {}
  if (isCarousel) {
    for (const url of [...new Set(cards.map(card => card.imageUrl))]) {
      const uploaded = await uploadTemplateMedia(url)
      if (!uploaded.success || !uploaded.handle) {
        return NextResponse.json({
          error: "Meta would not accept one of the card images",
          problems: [`${url}: ${uploaded.error}`],
        }, { status: 400 })
      }
      handles[url] = uploaded.handle
    }
  }

  let components: Record<string, unknown>[]

  if (isCarousel) {
    // A carousel takes a body and the cards, and nothing else — no header, no
    // footer of its own. Each card carries its own image and buttons.
    components = [
      { type: "BODY", text: template.bodyContent },
      carouselComponent(cards, handles),
    ]
  } else {
    components = []

    if (template.headerType && template.headerType !== "NONE") {
      if (template.headerType === "TEXT") {
        components.push({ type: "HEADER", format: "TEXT", text: template.headerContent || "" })
      } else if (template.headerContent) {
        // A media header needs an example too, by the same rule as a card.
        const uploaded = await uploadTemplateMedia(template.headerContent)
        if (!uploaded.success || !uploaded.handle) {
          return NextResponse.json({
            error: "Meta would not accept the header image",
            problems: [uploaded.error || "Upload failed"],
          }, { status: 400 })
        }
        components.push({
          type: "HEADER",
          format: template.headerType,
          example: { header_handle: [uploaded.handle] },
        })
      }
    }

    const body: Record<string, unknown> = { type: "BODY", text: template.bodyContent }
    // A template with {{1}} in it must ship a sample value, or Meta rejects it
    // for a missing example rather than for the placeholder.
    const placeholders = (template.bodyContent.match(/\{\{\s*\d+\s*\}\}/g) || []).length
    if (placeholders > 0) {
      body.example = { body_text: [Array.from({ length: placeholders }, (_, i) => `Sample ${i + 1}`)] }
    }
    components.push(body)

    if (template.footerContent) components.push({ type: "FOOTER", text: template.footerContent })

    // One BUTTONS component holding every button — not one component each.
    let buttons: { type: string; text: string; url?: string; phone?: string }[] = []
    try {
      buttons = typeof template.buttons === "string" ? JSON.parse(template.buttons) : []
    } catch { buttons = [] }
    if (Array.isArray(buttons) && buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: buttons.slice(0, 10).map(button => {
          const type = String(button.type || "QUICK_REPLY").toUpperCase()
          if (type === "URL") return { type: "URL", text: button.text, url: button.url }
          if (type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: button.text, phone_number: button.phone }
          return { type: "QUICK_REPLY", text: button.text }
        }),
      })
    }
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${config.wabaId}/message_templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.accessToken}` },
      body: JSON.stringify({
        name,
        language: template.language || "en",
        category: template.category || "MARKETING",
        components,
      }),
    })
    const data = await response.json()

    if (!response.ok) {
      // Meta's useful detail is nested; the top-level message is usually just
      // "Invalid parameter", which tells an operator nothing.
      const detail = data?.error?.error_user_msg
        || data?.error?.error_data?.details
        || data?.error?.message
        || `HTTP ${response.status}`
      const updated = await db.template.update({
        where: { id },
        data: { status: "REJECTED", rejectionReason: String(detail).slice(0, 1000) },
      })
      return NextResponse.json({ error: detail, template: updated }, { status: 400 })
    }

    const updated = await db.template.update({
      where: { id },
      data: { status: data.status === "APPROVED" ? "APPROVED" : "PENDING", metaTemplateId: data.id, rejectionReason: null },
    })
    return NextResponse.json({ template: updated, metaId: data.id, metaStatus: data.status })
  } catch (error) {
    console.error("Meta submission error:", error)
    return NextResponse.json({ error: "Could not reach Meta" }, { status: 502 })
  }
})
