/**
 * Submit all WhatsApp message templates to Meta for approval
 *
 * Per BRD §6.5.2: "Create, edit, and submit WhatsApp message templates for Meta approval"
 *
 * Run: bun run scripts/submit-templates.ts
 */

import { createTemplate, listTemplates, isWhatsAppConfigured } from "../src/lib/whatsapp"
import { db } from "../src/lib/db"
import { SAMPLE_WA_TEMPLATES } from "../src/lib/constants"

// Extended template definitions with proper Meta format
const TEMPLATES_TO_SUBMIT = [
  {
    name: "order_confirmation",
    category: "UTILITY" as const,
    language: "en_US",
    headerType: "IMAGE" as const,
    bodyText: "Dear {{1}}, your booking is confirmed!\n\n🎫 Order: {{2}}\n📍 Tour: {{3}}\n📅 Date: {{4}}\n⏰ Time: {{5}}\n👥 Pax: {{6}}\n💰 Amount: {{7}} {{8}}\n\nShow this message or your QR voucher at check-in. Have a great trip!",
    bodyVariables: ["Ahmed", "ORD-1001", "Wahiba Sands Desert Safari", "15 Aug 2026", "14:00", "2 Adults", "90.000", "OMR"],
    footerText: "Oman Adventures · omanadventures.om",
    buttons: [
      { type: "URL" as const, text: "View Voucher", url: "https://omanadventures.om/voucher" },
      { type: "QUICK_REPLY" as const, text: "Get Directions" },
      { type: "PHONE_NUMBER" as const, text: "Contact Support", phone: "+96898821965" },
    ],
  },
  {
    name: "payment_received",
    category: "UTILITY" as const,
    language: "en_US",
    bodyText: "Hi {{1}}, we've received your payment of {{2}} {{3}} for order {{4}}. Your booking is now being verified. You'll receive a confirmation shortly.",
    bodyVariables: ["Ahmed", "90.000", "OMR", "ORD-1001"],
    footerText: "Oman Adventures",
  },
  {
    name: "payment_approved",
    category: "UTILITY" as const,
    language: "en_US",
    headerType: "DOCUMENT" as const,
    bodyText: "Great news {{1}}! Your payment for order {{2}} has been approved ✅. Your booking is confirmed. Here's your voucher with QR code for check-in.",
    bodyVariables: ["Ahmed", "ORD-1001"],
    footerText: "Oman Adventures · omanadventures.om",
    buttons: [
      { type: "URL" as const, text: "Download Voucher", url: "https://omanadventures.om/voucher" },
    ],
  },
  {
    name: "payment_rejected",
    category: "UTILITY" as const,
    language: "en_US",
    bodyText: "Hi {{1}}, unfortunately we couldn't verify your payment for order {{2}}. Reason: {{3}}. Please resubmit your payment or contact us at {{4}}.",
    bodyVariables: ["Ahmed", "ORD-1001", "Amount mismatch", "+96898821965"],
    footerText: "Oman Adventures",
  },
  {
    name: "tour_reminder",
    category: "UTILITY" as const,
    language: "en_US",
    bodyText: "Reminder: Your tour \"{{1}}\" is tomorrow at {{2}}. Meeting point: {{3}}. Please arrive 15 min early. Reply with your voucher QR or show this message.",
    bodyVariables: ["Wahiba Sands Desert Safari", "14:00", "Hotel lobby - Muscat"],
    footerText: "Oman Adventures",
    buttons: [
      { type: "URL" as const, text: "View Booking", url: "https://omanadventures.om/booking" },
      { type: "PHONE_NUMBER" as const, text: "Contact Support", phone: "+96898821965" },
    ],
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
    name: "abandoned_cart",
    category: "MARKETING" as const,
    language: "en_US",
    bodyText: "Hi {{1}}, you left \"{{2}}\" in your cart! Only {{3}} seats left for {{4}}. Complete your booking now: {{5}}",
    bodyVariables: ["Ahmed", "Wahiba Sands Desert Safari", "3", "15 Aug 2026", "https://omanadventures.om/booking"],
    footerText: "Reply STOP to opt out",
    buttons: [
      { type: "URL" as const, text: "Complete Booking", url: "https://omanadventures.om" },
    ],
  },
  {
    name: "post_tour_review",
    category: "UTILITY" as const,
    language: "en_US",
    bodyText: "Hi {{1}}, how was your \"{{2}}\" experience? We'd love your feedback! Rate your trip: {{3}} and get 10% off your next adventure.",
    bodyVariables: ["Ahmed", "Wahiba Sands Desert Safari", "https://omanadventures.om/review"],
    footerText: "Oman Adventures",
    buttons: [
      { type: "URL" as const, text: "Leave a Review", url: "https://omanadventures.om" },
    ],
  },
  {
    name: "otp_verification",
    category: "AUTHENTICATION" as const,
    language: "en_US",
    bodyText: "{{1}} is your Oman Adventures verification code. This code expires in 5 minutes. Do not share it with anyone.",
    bodyVariables: ["123456"],
    footerText: "Oman Adventures",
  },
  {
    name: "booking_cancelled",
    category: "UTILITY" as const,
    language: "en_US",
    bodyText: "Hi {{1}}, your booking {{2}} for \"{{3}}\" has been cancelled. Reason: {{4}}. If you have questions, contact us at {{5}}.",
    bodyVariables: ["Ahmed", "ORD-1001", "Wahiba Sands Desert Safari", "Customer request", "+96898821965"],
    footerText: "Oman Adventures",
  },
  {
    name: "refund_processed",
    category: "UTILITY" as const,
    language: "en_US",
    bodyText: "Hi {{1}}, a refund of {{2}} {{3}} has been processed for your order {{4}}. The refund will appear in your account within 5-7 business days.",
    bodyVariables: ["Ahmed", "90.000", "OMR", "ORD-1001"],
    footerText: "Oman Adventures",
  },
  {
    name: "waitlist_notification",
    category: "UTILITY" as const,
    language: "en_US",
    bodyText: "Great news {{1}}! A seat just opened up for \"{{2}}\" on {{3}} at {{4}}. Book now before it's gone! {{5}}",
    bodyVariables: ["Ahmed", "Wahiba Sands Desert Safari", "15 Aug 2026", "14:00", "https://omanadventures.om"],
    footerText: "Oman Adventures",
    buttons: [
      { type: "URL" as const, text: "Book Now", url: "https://omanadventures.om" },
    ],
  },
]

async function main() {
  console.log("📋 WhatsApp Template Submission Script")
  console.log("========================================")

  if (!isWhatsAppConfigured()) {
    console.error("❌ WhatsApp Cloud API not configured. Set credentials in .env")
    process.exit(1)
  }

  // First, list existing templates to avoid duplicates
  console.log("\n📥 Fetching existing templates from Meta...")
  const existing = await listTemplates()
  if (existing.success && existing.templates) {
    console.log(`   Found ${existing.templates.length} existing templates on Meta`)
    const existingNames = existing.templates.map(t => t.name)
    console.log(`   Existing: ${existingNames.join(", ")}`)
  }

  // Submit each template
  console.log(`\n📤 Submitting ${TEMPLATES_TO_SUBMIT.length} templates to Meta...`)
  let successCount = 0
  let failCount = 0

  for (const tmpl of TEMPLATES_TO_SUBMIT) {
    console.log(`\n   Submitting: ${tmpl.name} (${tmpl.category})...`)
    const result = await createTemplate(tmpl)

    if (result.success) {
      console.log(`   ✅ Created — ID: ${result.templateId}, Status: ${result.status || "PENDING"}`)
      successCount++

      // Also save/update in database
      const dbTemplate = await db.template.findFirst({ where: { name: tmpl.name, channel: "WHATSAPP" } })
      if (dbTemplate) {
        await db.template.update({
          where: { id: dbTemplate.id },
          data: {
            status: result.status || "PENDING",
            metaTemplateId: result.templateId,
          },
        })
      } else {
        await db.template.create({
          data: {
            channel: "WHATSAPP",
            name: tmpl.name,
            category: tmpl.category,
            language: tmpl.language,
            type: tmpl.headerType && tmpl.headerType !== "NONE" ? "MEDIA" : "TEXT",
            headerType: tmpl.headerType || "NONE",
            headerContent: tmpl.headerType === "TEXT" ? tmpl.headerText : null,
            bodyContent: tmpl.bodyText,
            footerContent: tmpl.footerText || null,
            buttons: tmpl.buttons ? JSON.stringify(tmpl.buttons) : null,
            variables: tmpl.bodyVariables ? JSON.stringify(tmpl.bodyVariables) : null,
            status: result.status || "PENDING",
            metaTemplateId: result.templateId,
          },
        })
      }
    } else {
      console.log(`   ❌ Failed: ${result.error}`)
      // Check if it already exists (Meta returns error for duplicates)
      if (result.error?.includes("already exist") || result.error?.includes("duplicate")) {
        console.log(`   ℹ️  Template already exists on Meta — marking as PENDING in DB`)
        const dbTemplate = await db.template.findFirst({ where: { name: tmpl.name, channel: "WHATSAPP" } })
        if (dbTemplate) {
          await db.template.update({ where: { id: dbTemplate.id }, data: { status: "PENDING" } })
        }
        successCount++
      } else {
        failCount++
      }
    }

    // Small delay between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log("\n" + "=".repeat(40))
  console.log(`✅ Successfully submitted: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log("\n📝 Templates are now PENDING Meta approval.")
  console.log("   Check status in Meta Business Manager: https://business.facebook.com/wa/manage/message-templates/")
  console.log("   Approval typically takes a few minutes to hours.")
}

main()
  .catch(e => { console.error("Script error:", e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
