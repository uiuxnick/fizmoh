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
  { slug: "website-live-chat", name: "Website Live Chat & WhatsApp Widget", description: "Embeddable dual-mode website chat widget, WhatsApp direct chat, AI smart replies, lead capture and live team inbox sync.", module: "LIVE_CHAT", priceMonthly: 15, priceYearly: 150, limits: {} },
  { slug: "extra-message-volume", name: "Extra Message Volume", description: "Add 10,000 outbound messages per month.", module: "INBOX", priceMonthly: 20, priceYearly: 200, limits: { messagesPerMonth: 10000 } },
] as const

export async function ensureDefaultAddons() {
  await Promise.all(DEFAULT_ADDONS.map((addon, sortOrder) => db.planAddon.upsert({
    where: { slug: addon.slug },
    create: { ...addon, currency: "OMR", sortOrder },
    update: { name: addon.name, description: addon.description, module: addon.module, limits: addon.limits, priceMonthly: addon.priceMonthly, priceYearly: addon.priceYearly, sortOrder },
  })))
}
