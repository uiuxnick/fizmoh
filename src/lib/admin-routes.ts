import type { ViewKey } from "@/lib/store"

export const VIEW_PATHS: Record<ViewKey, string> = {
  dashboard: "dashboard",
  "customer-site": "site",
  "digital-qr": "digital-qr",
  "digital-vcard": "digital-vcard",
  "social-channels": "social-channels",
  tours: "tours",
  bookings: "bookings",
  calendar: "calendar",
  appointments: "appointments",
  visa: "visa",
  payments: "payments",
  inbox: "whatsapp",
  "ai-assistant": "ai",
  knowledge: "knowledge",
  templates: "templates",
  campaigns: "campaigns",
  customers: "customers",
  subscribers: "subscribers",
  staff: "staff",
  "bot-builder": "automation",
  reports: "reports",
  "whatsapp-setup": "setup",
  "whatsapp-numbers": "numbers",
  settings: "settings",
  coupons: "coupons",
  content: "content",
  "audit-logs": "audit-logs",
  billing: "billing",
  platform: "platform",
  restaurant: "restaurant",
  catalog: "catalog",
  woocommerce: "woocommerce",
  hospital: "hospital",
  "live-chat": "live-chat",
}

const ALIASES: Record<string, ViewKey> = {
  livechat: "live-chat",
  webchat: "live-chat",
  widget: "live-chat",
  crm: "customers",
  leads: "customers",
  contacts: "customers",
  vcard: "digital-vcard",
  digitalvcard: "digital-vcard",
  "bot-builder": "bot-builder",
  botflows: "bot-builder",
  flows: "bot-builder",
  chemo: "hospital",
  oncology: "hospital",
  meet: "appointments",
  digital: "appointments",
  pos: "restaurant",
  menu: "restaurant",
  store: "woocommerce",
  shop: "catalog",
  inbox: "inbox",
  chat: "inbox",
}

const PATH_TO_VIEW = new Map<string, ViewKey>(
  (Object.entries(VIEW_PATHS) as [ViewKey, string][]).map(([view, path]) => [path, view]),
)

// Add aliases to map
Object.entries(ALIASES).forEach(([alias, view]) => {
  PATH_TO_VIEW.set(alias, view)
})

export function viewForPath(path: string): ViewKey | null {
  const slug = path.replace(/^#?\/?/, "").replace(/\/$/, "").toLowerCase()
  return PATH_TO_VIEW.get(slug) ?? null
}

export function pathForView(view: ViewKey): string {
  return `/${VIEW_PATHS[view] ?? "dashboard"}`
}

export const ADMIN_SLUGS = Array.from(new Set([...Object.values(VIEW_PATHS), ...Object.keys(ALIASES)]))
