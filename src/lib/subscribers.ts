export type SubscriberChannel = "WHATSAPP" | "FACEBOOK" | "INSTAGRAM"

export interface SubscriberChannelInfo {
  channel: SubscriberChannel
  displayIdentifier: string
  handle?: string
  rawPhone: string
  isSubscribed: boolean
  channelLabel: string
}

/**
 * Resolves the primary channel for a subscriber/customer.
 * Checks explicit channel column, social synthetic phone prefixes, and source.
 */
export function resolveSubscriberChannel(c: {
  channel?: string | null
  phone?: string | null
  source?: string | null
}): SubscriberChannel {
  if (c.channel) {
    const upper = c.channel.toUpperCase()
    if (upper === "WHATSAPP" || upper === "FACEBOOK" || upper === "INSTAGRAM") {
      return upper as SubscriberChannel
    }
  }
  const phone = (c.phone || "").toLowerCase()
  if (phone.startsWith("social:instagram:") || c.source?.toUpperCase() === "INSTAGRAM") {
    return "INSTAGRAM"
  }
  if (
    phone.startsWith("social:facebook:") ||
    phone.startsWith("social:messenger:") ||
    c.source?.toUpperCase() === "FACEBOOK" ||
    c.source?.toUpperCase() === "MESSENGER"
  ) {
    return "FACEBOOK"
  }
  return "WHATSAPP"
}

/**
 * Formats a clean, human-readable identifier for display in tables and headers.
 * Converts raw synthetic social phone values into clean @handles or Messenger usernames.
 */
export function formatDisplayIdentifier(c: {
  channel?: string | null
  phone: string
  socialUsername?: string | null
  socialId?: string | null
  name?: string | null
}): { displayIdentifier: string; handle?: string; rawPhone: string } {
  const ch = resolveSubscriberChannel(c)

  if (ch === "INSTAGRAM") {
    let handle = c.socialUsername?.trim()
    if (!handle && c.name?.startsWith("@")) {
      handle = c.name.trim()
    }
    if (!handle && c.socialId) {
      handle = `@${c.socialId}`
    }
    if (!handle && c.phone.toLowerCase().startsWith("social:instagram:")) {
      handle = `@${c.phone.slice("social:instagram:".length)}`
    }
    if (!handle) {
      handle = c.name ? `@${c.name.toLowerCase().replace(/\s+/g, "_")}` : "@instagram_user"
    }
    if (!handle.startsWith("@")) {
      handle = `@${handle}`
    }
    return { displayIdentifier: handle, handle, rawPhone: c.phone }
  }

  if (ch === "FACEBOOK") {
    let name = c.socialUsername?.trim() || c.name?.trim()
    if (!name && c.socialId) {
      name = `Messenger #${c.socialId.slice(-6)}`
    }
    if (!name && c.phone.toLowerCase().startsWith("social:facebook:")) {
      name = `Facebook #${c.phone.slice("social:facebook:".length).slice(-6)}`
    }
    if (!name) {
      name = "Facebook User"
    }
    return { displayIdentifier: name, handle: name, rawPhone: c.phone }
  }

  // Standard WhatsApp phone number
  return { displayIdentifier: c.phone, rawPhone: c.phone }
}

/**
 * Resolves whether the subscriber is opted in on their active channel.
 */
export function isSubscriberOptedIn(c: {
  channel?: string | null
  phone?: string | null
  source?: string | null
  whatsappOptIn?: boolean | null
  facebookOptIn?: boolean | null
  instagramOptIn?: boolean | null
}): boolean {
  const ch = resolveSubscriberChannel(c)
  if (ch === "INSTAGRAM") {
    return c.instagramOptIn !== false
  }
  if (ch === "FACEBOOK") {
    return c.facebookOptIn !== false
  }
  return c.whatsappOptIn === true
}

/**
 * Returns user-facing brand metadata and labels for each channel.
 */
export function getChannelMeta(channel: SubscriberChannel | "ALL") {
  switch (channel) {
    case "WHATSAPP":
      return {
        label: "WhatsApp",
        fullName: "WhatsApp Business",
        accentColor: "text-emerald-600",
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        borderHover: "hover:border-emerald-500",
        indicatorColor: "bg-emerald-500",
        gradient: "from-emerald-600 to-teal-700",
        placeholder: "+96898821965",
        fieldPrompt: "Phone Number (with country code)",
      }
    case "FACEBOOK":
      return {
        label: "Facebook",
        fullName: "Facebook Messenger",
        accentColor: "text-blue-600",
        badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
        borderHover: "hover:border-blue-500",
        indicatorColor: "bg-[#1877F2]",
        gradient: "from-[#1877F2] to-blue-700",
        placeholder: "e.g. Salim Al-Habsi or PSID",
        fieldPrompt: "Facebook Profile Name or Messenger ID",
      }
    case "INSTAGRAM":
      return {
        label: "Instagram",
        fullName: "Instagram DMs",
        accentColor: "text-pink-600",
        badgeBg: "bg-gradient-to-r from-purple-50 to-pink-50 text-pink-700 border-pink-200",
        borderHover: "hover:border-pink-500",
        indicatorColor: "bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
        gradient: "from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
        placeholder: "@salma_studio",
        fieldPrompt: "Instagram Handle (@username)",
      }
    default:
      return {
        label: "All Channels",
        fullName: "All Channels (Unified)",
        accentColor: "text-stone-700",
        badgeBg: "bg-stone-100 text-stone-700 border-stone-200",
        borderHover: "hover:border-stone-400",
        indicatorColor: "bg-stone-600",
        gradient: "from-slate-800 to-slate-900",
        placeholder: "Search any channel...",
        fieldPrompt: "Contact Identifier",
      }
  }
}
