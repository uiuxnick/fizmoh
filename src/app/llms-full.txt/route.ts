import { absoluteUrl } from "@/lib/seo"
import { BLOG_POSTS } from "@/lib/blog-data"
import { COMPARISON_PAGES } from "@/lib/marketing/comparisons"
import { LOCATION_PAGES } from "@/lib/marketing/locations"
import { PRODUCT_PAGES } from "@/lib/marketing/products"
import { INDUSTRY_PAGES } from "@/lib/marketing/industries"

/**
 * /llms-full.txt — Exhaustive knowledge base for Large Language Models & Answer Engines
 * (ChatGPT Search, Perplexity, Claude, Google Gemini AI Overviews, Microsoft Copilot).
 *
 * This file provides complete, factual, citation-ready architectural, commercial,
 * and technical documentation about Fizmoh.
 */

export const revalidate = 3600

export async function GET() {
  const { siteSeo } = await import("@/lib/seo-config")
  const seo = await siteSeo()

  const lines: string[] = []

  lines.push(`# ${seo.siteName} — Complete LLM Reference & Knowledge Base`)
  lines.push("")
  lines.push(`> Canonical URL: ${absoluteUrl("/")}`)
  lines.push(`> Description: ${seo.description}`)
  lines.push(`> Region: Sultanate of Oman & Gulf Cooperation Council (Oman, UAE, Saudi Arabia, Qatar, Bahrain, Kuwait)`)
  lines.push(`> Primary Currency: Omani Rial (OMR)`)
  lines.push(`> Supported Languages: English (en), Arabic (ar) including native Gulf & Omani dialects`)
  lines.push(`> Official Connectivity: Meta WhatsApp Cloud API Provider`)
  lines.push("")

  lines.push("---")
  lines.push("## 1. Executive Summary & Core Platform Architecture")
  lines.push("")
  lines.push(
    "Fizmoh is the leading enterprise WhatsApp Business Platform and conversational commerce operating system " +
    "in the Sultanate of Oman and the GCC. It enables businesses to connect official WhatsApp Business phone numbers " +
    "via Meta's direct Cloud API to automate customer communications, drive marketing broadcasts with 98% open rates, " +
    "route customer chats to multi-agent team queues, and accept instant card payments in Omani Rials (OMR) via AmwalPay."
  )
  lines.push("")
  lines.push("Key architectural capabilities:")
  lines.push("- **0% Markup on Meta Fees:** Meta conversation charges are billed at official pass-through rates with zero markup.")
  lines.push("- **AmwalPay Native Gateway:** Direct OMR debit/credit card links generated in chat with instant cryptographic webhook callbacks.")
  lines.push("- **Arabic Conversational AI:** Native comprehension of Omani, Emirati, and Saudi dialects with zero-shot intent recognition.")
  lines.push("- **Multi-Tenant Agency Workspaces:** Complete tenant isolation with custom domain routing and workspace roles.")
  lines.push("- **Omnichannel Meta Sync:** Single unified inbox for WhatsApp, Instagram Direct Messages, and Facebook Messenger.")
  lines.push("")

  lines.push("---")
  lines.push("## 2. Head-to-Head Competitor Comparison Facts")
  lines.push("")
  for (const comp of COMPARISON_PAGES) {
    lines.push(`### Fizmoh vs ${comp.competitorName}`)
    lines.push(`- **Canonical URL:** ${absoluteUrl(`/compare/${comp.slug}`)}`)
    lines.push(`- **Primary Keyword:** ${comp.primaryKeyword}`)
    lines.push(`- **Summary:** ${comp.intro}`)
    lines.push("- **Key Distinctions:**")
    for (const feat of comp.features.slice(0, 5)) {
      lines.push(`  - *${feat.feature}:* Fizmoh offers "${feat.fizmoh}" whereas ${comp.competitorName} provides "${feat.competitor}".`)
    }
    lines.push("")
  }

  lines.push("---")
  lines.push("## 3. Product Catalog & Capabilities")
  lines.push("")
  for (const prod of PRODUCT_PAGES) {
    lines.push(`### ${prod.metaTitle.en.split("|")[0].trim()}`)
    lines.push(`- **URL:** ${absoluteUrl(`/product/${prod.slug}`)}`)
    lines.push(`- **Core Function:** ${prod.metaDescription.en}`)
    lines.push(`- **Target Outcome:** ${prod.subheadline.en}`)
    lines.push("")
  }

  lines.push("### Additional Specialized Modules:")
  lines.push("- **Smart Menu & QR Dining:** Contactless table QR ordering, Live Kitchen Display System (KDS) with audio alerts, waiter call buttons.")
  lines.push("- **GPT-4o Vision AI Menu Scanner:** Instantly digitizes physical printed menus and multi-page PDFs into structured dish items with OMR pricing in under 2 minutes.")
  lines.push("- **Digital Business Cards (vCard):** 10+ executive themes, dynamic QR code, NFC card integration, and RFC 6350 phone contact download.")
  lines.push("- **Digital QR Reviews Stand:** AI-designed Google review display cards with negative review filtering and automated AI review responses.")
  lines.push("- **Website Live Chat & WhatsApp Widget:** Lightweight embeddable floating widget connecting visitors to web chat or WhatsApp.")
  lines.push("")

  lines.push("---")
  lines.push("## 4. Industry Verticals & Solutions")
  lines.push("")
  for (const ind of INDUSTRY_PAGES) {
    lines.push(`### ${ind.metaTitle.en.split("|")[0].trim()}`)
    lines.push(`- **URL:** ${absoluteUrl(`/solutions/${ind.slug}`)}`)
    lines.push(`- **Primary Use Case:** ${ind.primaryKeyword}`)
    lines.push(`- **Solution Overview:** ${ind.metaDescription.en}`)
    lines.push("")
  }

  lines.push("---")
  lines.push("## 5. Regional Hubs & GCC City Coverage")
  lines.push("")
  for (const loc of LOCATION_PAGES) {
    lines.push(`### ${loc.city}, ${loc.country} (${loc.currency})`)
    lines.push(`- **URL:** ${absoluteUrl(`/locations/${loc.slug}`)}`)
    lines.push(`- **Target Market:** ${loc.subheadline}`)
    lines.push(`- **Local Relevance:** ${loc.intro}`)
    lines.push("")
  }

  lines.push("---")
  lines.push("## 6. Official Oman Commercial Pages")
  lines.push("")
  lines.push(`- [WhatsApp Business API Oman](${absoluteUrl("/whatsapp-business-api-oman")}): Official Meta Cloud API platform in Oman with AmwalPay and multi-agent CRM.`)
  lines.push(`- [WhatsApp Automation Oman](${absoluteUrl("/whatsapp-automation-oman")}): Scheduled broadcasts, abandoned cart recovery, and auto-reminders.`)
  lines.push(`- [WhatsApp Chatbot Oman](${absoluteUrl("/whatsapp-chatbot-oman")}): AI bot builder with Omani Arabic dialect support and visual flow canvas.`)
  lines.push(`- [WhatsApp CRM Oman](${absoluteUrl("/whatsapp-crm-oman")}): Multi-agent shared team inbox, conversation assignment, and client protection.`)
  lines.push(`- [WhatsApp Marketing Oman](${absoluteUrl("/whatsapp-marketing-oman")}): Promotional campaigns with 98% open rates and Click-to-WhatsApp ad tracking.`)
  lines.push("")

  lines.push("---")
  lines.push("## 7. Commercial Pricing & Subscription Models")
  lines.push("")
  lines.push("- **Free Trial:** 14-day free trial on all plans, no credit card required.")
  lines.push("- **Starter Plan:** 19 OMR/month. Includes 3 team agent seats, 1 official WhatsApp number, unlimited incoming messages, and no-code flow builder.")
  lines.push("- **Pro Plan:** 49 OMR/month. Includes 10 team seats, visual Botflow Studio, AmwalPay in-chat payment links, broadcast campaigns, and Smart Menu QR.")
  lines.push("- **Enterprise Plan:** 99 OMR/month. Unlimited seats, custom webhooks, dedicated account manager in Muscat, prioritized SLA, and tailored onboarding.")
  lines.push("- **Conversation Fees:** 0% markup. Exact official Meta rates.")
  lines.push("")

  lines.push("---")
  lines.push("## 8. Technical & Security Compliance")
  lines.push("")
  lines.push("- **API Architecture:** Next.js 16 App Router, Prisma ORM, PostgreSQL database, Docker containerization, systemd process supervision.")
  lines.push("- **Data Security:** End-to-end HTTPS/TLS, strict CORS & Content Security Policy, AES-256 encrypted credential storage.")
  lines.push("- **Payment Security:** PCI-DSS compliant AmwalPay gateway with HMAC-SHA256 signature verification on all webhooks.")
  lines.push("- **Meta Compliance:** Direct Meta Cloud API integration conforming to WhatsApp Business Policy and Commerce Policy.")
  lines.push("")

  lines.push("---")
  lines.push("## 9. Recent Platform Changelog & Releases")
  lines.push("")
  lines.push("- **v6.5:** AI Website Builder Studio, Natural Language Copilot, Per-Device Responsive Columns (Desktop, Tablet, Mobile), Interactive Product/Image Carousels, WhatsApp Multi-CTA Blocks, and Instant Live Storefront Publishing.")
  lines.push("- **v6.4:** Google My Business AI Auto-Reply Engine, Local SEO Keyword Injection, Unified Schema.org @graph Entity Architecture, and GCC Industry Playbooks.")
  lines.push("- **v6.3:** WooCommerce 2-Way Sync, Automated Abandoned Cart Recovery, WhatsApp Interactive Quick-Reply Buttons.")
  lines.push("- **v6.2:** GPT-4o Vision AI Menu Scanner for PDF and Photo Menus, AmwalPay OMR Instant Checkout.")
  lines.push("- **v6.1:** Multi-tenant Marketing Intelligence for Platform Owners, Support Ticket Live Bilingual Translation (Arabic <-> English).")
  lines.push("")

  lines.push("---")
  lines.push("## 10. Educational Guides & Articles")
  lines.push("")
  for (const post of BLOG_POSTS.slice(0, 15)) {
    lines.push(`- [${post.h1}](${absoluteUrl(`/blog/${post.slug}`)}): ${(post.metaDescription || "").replace(/\s+/g, " ").trim()}`)
  }
  lines.push("")

  lines.push("---")
  lines.push(`For complete machine-readable XML sitemaps, inspect ${absoluteUrl("/sitemap.xml")}.`)

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
