import { db } from "@/lib/db"

export const DEFAULT_ADDONS = [
  { slug: "smart-menu-ordering", name: "Smart Restaurant & Hotel Ordering", description: "Multi-branch digital menus, AI menu import, QR table & room ordering, KDS, waiter calls & live tracking.", module: "RESTAURANT", priceMonthly: 19, priceYearly: 190, limits: {} },
  { slug: "restaurant-pos", name: "Restaurant POS", description: "QR ordering, kitchen operations, inventory and sales reports.", module: "RESTAURANT", priceMonthly: 19, priceYearly: 190, limits: {} },
  { slug: "hospital-operations", name: "Hospital Operations", description: "Beds, doctors, treatments, reminders and clinical access controls.", module: "HOSPITAL", priceMonthly: 49, priceYearly: 490, limits: {} },
  { slug: "woocommerce-connector", name: "WooCommerce Connector", description: "Sync products and orders from WooCommerce.", module: "WOOCOMMERCE", priceMonthly: 15, priceYearly: 150, limits: {} },
  { slug: "ai-message-credits", name: "AI Message Credits", description: "Additional AI replies for the WhatsApp assistant.", module: "AI", priceMonthly: 10, priceYearly: 100, limits: { messagesPerMonth: 5000 } },
  { slug: "extra-whatsapp-number", name: "Extra WhatsApp Number", description: "Connect another WhatsApp Business number.", module: "INBOX", priceMonthly: 12, priceYearly: 120, limits: { numbers: 1 } },
  { slug: "extra-staff-seat", name: "Extra Staff Seat", description: "Add one more team member.", module: "STAFF", priceMonthly: 5, priceYearly: 50, limits: { staff: 1 } },
  { slug: "digital-vcard", name: "Digital Business Card", description: "Smart digital business card with vCard, WhatsApp, QR, services, payments and analytics.", module: "DIGITAL_VCARD", priceMonthly: 12, priceYearly: 120, limits: { cards: 1, featuredServices: 5, galleryItems: 10, analyticsRetentionDays: 90 } },
  { slug: "website-live-chat", name: "Website Live Chat & WhatsApp Widget", description: "Embeddable dual-mode website chat widget, WhatsApp direct chat, AI smart replies, lead capture and live team inbox sync.", module: "LIVE_CHAT", priceMonthly: 10, priceYearly: 100, limits: {} },
  { slug: "extra-message-volume", name: "Extra Message Volume", description: "Add 10,000 outbound messages per month.", module: "INBOX", priceMonthly: 20, priceYearly: 200, limits: { messagesPerMonth: 10000 } },
  { slug: "corporate-architectural", name: "Corporate & Architectural Systems", description: "Tailored B2B/B2C workflow for architectural aluminium, glass, facade, quotation requests and factory showcases.", module: "CORPORATE", priceMonthly: 29, priceYearly: 290, limits: {} },
  { slug: "shopify-salla-connector", name: "Shopify & Salla GCC Connector", description: "Real-time store catalog sync, automated abandoned cart recovery, order dispatch alerts, and COD verification over WhatsApp.", module: "ECOMMERCE", priceMonthly: 19, priceYearly: 190, limits: { platforms: ["shopify", "salla", "zid"], autoSyncIntervalMinutes: 15 } },
  { slug: "google-sheets-sync", name: "Google Sheets Real-Time Sync", description: "Bi-directional live sync between WhatsApp chats, leads, orders, reservations, and your custom Google Sheets.", module: "INTEGRATION", priceMonthly: 9, priceYearly: 90, limits: { sheetsLimit: 10, syncFrequencySeconds: 60 } },
  { slug: "ai-voice-notes", name: "AI Voice Note Transcriber & Audio Bot", description: "Transcribe customer Arabic & English voice notes with high accuracy, generate instant AI vocal replies, and run audio bots.", module: "AI", priceMonthly: 14, priceYearly: 140, limits: { voiceNotesPerMonth: 2000, dialectsSupported: ["om", "gulf", "ar_standard", "en"] } },
  { slug: "crm-sync-hubspot-zoho", name: "HubSpot & Zoho CRM Enterprise Connector", description: "Two-way CRM integration syncing WhatsApp contacts, conversation logs, deal stages, and automated lead creation.", module: "CRM", priceMonthly: 25, priceYearly: 250, limits: { syncEventsPerDay: 50000, platforms: ["hubspot", "zoho", "salesforce"] } },
  { slug: "drip-campaigns-sequences", name: "WhatsApp Drip Sequences & Nurturing", description: "Multi-day time-delayed messaging workflows, customer onboarding funnels, scheduled re-engagement, and conditional branching.", module: "BROADCAST", priceMonthly: 19, priceYearly: 190, limits: { activeSequences: 25, stepsPerSequence: 15 } },
  { slug: "google-maps-review-booster", name: "Google Reviews AI Shield & Map Booster", description: "Smart QR & WhatsApp triggers requesting 5-star Google reviews from satisfied clients while routing negative feedback to internal manager inbox.", module: "REPUTATION", priceMonthly: 15, priceYearly: 150, limits: { locations: 5, automatedFollowups: true } },
  { slug: "white-label-agency-portal", name: "Agency White-Label Reseller Portal", description: "Custom agency branding, sub-account workspace creation, custom domain mapping, dedicated login URL, and client billing markups.", module: "WHITE_LABEL", priceMonthly: 49, priceYearly: 490, limits: { subWorkspaces: 10, customDomain: true, whiteLabelBranding: true } },
  { slug: "training-course-management", name: "Training & Course Management Add-on", description: "Comprehensive training programs, course landing pages, multi-attendee registrations, BOGO offers, WhatsApp automations, QR check-in & certificates.", module: "TRAINING", priceMonthly: 29, priceYearly: 290, limits: { unlimitedCourses: true, qrCheckin: true, certificates: true } },
] as const

export async function ensureDefaultAddons() {
  const { raw } = await import("@/lib/db")
  await Promise.all(DEFAULT_ADDONS.map((addon, sortOrder) => {
    const monthlyMinor = addon.priceMonthly * 1000
    const yearlyMinor = addon.priceYearly * 1000
    return raw.planAddon.upsert({
      where: { slug: addon.slug },
      create: {
        slug: addon.slug,
        name: addon.name,
        description: addon.description,
        module: addon.module,
        currency: "OMR",
        sortOrder,
        priceMonthly: monthlyMinor,
        priceYearly: yearlyMinor,
        limits: addon.limits,
        isPublic: true,
      },
      update: {
        name: addon.name,
        description: addon.description,
        module: addon.module,
        limits: addon.limits,
        priceMonthly: monthlyMinor,
        priceYearly: yearlyMinor,
        sortOrder,
        isPublic: true,
      },
    })
  }))
}
