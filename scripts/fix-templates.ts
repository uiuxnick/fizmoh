/**
 * Fix and resubmit failed WhatsApp templates to Meta
 * Addresses Meta's template rules:
 * 1. Variables can't be at start/end of body
 * 2. Headers need example field
 * 3. AUTHENTICATION category has different format
 */

import { createTemplate, listTemplates } from "../src/lib/whatsapp"
import { db } from "../src/lib/db"

const FIXED_TEMPLATES = [
  {
    name: "payment_rejected",
    category: "UTILITY" as const,
    language: "en_US",
    bodyText: "Hi {{1}}, unfortunately we couldn't verify your payment for order {{2}}. Reason: {{3}}. Please resubmit your payment or contact us at {{4}}.",
    bodyVariables: ["Ahmed", "ORD-1001", "Amount mismatch", "+96898821965"],
    footerText: "Oman Adventures",
  },
  {
    name: "welcome_offer",
    category: "MARKETING" as const,
    language: "en_US",
    headerType: "IMAGE" as const,
    bodyText: "Welcome to Oman Adventures! 🐪 Enjoy 15% off your first booking with code WELCOME15. Browse our tours: {{1}}",
    bodyVariables: ["https://omanadventures.om"],
    footerText: "Reply STOP to opt out",
    buttons: [
      { type: "URL" as const, text: "Browse Tours", url: "https://omanadventures.om" },
    ],
  },
  {
    name: "otp_verification",
    category: "AUTHENTICATION" as const,
    language: "en_US",
    bodyText: "{{1}} is your Oman Adventures verification code. Don't share this code with anyone. It expires in 5 minutes.",
    bodyVariables: ["123456"],
  },
  {
    name: "booking_cancelled",
    category: "UTILITY" as const,
    language: "en_US",
    bodyText: "Hi {{1}}, your booking {{2}} for \"{{3}}\" has been cancelled due to: {{4}}. If you have questions, contact us at {{5}}.",
    bodyVariables: ["Ahmed", "ORD-1001", "Wahiba Sands Desert Safari", "Customer request", "+96898821965"],
    footerText: "Oman Adventures",
  },
  {
    name: "waitlist_notification",
    category: "UTILITY" as const,
    language: "en_US",
    bodyText: "Great news {{1}}! A seat just opened up for \"{{2}}\" on {{3}} at {{4}}. Book now before it's gone! Link: {{5}}",
    bodyVariables: ["Ahmed", "Wahiba Sands Desert Safari", "15 Aug 2026", "14:00", "https://omanadventures.om"],
    footerText: "Oman Adventures",
    buttons: [
      { type: "URL" as const, text: "Book Now", url: "https://omanadventures.om" },
    ],
  },
]

async function main() {
  console.log("🔧 Fixing & Resubmitting Failed Templates")
  console.log("==========================================")

  // Delete existing failed ones first (they may be in REJECTED state)
  console.log("\n📥 Checking existing templates...")
  const existing = await listTemplates()
  const existingNames = existing.success ? existing.templates?.map(t => t.name) || [] : []

  for (const tmpl of FIXED_TEMPLATES) {
    console.log(`\n📤 Submitting: ${tmpl.name}...`)

    // If already exists, skip (Meta doesn't allow duplicates in same language)
    if (existingNames.includes(tmpl.name)) {
      console.log(`   ⏭️  Already exists on Meta — skipping (will update DB)`)
      const dbT = await db.template.findFirst({ where: { name: tmpl.name, channel: "WHATSAPP" } })
      if (dbT) {
        await db.template.update({ where: { id: dbT.id }, data: { status: "PENDING" } })
      }
      continue
    }

    const result = await createTemplate(tmpl)
    if (result.success) {
      console.log(`   ✅ Created — ID: ${result.templateId}, Status: ${result.status}`)
      const dbT = await db.template.findFirst({ where: { name: tmpl.name, channel: "WHATSAPP" } })
      if (dbT) {
        await db.template.update({ where: { id: dbT.id }, data: { status: result.status || "PENDING", metaTemplateId: result.templateId } })
      } else {
        await db.template.create({
          data: {
            channel: "WHATSAPP", name: tmpl.name, category: tmpl.category, language: tmpl.language,
            type: tmpl.headerType && tmpl.headerType !== "NONE" ? "MEDIA" : "TEXT",
            headerType: tmpl.headerType || "NONE",
            bodyContent: tmpl.bodyText, footerContent: tmpl.footerText || null,
            buttons: tmpl.buttons ? JSON.stringify(tmpl.buttons) : null,
            variables: tmpl.bodyVariables ? JSON.stringify(tmpl.bodyVariables) : null,
            status: result.status || "PENDING", metaTemplateId: result.templateId,
          },
        })
      }
    } else {
      console.log(`   ❌ Failed: ${result.error}`)
    }
    await new Promise(r => setTimeout(r, 1000))
  }

  // Final summary — list all templates on Meta
  console.log("\n" + "=".repeat(50))
  console.log("📋 All Templates on Meta:")
  const finalList = await listTemplates()
  if (finalList.success && finalList.templates) {
    for (const t of finalList.templates) {
      console.log(`   ${t.status === "APPROVED" ? "✅" : t.status === "REJECTED" ? "❌" : "⏳"} ${t.name} — ${t.status} (${t.language})`)
    }
    console.log(`\n   Total: ${finalList.templates.length} templates`)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
