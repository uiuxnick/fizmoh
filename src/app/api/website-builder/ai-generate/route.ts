import { NextRequest, NextResponse } from "next/server"
import { currentTenant } from "@/lib/tenant-context"
import { db } from "@/lib/db"
import { isAIConfigured, anthropicClient } from "@/lib/ai-provider"
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
      mode = "full", // "full" | "edit" | "translate_ar"
      prompt = "",
      businessName = "Premium Brand",
      industry = "ecommerce",
      style = "emerald-luxury",
      language = "en",
      currentElements = [],
    } = body

    let generatedElements: BuilderElement[] = []
    let aiSummary = ""

    // ── Handle Translate to Arabic Mode ──────────────────────────────────────
    if (mode === "translate_ar") {
      generatedElements = await handleTranslateArabic(currentElements, businessName)
      aiSummary = "Website translated to Arabic with RTL alignment."
    }
    // ── Handle In-line Edit / Copilot Mode ────────────────────────────────────
    else if (mode === "edit") {
      generatedElements = await handleCopilotEdit(currentElements, prompt, businessName, style)
      aiSummary = `Applied edits: "${prompt}"`
    }
    // ── Handle Full Site Generation ──────────────────────────────────────────
    else {
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
- "video-embed": { url, height }
- "video-hero": { heading, subtext, videoUrl, videoType, badge, primaryBtnText, secondaryBtnText, overlayOpacity }
- "countdown-sale": { heading, subtext, discountBadge, primaryCta, bgColor, accentColor }
- "testimonials-slider": { heading, subtext, reviews, layout, colsDesktop, colsTablet, colsMobile }
- "faq-accordion": { heading, subtext, items, searchPlaceholder, whatsAppHelpText }

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
    }

    // Auto-save generated draft to tenant DB
    if (generatedElements.length > 0) {
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
    }

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

// ── Handle AI Copilot Natural Language In-line Edits ──────────────────────────
async function handleCopilotEdit(
  elements: BuilderElement[],
  prompt: string,
  businessName: string,
  style: string
): Promise<BuilderElement[]> {
  const pLower = prompt.toLowerCase()

  // 1. Try LLM if configured
  if (await isAIConfigured()) {
    try {
      const client = await anthropicClient()
      if (client) {
        const sysPrompt = `You are an AI website builder assistant. The user wants to modify their existing website elements.
Existing elements: ${JSON.stringify(elements)}
User instruction: "${prompt}"

Return ONLY a JSON object with:
{
  "elements": [ ...modified BuilderElement array... ]
}`
        const resp = await client.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 3500,
          system: sysPrompt,
          messages: [{ role: "user", content: "Apply the edit to the elements JSON." }],
        })
        const txt = (resp.content.find((c: any) => c.type === "text") as any)?.text || ""
        const match = txt.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          if (Array.isArray(parsed.elements) && parsed.elements.length > 0) {
            return parsed.elements
          }
        }
      }
    } catch (e) {
      console.warn("[ai-edit] LLM fallback:", e)
    }
  }

  // 2. Procedural Copilot Rules
  const result = [...elements]

  // Add Countdown Timer / Flash Sale Promo
  if (pLower.includes("countdown") || pLower.includes("sale") || pLower.includes("timer") || pLower.includes("promo") || pLower.includes("discount")) {
    const saleEl: BuilderElement = {
      id: uid(),
      type: "countdown-sale",
      props: {
        heading: `🔥 Flash Sale: 30% OFF All ${businessName} Bookings`,
        subtext: "Limited time promotion! Confirm your reservation on WhatsApp before the countdown hits zero.",
        discountBadge: "EXCLUSIVE DEAL — 30% OFF",
        endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        primaryCta: "Claim 30% Discount on WhatsApp",
        bgColor: "#0d1520",
        accentColor: "#10B981",
      },
    }
    result.splice(1, 0, saleEl)
    return result
  }

  // Add Reviews / Testimonials Slider
  if (pLower.includes("review") || pLower.includes("testimonial") || pLower.includes("rating") || pLower.includes("stars")) {
    const sliderEl: BuilderElement = {
      id: uid(),
      type: "testimonials-slider",
      props: {
        heading: `What Clients Say About ${businessName}`,
        subtext: "Over 10,000+ happy customers across the GCC with 5-star verified satisfaction.",
        layout: "slider",
        reviews: `Ahmed Al-Harthy|Muscat, Oman|5|The service from ${businessName} was unforgettable! Seamless booking via WhatsApp and incredible local guide.|https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&q=80///Sarah Jenkins|Dubai, UAE|5|Fast response, transparent pricing, and wonderful hospitality. 10/10 experience!|https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&q=80///Rashid Al-Balushi|Salalah, Oman|5|Best corporate retreat we've organized in years. The team handled every detail flawlessly.|https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=80///Emily Watson|London, UK|5|Exceptional tour and warm hospitality. Highly recommended!|https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&q=80`,
      },
    }
    result.push(sliderEl)
    return result
  }

  // Add Video Hero
  if (pLower.includes("video") || pLower.includes("video hero") || pLower.includes("youtube")) {
    const videoHeroEl: BuilderElement = {
      id: uid(),
      type: "video-hero",
      props: {
        heading: `Experience the Magic with ${businessName}`,
        subtext: "Handcrafted journeys and premium hospitality designed to create lifelong memories.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        videoType: "youtube",
        badge: "⭐ 2026 Premier Experience",
        primaryBtnText: "Book on WhatsApp",
        secondaryBtnText: "Explore Packages",
        minHeight: "540",
        overlayOpacity: "60",
      },
    }
    result.splice(0, 0, videoHeroEl)
    return result
  }

  // Add FAQ Accordion
  if (pLower.includes("faq") || pLower.includes("question") || pLower.includes("accordion")) {
    const faqEl: BuilderElement = {
      id: uid(),
      type: "faq-accordion",
      props: {
        heading: "Frequently Asked Questions",
        subtext: `Quick answers about booking, cancellations, and custom services with ${businessName}.`,
        searchPlaceholder: "Search questions (e.g. payment, refund, dates)...",
        items: `How do I book and pay?:::You can pay securely online via credit/debit card, bank transfer, or confirm instantly on WhatsApp and pay on arrival.///What is your cancellation policy?:::Free cancellation up to 48 hours before your booking date with a 100% full refund guarantee.///Can we request custom VIP packages?:::Yes! We cater to corporate groups, family retreats, and private VIP itineraries throughout the region.///Are guides bilingual?:::All our certified team members speak fluent English and Arabic.`,
        whatsAppHelpText: "Still have questions? Chat on WhatsApp",
      },
    }
    result.push(faqEl)
    return result
  }

  // Restyle to Luxury Dark
  if (pLower.includes("dark") || pLower.includes("black")) {
    return result.map(el => {
      if (el.type === "hero-banner") return { ...el, props: { ...el.props, bgColor: "#090d16", textColor: "#ffffff" } }
      if (el.type === "navbar") return { ...el, props: { ...el.props, bgColor: "#0f172a" } }
      return el
    })
  }

  // Restyle to Emerald
  if (pLower.includes("emerald") || pLower.includes("green")) {
    return result.map(el => {
      if (el.type === "hero-banner") return { ...el, props: { ...el.props, bgColor: "#064e3b", textColor: "#ffffff" } }
      if (el.type === "button") return { ...el, props: { ...el.props, bgColor: "#10b981" } }
      return el
    })
  }

  return result
}

// ── Handle 1-Click Translation to Arabic (العربية) ──────────────────────────
async function handleTranslateArabic(
  elements: BuilderElement[],
  businessName: string
): Promise<BuilderElement[]> {
  const dictionary: Record<string, string> = {
    "Home": "الرئيسية",
    "Products": "المنتجات",
    "Offers": "العروض",
    "Reviews": "الآراء",
    "Contact": "اتصل بنا",
    "Order on WhatsApp": "اطلب عبر واتساب",
    "Instant WhatsApp": "واتساب مباشر",
    "Book Adventure Now": "احجز مغامرتك الآن",
    "Add to Cart": "أضف إلى السلة",
    "Buy Now": "اشترِ الآن",
    "Trending Expeditions & Tours": "الرحلات والمغامرات الأكثر طلباً",
    "Trending Products": "المنتجات الأكثر رواجاً",
    "Featured Collection": "التشكيلة المميزة",
    "Featured Offerings": "العروض والخدمات المميزة",
    "Complete Your Order": "إتمام الطلب وتأكيد الحجز",
    "Confirm Order via WhatsApp": "تأكيد الطلب عبر واتساب",
    "Why Travelers Choose Oman Adventures": "لماذا يفضل المسافرون رحلاتنا؟",
    "Tailored Private Tour Inquiry": "طلب رحلة خاصة ومخصصة",
    "Send Directly to WhatsApp": "إرسال الطلب عبر واتساب",
    "Send Inquiry to WhatsApp": "إرسال الاستفسار عبر واتساب",
    "Submit Request via WhatsApp": "إرسال الطلب عبر واتساب",
    "Before": "قبل",
    "After": "بعد",
    "Full Name": "الاسم الكامل",
    "WhatsApp Phone Number": "رقم هاتف واتساب",
    "Delivery Address": "عنوان التوصيل أو الموقع",
    "Working Hours": "ساعات العمل",
    "Contact Information": "معلومات الاتصال",
  }

  return elements.map(el => {
    const p = { ...el.props }
    // Translate text properties
    for (const [key, val] of Object.entries(p)) {
      if (typeof val === "string") {
        if (dictionary[val]) {
          p[key] = dictionary[val]
        } else if (val.includes("Order on WhatsApp")) {
          p[key] = val.replace("Order on WhatsApp", "الطلب عبر واتساب")
        } else if (val.includes("Add to Cart")) {
          p[key] = val.replace("Add to Cart", "أضف للسلة")
        }
      }
    }

    // Set heading to Arabic if default
    if (el.type === "hero-banner" && typeof p.heading === "string" && !p.heading.includes("مرحبا")) {
      p.heading = `اكتشف أرقى التجارب مع ${businessName}`
      p.subtext = "حجز مباشر وتأكيد فوري عبر واتساب مع أرقى مستويات الخدمة المعتمدة."
      p.buttonText = "تواصل عبر واتساب الآن"
    }

    if (el.type === "custom-form") {
      p.heading = "استفسار وطلب مخصص"
      p.submitText = "إرسال الاستفسار عبر واتساب"
      p.fields = "الاسم الكامل,رقم واتساب,التاريخ المطلوب,عدد الضيوف,ملاحظات إضافية"
    }

    if (el.type === "cta-multi") {
      p.heading = "هل أنت جاهز لتجربة استثنائية؟"
      p.subtext = "تحدث مباشرة مع فريقنا عبر واتساب أو تصفح كتالوج الخدمات المتكامل."
      p.primaryText = "تواصل عبر واتساب"
      p.secondaryText = "استعراض الكتالوج"
      p.badge = "تأكيد فوري خلال دقيقتين"
    }

    return { ...el, props: p }
  })
}

// ── Procedural AI generator that crafts tailored full-page layouts ────────────
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
        text: "🔥 LIMITED TIME OFFER: GET FREE GCC DELIVERY ON ALL WHATSAPP ORDERS",
        color: "#DC2626",
      },
    },

    // 3. Hero Banner
    {
      id: uid(),
      type: "hero-banner",
      props: {
        heading: `Experience Extraordinary Excellence with ${name}`,
        subtext: `Welcome to the official online destination of ${name}. Handcrafted offerings, instant WhatsApp ordering, and 24/7 dedicated support.`,
        buttonText: "Browse Offerings",
        buttonHref: "#products",
        bgColor: bgHero,
        textColor: "#ffffff",
        minHeight: "520",
        imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
      },
    },

    // 4. Image Carousel Slider
    {
      id: uid(),
      type: "image-carousel",
      props: {
        slides: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80|https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80|https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=1200&q=80",
        height: "440",
      },
    },

    // 5. Logo Marquee Trust
    {
      id: uid(),
      type: "logo-marquee",
      props: {
        logos: "Ministry Verified|GCC Quality Certified|Official Agency|Instant WhatsApp Support|100% Satisfaction Guarantee",
        colsDesktop: "5",
        colsTablet: "3",
        colsMobile: "2",
      },
    },

    // 6. Product Carousel
    {
      id: uid(),
      type: "product-carousel",
      props: {
        heading: "Trending & Featured Picks",
        subtext: "Swipe or scroll through our most sought-after selections",
        colsDesktop: "4",
        colsTablet: "2",
        colsMobile: "1",
      },
    },

    // 7. Product Grid
    {
      id: uid(),
      type: "product-grid",
      props: {
        colsDesktop: "3",
        colsTablet: "2",
        colsMobile: "1",
        columns: "3",
      },
    },

    // 8. Transformation & Proof
    {
      id: uid(),
      type: "before-after",
      props: {
        heading: `Why Customers Switch to ${name}`,
        beforeLabel: "Traditional Alternatives",
        afterLabel: `With ${name}`,
      },
    },

    // 9. Multi-CTA Action Block
    {
      id: uid(),
      type: "cta-multi",
      props: {
        badge: "Instant 2-Minute Confirmation",
        heading: "Ready for an exceptional personalized experience?",
        subtext: "Chat directly with our specialists on WhatsApp for immediate custom requests, or explore our full collection.",
        primaryText: "Order on WhatsApp",
        secondaryText: "Explore Full Catalog",
      },
    },

    // 10. Custom Inquiry Form
    {
      id: uid(),
      type: "custom-form",
      props: {
        heading: "Custom Inquiry & Private Booking",
        submitText: "Send Request via WhatsApp",
        fields: "Full Name,WhatsApp Number,Estimated Travel or Order Date,Number of Guests / Quantity,Special Requests or Notes",
      },
    },

    // 11. Customer Testimonials
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

    // 12. Interactive FAQ Accordion
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

    // 13. Checkout Form
    {
      id: uid(),
      type: "checkout-form",
      props: {
        heading: "Instant Express Checkout",
        submitText: "Confirm Order via WhatsApp",
        currency: currency,
      },
    },

    // 14. Contact Information & WhatsApp CTA
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
