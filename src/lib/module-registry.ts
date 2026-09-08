/**
 * Canonical product capability catalogue.
 *
 * The registry is deliberately data, not UI code. Platform plan editing,
 * public pricing, navigation and server-side entitlement checks can all use
 * the same vocabulary without silently dropping a module when a new screen is
 * added. `alwaysIncluded` modules remain available to every paid/trial plan.
 */
export const MODULE_REGISTRY = [
  { key: "INBOX", label: "WhatsApp Inbox", description: "Shared conversations and agent handover", group: "Core", alwaysIncluded: true },
  { key: "CRM", label: "CRM & Contacts", description: "Customers, leads, tags and notes", group: "Core", alwaysIncluded: true },
  { key: "SETTINGS", label: "Workspace Settings", description: "Business profile, integrations and preferences", group: "Core", alwaysIncluded: true },
  { key: "STAFF", label: "Staff & Roles", description: "Team members and workspace permissions", group: "Core", alwaysIncluded: true },
  { key: "TOURS", label: "Tours & Bookings", description: "Tours, availability, slots and vouchers", group: "Commerce", alwaysIncluded: false },
  { key: "RESTAURANT", label: "Smart Menu & Table Ordering", description: "Multi-branch digital menus, QR ordering, KDS, and waiter calls", group: "Commerce", alwaysIncluded: false },
  { key: "CATALOG", label: "Catalog & Products", description: "WhatsApp products and collections", group: "Commerce", alwaysIncluded: false },
  { key: "WOOCOMMERCE", label: "WooCommerce", description: "Sync products and orders from WooCommerce", group: "Commerce", alwaysIncluded: false },
  { key: "VISA", label: "Visa Assistance", description: "Visa enquiries and document workflows", group: "Operations", alwaysIncluded: false },
  { key: "APPOINTMENTS", label: "Appointments", description: "Bookings, availability and video consultations", group: "Operations", alwaysIncluded: false },
  { key: "HOSPITAL", label: "Hospital Day Care", description: "Beds, oncology sessions and reminders", group: "Operations", alwaysIncluded: false },
  { key: "BROADCAST", label: "Campaigns & Broadcast", description: "Segments, templates and outbound campaigns", group: "Growth", alwaysIncluded: false },
  { key: "FLOWS", label: "Bot & Automation Builder", description: "Visual flows, triggers and actions", group: "Automation", alwaysIncluded: true },
  { key: "AI", label: "AI Assistant", description: "AI replies, vision and knowledge answers", group: "Automation", alwaysIncluded: true },
  { key: "KNOWLEDGE", label: "Knowledge Base", description: "Business content for grounded answers", group: "Automation", alwaysIncluded: true },
  { key: "CALLS", label: "Voice Calls", description: "Live calling and call operations", group: "Automation", alwaysIncluded: false },
  { key: "PAYMENTS", label: "Payments & Billing", description: "AmwalPay checkout, invoices and verification", group: "Finance", alwaysIncluded: false },
  { key: "REPORTS", label: "Reports & Analytics", description: "Revenue, customers and operational reporting", group: "Insights", alwaysIncluded: false },
  { key: "CONTENT", label: "Content Management", description: "Pages, offers and customer-facing content", group: "Growth", alwaysIncluded: false },
  { key: "DIGITAL_QR", label: "Digital QR Addons", description: "QR review campaigns, AI-drafted reviews and reputation management", group: "Growth", alwaysIncluded: false },
  { key: "DIGITAL_VCARD", label: "Digital Business Card", description: "Smart digital business card with vCard, WhatsApp, QR, services, payments and analytics", group: "Growth", alwaysIncluded: true },
  { key: "SOCIAL_INBOX", label: "Facebook & Instagram Automation", description: "Messenger and Instagram DMs, comments, unified inbox and AI auto-reply", group: "Growth", alwaysIncluded: false },
  { key: "LIVE_CHAT", label: "Website Chat & WhatsApp Widget", description: "Embeddable dual-mode website chat widget, WhatsApp direct chat, AI smart replies, lead capture and live team inbox sync", group: "Growth", alwaysIncluded: true },
] as const

export type Module = typeof MODULE_REGISTRY[number]["key"]
export const MODULE_KEYS = MODULE_REGISTRY.map(module => module.key) as Module[]
export const MODULE_BY_KEY = Object.fromEntries(MODULE_REGISTRY.map(module => [module.key, module])) as Record<Module, typeof MODULE_REGISTRY[number]>

export function normalizeModules(value: unknown): Module[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set<string>(MODULE_KEYS)
  return Array.from(new Set(value.map(String).filter((key): key is Module => allowed.has(key))))
}

export function effectiveModules(value: unknown): Module[] {
  const listed = new Set(normalizeModules(value))
  for (const item of MODULE_REGISTRY) if (item.alwaysIncluded) listed.add(item.key)
  return Array.from(listed)
}
