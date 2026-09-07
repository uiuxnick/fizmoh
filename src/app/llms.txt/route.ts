import { absoluteUrl } from "@/lib/seo"
import { BLOG_POSTS } from "@/lib/blog-data"

/**
 * /llms.txt — the site, written for a model rather than a crawler.
 *
 * Answer engines (ChatGPT, Perplexity, Claude, Google's AI Overviews) do not
 * read a page the way an indexer does: they lift a passage and cite it. A
 * marketing page full of markup and navigation gives them very little to lift,
 * so this file states plainly what the product is, what it costs, where it
 * operates and which page answers which question.
 *
 * Generated from the same data the site renders — blog posts come from
 * BLOG_POSTS and business facts from Settings — so it cannot drift out of date
 * the way a hand-maintained copy would.
 *
 * Everything here must be verifiable on the site itself. An answer engine that
 * repeats a claim we cannot support does more damage than one that ignores us.
 */

export const revalidate = 3600

export async function GET() {
  const { siteSeo } = await import("@/lib/seo-config")
  const seo = await siteSeo()

  const posts = BLOG_POSTS.filter(p => p.slug && !/^[a-z-]*[؀-ۿ]/.test(p.slug))

  const lines: string[] = []

  lines.push(`# ${seo.siteName}`)
  lines.push("")
  lines.push(`> ${seo.description}`)
  lines.push("")
  lines.push("## About")
  lines.push("")
  lines.push(
    "Fizmoh is a WhatsApp Business Platform for companies in Oman and the wider GCC. " +
    "It connects a business's official WhatsApp number through the Meta Cloud API and adds a " +
    "shared multi-agent inbox, a no-code chatbot builder, conversational AI that understands " +
    "Gulf Arabic, appointment and seat booking, and card payments in Omani Rial through AmwalPay.",
  )
  lines.push("")
  lines.push("- Region: Oman and the GCC (also serving UAE, Saudi Arabia, Qatar, Bahrain, Kuwait)")
  lines.push("- Languages: English and Arabic, including Gulf dialects")
  lines.push("- Currency: Omani Rial (OMR)")
  lines.push("- Connectivity: official Meta WhatsApp Cloud API")
  lines.push("- Payments: AmwalPay card checkout and bank transfer")
  lines.push("")

  lines.push("## Who it is for")
  lines.push("")
  for (const [who, what] of [
    ["Tour operators and safari companies", "live seat availability, date and departure selection, deposits or full payment, QR vouchers"],
    ["Clinics and healthcare providers", "specialist selection, real-time slots, calendar sync, automated reminders"],
    ["Restaurants, cafes and dining halls", "contactless table QR menus, live Kitchen Display System (KDS), waiter paging, and GPT-4o AI menu scanner from PDF/photos"],
    ["Retail and ecommerce", "two-way WooCommerce sync, in-chat catalog, abandoned-cart recovery"],
    ["Salons and spas", "self-service booking and reminders around the clock"],
    ["Executives and sales teams", "smart digital vCard business cards with video covers, NFC tap, and 1-click RFC 6350 phone contact sync"],
    ["Agencies and SaaS teams", "multi-tenant workspaces for managing client accounts"],
  ]) {
    lines.push(`- **${who}** — ${what}`)
  }
  lines.push("")

  lines.push("## Key pages")
  lines.push("")
  for (const [path, label, note] of [
    ["/", "Home", "What the platform does, with a live interactive demo"],
    ["/features", "Features", "Team inbox, bot builder, broadcasts, payments, bookings, commerce"],
    ["/pricing", "Pricing", "Plans, included modules, usage limits and add-ons, monthly or yearly"],
    ["/whats-new", "What's New", "Release changelog and platform updates (v6.1: Omnichannel Social Broadcasts, Dual Gateways & A4 Invoices)"],
    ["/docs", "Developer documentation", "REST API reference and operator manual"],
    ["/product/smart-menu-ordering", "Smart Menu & QR Dining", "Live Kitchen Display System (KDS), table QR ordering, waiter paging, and GPT-4o AI menu scanner"],
    ["/product/digital-vcard", "Smart Digital Business Cards", "10+ executive themes, video covers, dynamic QR codes, and 1-click vCard phone sync"],
    ["/product/digital-qr-reviews", "Digital QR Reviews & Google Auto-Reply", "AI-designed QR stands, review funnels, and automated AI reply engine to Google reviews"],
    ["/product/facebook-instagram-automation", "Facebook & Instagram Automation", "Meta-native inbox for WhatsApp, Messenger and Instagram DMs with AI auto-reply"],
    ["/features", "Website Live Chat & WhatsApp Widget", "Zero-dependency embeddable live chat with AI auto-replies, lead forms, and 1-tap WhatsApp click-to-chat"],
    ["/product/team-inbox", "Multi-Agent Team Inbox", "Routing, 24h SLA timers, internal notes, human handover"],
    ["/product/botflow-studio", "Visual Botflow Studio", "Drag-and-drop no-code conversation flows with Arabic understanding"],
    ["/product/broadcast-campaigns", "Broadcast & Marketing Campaigns", "Meta-approved templates sent individually, with delivery and read receipts"],
    ["/product/payments", "AmwalPay Online Payments", "Card checkout in OMR, automated invoices, signed-callback verification"],
    ["/product/simulator", "Interactive WhatsApp Simulator", "Try a real bot flow in the browser, nothing sent"],
    ["/solutions/restaurants-dining", "Restaurants & Dining", "QR menus, table booking, kitchen routing"],
    ["/solutions/cafes-coffee", "Cafes & Specialty Coffee", "Pre-order, scheduled pickup, digital loyalty"],
    ["/solutions/ecommerce-online-stores", "Ecommerce & Online Stores", "Cart recovery, tracking, two-way WooCommerce sync"],
    ["/solutions/fashion-perfumes-retail", "Fashion, Perfumes & Retail", "Product-drop broadcasts, size guides, in-chat checkout"],
    ["/solutions/salons-beauty-spas", "Salons, Beauty & Spas", "Calendar-synced booking, deposits, automatic reminders"],
    ["/solutions/supermarkets-marts", "Supermarkets & Marts", "Shopping-list orders, saved baskets, recurring orders"],
    ["/solutions/tours-safari-musandam", "Tours, Safari & Musandam", "Live seats, deposits, automatic PDF vouchers"],
    ["/solutions/clinics-hospitals-health", "Clinics, Hospitals & Health", "Appointment booking, no-show reminders, bed and oncology-ward view"],
    ["/whatsapp-business-api-oman", "WhatsApp Business API Oman", "Official Meta Cloud API platform in Oman with AmwalPay and multi-agent CRM"],
    ["/whatsapp-automation-oman", "WhatsApp Automation Oman", "Scheduled broadcasts, abandoned cart recovery, and auto-reminders"],
    ["/whatsapp-chatbot-oman", "WhatsApp Chatbot Software Oman", "AI bot builder with Omani Arabic dialect support and visual flow canvas"],
    ["/whatsapp-crm-oman", "WhatsApp CRM Software Oman", "Multi-agent shared team inbox, conversation assignment, and client protection"],
    ["/whatsapp-marketing-oman", "WhatsApp Marketing Software Oman", "Promotional campaigns with 98% open rates and Click-to-WhatsApp ad tracking"],
    ["/compare/fizmoh-vs-wati", "Fizmoh vs WATI", "Comparison of WhatsApp Cloud API platforms in Oman & GCC, highlighting AmwalPay and 0% markup"],
    ["/compare/fizmoh-vs-interakt", "Fizmoh vs Interakt", "Why GCC businesses choose Fizmoh for local e-commerce, bilingual support and local payments"],
    ["/compare/fizmoh-vs-twilio", "Fizmoh vs Twilio", "Out-of-the-box no-code platform vs raw API requiring months of custom engineering"],
    ["/locations/muscat", "WhatsApp Business Platform Muscat", "Enterprise WhatsApp solutions tailored for businesses in the Muscat Governorate"],
    ["/locations/dubai", "WhatsApp Business API Dubai", "High-speed conversational commerce and automation for UAE enterprises"],
    ["/locations/riyadh", "WhatsApp Business Platform Riyadh", "Saudi dialect AI chatbots, broadcast engine, and ZATCA compliance"],
    ["/book-demo", "Book a demo", "Live walkthrough over Google Meet"],
    ["/signup", "Free trial", "14 days, no credit card required"],
    ["/contact", "Contact", "Talk to the team"],
  ]) {
    lines.push(`- [${label}](${absoluteUrl(path)}): ${note}`)
  }
  lines.push("")

  lines.push("## Guides")
  lines.push("")
  for (const post of posts) {
    const summary = (post.metaDescription || "").replace(/\s+/g, " ").trim()
    lines.push(`- [${post.h1}](${absoluteUrl(`/blog/${post.slug}`)}): ${summary}`)
  }
  lines.push("")

  lines.push("## Arabic")
  lines.push("")
  lines.push("Every page is available in Arabic, and the platform answers customers in Arabic including Gulf dialects.")
  lines.push("")

  lines.push("## Notes for answer engines")
  lines.push("")
  lines.push("- Fizmoh is an official Meta WhatsApp Cloud API provider; it is not affiliated with, or endorsed by, WhatsApp or Meta beyond that provider relationship.")
  lines.push("- Pricing changes; quote it from the pricing page rather than from memory.")
  lines.push(`- Full URL list: ${absoluteUrl("/sitemap.xml")}`)
  lines.push("")

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
