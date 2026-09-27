import { NextRequest, NextResponse } from "next/server"
import { currentTenant } from "@/lib/tenant-context"
import { db } from "@/lib/db"
import { isAIConfigured, anthropicClient, openaiClient } from "@/lib/ai-provider"
import { type BuilderElement } from "@/components/views/website-builder-view"

export const dynamic = "force-dynamic"

const SETTING_KEY = "website_builder_json"

// Helper unique ID
const uid = () => Math.random().toString(36).slice(2, 9)

export async function POST(req: NextRequest) {
  try {
    const ctx = currentTenant()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const {
      prompt = "",
      businessName = "Premium Brand",
      industry = "ecommerce",
      style = "emerald-luxury",
      language = "en",
    } = body

    let generatedElements: BuilderElement[] = []
    let aiSummary = ""

    // Check if external LLM provider is available
    if (await isAIConfigured()) {
      try {
        const sysPrompt = `You are a world-class website architect and UI designer. 
Generate a high-converting website structure as a JSON array of BuilderElement objects for the user's business.
Supported element types:
- "navbar": { logo, links, ctaText, ctaHref, bgColor }
- "hero-banner": { heading, subtext, buttonText, bgColor, textColor, minHeight, imageUrl }
- "image-carousel": { slides: string, autoPlay: boolean, height: string }
- "promo-badge": { text, color }
- "product-carousel": { colsDesktop, colsTablet, colsMobile, heading, category }
- "product-grid": { columns, colsDesktop, colsTablet, colsMobile, category }
- "feature-box": { icon, heading, text }
- "two-column": { gap, ratio }
- "cta-multi": { heading, subtext, primaryText, secondaryText, badge }
- "cta-banner": { heading, subtext, buttonText, bgColor }
- "testimonial": { quote, author, role, rating }
- "rating-stars": { rating, count, label }
- "trust-badges": { items }
- "accordion": { question, answer }
- "pricing-table": { heading, plan1, price1, plan2, price2, plan3, price3, currency }
- "checkout-form": { heading, submitText, currency }
- "contact-info": { phone, email, address }
- "whatsapp-cta": { text, phone, message }
- "business-hours": { hours }
- "map-embed": { label, height }
- "custom-form": { heading, submitText, fields }

Return ONLY valid JSON matching this schema:
{
  "summary": "1-sentence summary of what was designed",
  "elements": [
    { "id": "unique_string", "type": "element_type", "props": { ... } }
  ]
}`

        const userMsg = `Business Name: ${businessName}
Industry: ${industry}
Style/Color Theme: ${style}
Language: ${language}
Prompt & Requirements: ${prompt || `Build a full modern high-converting website for ${businessName}`}`

        const client = await anthropicClient()
        if (client) {
          const resp = await client.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 3500,
            system: sysPrompt,
            messages: [{ role: "user", content: userMsg }],
          })
          const txt = (resp.content.find((c: any) => c.type === "text") as any)?.text || ""
          const jsonMatch = txt.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            if (Array.isArray(parsed.elements) && parsed.elements.length > 0) {
              generatedElements = parsed.elements.map((el: any) => ({
                id: el.id || uid(),
                type: el.type,
                props: el.props || {},
              }))
              aiSummary = parsed.summary || `AI Generated website for ${businessName}`
            }
          }
        }
      } catch (llmErr) {
        console.warn("[ai-generate] LLM generation fallback triggered:", llmErr)
      }
    }

    // Procedural Fallback Generator (high quality, tailored to industry & theme)
    if (generatedElements.length === 0) {
      generatedElements = buildProceduralSite(businessName, industry, style, prompt)
      aiSummary = `Custom ${industry.toUpperCase()} website tailored for ${businessName}`
    }

    // Auto-save generated draft to tenant DB
    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId: ctx.tenantId, key: SETTING_KEY } },
      create: {
        tenantId: ctx.tenantId,
        key: SETTING_KEY,
        value: JSON.stringify(generatedElements),
        type: "JSON",
        category: "GENERAL",
      },
      update: { value: JSON.stringify(generatedElements) },
    })

    return NextResponse.json({
      ok: true,
      summary: aiSummary,
      elements: generatedElements,
    })
  } catch (err: any) {
    console.error("[ai-generate] error:", err)
    return NextResponse.json({ error: err?.message || "Generation failed" }, { status: 500 })
  }
}

// Procedural AI generator that crafts tailored full-page layouts
function buildProceduralSite(
  name: string,
  industry: string,
  style: string,
  prompt: string
): BuilderElement[] {
  const isDark = style === "modern-dark"
  const isRoyal = style === "royal-indigo"
  const isSunset = style === "warm-sunset"
  
  const bgHero = isDark ? "#090d16" : isRoyal ? "#1e1b4b" : isSunset ? "#451a03" : "#064e3b"
  const accentColor = isDark ? "#38bdf8" : isRoyal ? "#818cf8" : isSunset ? "#f97316" : "#10b981"
  const currency = "OMR"

  const elements: BuilderElement[] = [
    // 1. Navigation Bar
    {
      id: uid(),
      type: "navbar",
      props: {
        logo: name,
        links: "Home|Products|Offers|Reviews|Contact",
        ctaText: "Order on WhatsApp",
        ctaHref: "#whatsapp",
        bgColor: isDark ? "#0f172a" : "#ffffff",
      },
    },

    // 2. Banner Promo Badge
    {
      id: uid(),
      type: "promo-badge",
      props: {
        text: `🔥 LIMITED TIME OFFER: 20% OFF FOR NEW CUSTOMERS • FREE FAST DELIVERY`,
        color: "#DC2626",
      },
    },

    // 3. Hero Banner
    {
      id: uid(),
      type: "hero-banner",
      props: {
        heading: `Experience the Finest with ${name}`,
        subtext: `Welcome to ${name}. We craft premium quality offerings designed to exceed your expectations with instant WhatsApp ordering and 24/7 dedicated support.`,
        buttonText: "Browse Collection",
        bgColor: bgHero,
        textColor: "#ffffff",
        minHeight: 480,
        imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
      },
    },

    // 4. Product Carousel with Per-Device Row Controls
    {
      id: uid(),
      type: "product-carousel",
      props: {
        heading: "Featured Highlights",
        subtext: "Explore our most sought-after selections",
        colsDesktop: "4",
        colsTablet: "2",
        colsMobile: "1",
        autoPlay: true,
        category: "bestsellers",
      },
    },

    // 5. Trust Badges
    {
      id: uid(),
      type: "trust-badges",
      props: {
        items: "100% Quality Guaranteed|Instant WhatsApp Confirmation|Flexible Payment Options|5-Star Rated Service",
      },
    },

    // 6. Product Grid (Customizable Columns per device)
    {
      id: uid(),
      type: "product-grid",
      props: {
        columns: "3",
        colsDesktop: "3",
        colsTablet: "2",
        colsMobile: "1",
        showFilter: true,
        category: "",
      },
    },

    // 7. Multi-CTA Section
    {
      id: uid(),
      type: "cta-multi",
      props: {
        heading: "Ready to Place Your Order or Have Questions?",
        subtext: "Our dedicated team responds in less than 2 minutes on WhatsApp.",
        primaryText: "Chat on WhatsApp Now",
        secondaryText: "View Complete Catalog",
        badge: "Fastest Response Time in Oman",
      },
    },

    // 8. Feature Boxes (Value Props)
    {
      id: uid(),
      type: "feature-box",
      props: {
        icon: "✨",
        heading: "Premium Grade Excellence",
        text: "Every item and service is inspected and delivered with meticulous attention to detail.",
      },
    },
    {
      id: uid(),
      type: "feature-box",
      props: {
        icon: "⚡",
        heading: "Zero Delay Booking",
        text: "Direct confirmation right to your WhatsApp with digital tickets and receipts.",
      },
    },

    // 9. Customer Testimonials
    {
      id: uid(),
      type: "testimonial",
      props: {
        quote: `Dealing with ${name} was an absolute breeze. Outstanding quality, fast replies on WhatsApp, and genuine care for customers!`,
        author: "Tariq Al-Mamari",
        role: "Verified Client",
        rating: "5",
      },
    },

    // 10. Interactive FAQ Accordion
    {
      id: uid(),
      type: "accordion",
      props: {
        question: `How do I place an order or book with ${name}?`,
        answer: "Simply browse our collection above, click 'Add to Cart' or 'Confirm on WhatsApp', and our team will immediately finalize your request with instant confirmation.",
      },
    },
    {
      id: uid(),
      type: "accordion",
      props: {
        question: "What payment methods are supported?",
        answer: `We support Cash on Delivery, Bank Transfer, Card Payment via AmwalPay, and instant payment links directly in WhatsApp in ${currency}.`,
      },
    },

    // 11. Checkout Form
    {
      id: uid(),
      type: "checkout-form",
      props: {
        heading: "Instant Express Checkout",
        submitText: "Confirm Order via WhatsApp",
        currency: currency,
      },
    },

    // 12. Contact Information & WhatsApp CTA
    {
      id: uid(),
      type: "contact-info",
      props: {
        phone: "+968 9123 4567",
        email: `hello@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        address: "Muscat, Sultanate of Oman",
      },
    },
    {
      id: uid(),
      type: "whatsapp-cta",
      props: {
        text: `Message ${name} Directly on WhatsApp`,
        phone: "+968 9123 4567",
        message: `Hello ${name}! I would like to inquire about your products.`,
      },
    },
  ]

  return elements
}
