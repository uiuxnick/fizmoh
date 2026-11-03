/**
 * Granular Role & Permission Management and Data Privacy for Fizmoh Cloud.
 *
 * Implements:
 * 1. Granular allow/disallow permissions per staff member and role.
 * 2. Customer Phone Number Masking (+968 9200 ****) for agents without permission.
 * 3. Anti-data-leak protection (export prevention).
 */

export interface PermissionDefinition {
  key: string
  label: string
  description: string
  category: "PRIVACY_DATA" | "MESSAGING" | "COMMERCE" | "ADMIN"
  dangerLevel?: "low" | "medium" | "high"
}

export const PERMISSION_CATEGORIES = {
  PRIVACY_DATA: { label: "Privacy & Customer Data Protection", icon: "Shield" },
  MESSAGING: { label: "WhatsApp Messaging & Automation", icon: "MessageSquare" },
  COMMERCE: { label: "Commerce, Bookings & Financials", icon: "DollarSign" },
  ADMIN: { label: "Workspace Administration", icon: "UserCog" },
} as const

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // ─── Privacy & Customer Data Protection ───
  {
    key: "view_phone_numbers",
    label: "View Full Phone Numbers",
    description: "Display raw customer phone numbers. When disallowed, numbers are masked (e.g. +968 9200 ****) to prevent lead and contact theft.",
    category: "PRIVACY_DATA",
    dangerLevel: "high",
  },
  {
    key: "export_contacts",
    label: "Export Customer Contacts & CSV",
    description: "Download customer database, chat contacts, and order spreadsheets to CSV or Excel.",
    category: "PRIVACY_DATA",
    dangerLevel: "high",
  },
  {
    key: "view_all_conversations",
    label: "View All Team Conversations",
    description: "View all chats in the workspace. If disallowed, the agent can only view and respond to chats assigned to them.",
    category: "PRIVACY_DATA",
    dangerLevel: "medium",
  },
  {
    key: "delete_conversations",
    label: "Delete / Purge Chat History",
    description: "Delete or archive conversations. (Note: Original messages are always preserved in the database for compliance).",
    category: "PRIVACY_DATA",
    dangerLevel: "high",
  },

  // ─── WhatsApp Messaging & Automation ───
  {
    key: "send_messages",
    label: "Send WhatsApp Inbox Replies",
    description: "Send live manual replies, notes, media, and location pins to customers from the WhatsApp Inbox.",
    category: "MESSAGING",
    dangerLevel: "low",
  },
  {
    key: "send_broadcasts",
    label: "Launch Broadcasts & Campaigns",
    description: "Create and dispatch bulk marketing campaigns and scheduled templates to customer segments.",
    category: "MESSAGING",
    dangerLevel: "high",
  },
  {
    key: "manage_templates",
    label: "Manage Meta Message Templates",
    description: "Create, edit, and submit new WhatsApp templates for Meta approval.",
    category: "MESSAGING",
    dangerLevel: "medium",
  },
  {
    key: "manage_bot_flows",
    label: "Bot & Automation Builder",
    description: "Build visual automation flows, keyword triggers, and interactive response menus.",
    category: "MESSAGING",
    dangerLevel: "medium",
  },
  {
    key: "manage_ai_assistant",
    label: "AI Assistant Configuration",
    description: "Turn the AI Assistant ON/OFF, adjust system prompts, knowledge chunks, and human handoff rules.",
    category: "MESSAGING",
    dangerLevel: "medium",
  },

  // ─── Commerce, Bookings & Financials ───
  {
    key: "view_financials",
    label: "View Financials & Payments",
    description: "Access transaction receipts, verify manual bank deposits, and inspect revenue reports.",
    category: "COMMERCE",
    dangerLevel: "high",
  },
  {
    key: "manage_catalog",
    label: "Manage Products & Catalog",
    description: "Create, edit, and delete store products, dishes, tour packages, or appointment services.",
    category: "COMMERCE",
    dangerLevel: "low",
  },
  {
    key: "manage_orders",
    label: "Manage Orders & Bookings",
    description: "Update order statuses, assign tables, confirm tour slots, and issue vouchers.",
    category: "COMMERCE",
    dangerLevel: "low",
  },

  // ─── Workspace Administration ───
  {
    key: "manage_team_roles",
    label: "Staff & Granular Role Management",
    description: "Invite team members, assign preset roles, and customize individual allow/disallow permissions.",
    category: "ADMIN",
    dangerLevel: "high",
  },
  {
    key: "manage_settings",
    label: "Workspace & API Settings",
    description: "Configure business profile, payment gateways, connected phone numbers, and webhooks.",
    category: "ADMIN",
    dangerLevel: "high",
  },
]

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin / Owner",
  OWNER: "Owner",
  OPS_ADMIN: "Ops / Booking Admin",
  MANAGER: "Manager",
  FINANCE: "Finance Verifier",
  CHAT_AGENT: "Chat Support Agent",
  MARKETING: "Marketing Manager",
  GUIDE: "Field Guide / Staff",
  VIEWER: "Read-Only Viewer",
}

export const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
  OWNER: "bg-purple-100 text-purple-700 border-purple-200",
  OPS_ADMIN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  FINANCE: "bg-amber-100 text-amber-700 border-amber-200",
  CHAT_AGENT: "bg-teal-100 text-teal-700 border-teal-200",
  MARKETING: "bg-rose-100 text-rose-700 border-rose-200",
  GUIDE: "bg-stone-100 text-stone-700 border-stone-200",
  VIEWER: "bg-stone-100 text-stone-600 border-stone-200",
}

/** Default permissions assigned when choosing a preset role */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  SUPER_ADMIN: {
    view_phone_numbers: true,
    export_contacts: true,
    view_all_conversations: true,
    delete_conversations: true,
    send_messages: true,
    send_broadcasts: true,
    manage_templates: true,
    manage_bot_flows: true,
    manage_ai_assistant: true,
    view_financials: true,
    manage_catalog: true,
    manage_orders: true,
    manage_team_roles: true,
    manage_settings: true,
  },
  OWNER: {
    view_phone_numbers: true,
    export_contacts: true,
    view_all_conversations: true,
    delete_conversations: true,
    send_messages: true,
    send_broadcasts: true,
    manage_templates: true,
    manage_bot_flows: true,
    manage_ai_assistant: true,
    view_financials: true,
    manage_catalog: true,
    manage_orders: true,
    manage_team_roles: true,
    manage_settings: true,
  },
  OPS_ADMIN: {
    view_phone_numbers: true,
    export_contacts: true,
    view_all_conversations: true,
    delete_conversations: false,
    send_messages: true,
    send_broadcasts: true,
    manage_templates: true,
    manage_bot_flows: true,
    manage_ai_assistant: true,
    view_financials: true,
    manage_catalog: true,
    manage_orders: true,
    manage_team_roles: false,
    manage_settings: false,
  },
  MANAGER: {
    view_phone_numbers: true,
    export_contacts: true,
    view_all_conversations: true,
    delete_conversations: false,
    send_messages: true,
    send_broadcasts: true,
    manage_templates: true,
    manage_bot_flows: true,
    manage_ai_assistant: true,
    view_financials: true,
    manage_catalog: true,
    manage_orders: true,
    manage_team_roles: false,
    manage_settings: false,
  },
  FINANCE: {
    view_phone_numbers: false, // masked
    export_contacts: false,
    view_all_conversations: false,
    delete_conversations: false,
    send_messages: false,
    send_broadcasts: false,
    manage_templates: false,
    manage_bot_flows: false,
    manage_ai_assistant: false,
    view_financials: true,
    manage_catalog: false,
    manage_orders: true,
    manage_team_roles: false,
    manage_settings: false,
  },
  CHAT_AGENT: {
    view_phone_numbers: false, // masked to prevent client theft
    export_contacts: false,
    view_all_conversations: true,
    delete_conversations: false,
    send_messages: true,
    send_broadcasts: false,
    manage_templates: false,
    manage_bot_flows: false,
    manage_ai_assistant: false,
    view_financials: false,
    manage_catalog: false,
    manage_orders: true,
    manage_team_roles: false,
    manage_settings: false,
  },
  MARKETING: {
    view_phone_numbers: false,
    export_contacts: false,
    view_all_conversations: false,
    delete_conversations: false,
    send_messages: false,
    send_broadcasts: true,
    manage_templates: true,
    manage_bot_flows: true,
    manage_ai_assistant: false,
    view_financials: false,
    manage_catalog: false,
    manage_orders: false,
    manage_team_roles: false,
    manage_settings: false,
  },
  GUIDE: {
    view_phone_numbers: false,
    export_contacts: false,
    view_all_conversations: false,
    delete_conversations: false,
    send_messages: true,
    send_broadcasts: false,
    manage_templates: false,
    manage_bot_flows: false,
    manage_ai_assistant: false,
    view_financials: false,
    manage_catalog: false,
    manage_orders: true,
    manage_team_roles: false,
    manage_settings: false,
  },
  VIEWER: {
    view_phone_numbers: false,
    export_contacts: false,
    view_all_conversations: true,
    delete_conversations: false,
    send_messages: false,
    send_broadcasts: false,
    manage_templates: false,
    manage_bot_flows: false,
    manage_ai_assistant: false,
    view_financials: false,
    manage_catalog: false,
    manage_orders: false,
    manage_team_roles: false,
    manage_settings: false,
  },
}

/**
 * Resolves the full effective permission set for a staff member.
 * Starts with role presets, then applies explicit custom overrides.
 */
export function resolveStaffPermissions(
  role: string,
  customOverrides?: Record<string, boolean> | null,
): Record<string, boolean> {
  const normRole = (role || "CHAT_AGENT").toUpperCase()
  const base = DEFAULT_ROLE_PERMISSIONS[normRole] || DEFAULT_ROLE_PERMISSIONS.CHAT_AGENT
  const result: Record<string, boolean> = { ...base }

  if (customOverrides && typeof customOverrides === "object") {
    for (const [key, val] of Object.entries(customOverrides)) {
      if (typeof val === "boolean") {
        result[key] = val
      }
    }
  }

  // Super admin and Owner always retain administrative safety access
  if (normRole === "SUPER_ADMIN" || normRole === "OWNER") {
    result.view_phone_numbers = true
    result.manage_team_roles = true
    result.manage_settings = true
  }

  return result
}

/**
 * Checks if a user has a specific permission.
 */
export function hasPermission(
  user: { role?: string; permissions?: Record<string, boolean> } | null | undefined,
  permissionKey: string,
): boolean {
  if (!user) return false
  const role = (user.role || "").toUpperCase()
  if (role === "SUPER_ADMIN" || role === "OWNER" || role === "PLATFORM") return true

  const perms = user.permissions || resolveStaffPermissions(user.role || "CHAT_AGENT")
  return perms[permissionKey] === true
}

/**
 * Masks a phone number (e.g. +968 9200 8169 -> +968 9200 ****)
 * when unmasked is false.
 */
export function maskPhoneNumber(phone: string | null | undefined, unmasked = false): string {
  if (!phone) return ""
  if (unmasked) return phone

  const clean = phone.trim()
  if (!clean) return ""

  // Keep country code and first 3-4 digits, mask the rest with ****
  const digits = clean.replace(/\D/g, "")
  if (digits.length <= 4) return "****"

  if (clean.startsWith("+")) {
    // International format e.g. +968 9200 8169
    const ccLen = digits.startsWith("968") ? 3 : digits.length > 10 ? 3 : 2
    const cc = digits.slice(0, ccLen)
    const local = digits.slice(ccLen)
    const visiblePrefix = local.slice(0, Math.min(4, Math.floor(local.length / 2)))
    return `+${cc} ${visiblePrefix} ****`
  }

  // National format e.g. 92008169
  const visible = clean.slice(0, Math.min(4, Math.floor(clean.length / 2)))
  return `${visible} ****`
}
