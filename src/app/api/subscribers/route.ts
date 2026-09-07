import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import {
  resolveSubscriberChannel,
  formatDisplayIdentifier,
  isSubscriberOptedIn,
  type SubscriberChannel,
} from "@/lib/subscribers"

/**
 * Multi-channel subscriber manager (WhatsApp, Facebook, Instagram).
 * Per BRD §6.5.4: central subscriber audience database with channel classification,
 * tags, consent status and conversation history.
 */

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export const GET = withErrors(withModule("BROADCAST", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim()
  const status = searchParams.get("status") // opted_in | opted_out | all
  const tag = searchParams.get("tag")
  const channelFilter = searchParams.get("channel")?.toUpperCase() // ALL | WHATSAPP | FACEBOOK | INSTAGRAM

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
      { socialUsername: { contains: search, mode: "insensitive" } },
      { socialId: { contains: search, mode: "insensitive" } },
    ]
  }

  // Fetch candidate customers
  const customers = await db.customer.findMany({
    where,
    include: { _count: { select: { orders: true, conversations: true } } },
    orderBy: { createdAt: "desc" },
    take: 600,
  })

  // Normalize subscribers with channel data
  const normalized = customers.map(c => {
    const channel = resolveSubscriberChannel(c)
    const { displayIdentifier, handle, rawPhone } = formatDisplayIdentifier(c)
    const isSubscribed = isSubscriberOptedIn(c)
    const tagList = parseTags(c.tags)

    return {
      ...c,
      channel,
      displayIdentifier,
      handle,
      rawPhone,
      isSubscribed,
      tagList,
    }
  })

  // Calculate statistics across all channels before tag & status filtering
  const stats = {
    total: normalized.length,
    optedIn: normalized.filter(c => c.isSubscribed).length,
    optedOut: normalized.filter(c => !c.isSubscribed).length,
    channels: {
      whatsapp: {
        total: normalized.filter(c => c.channel === "WHATSAPP").length,
        optedIn: normalized.filter(c => c.channel === "WHATSAPP" && c.isSubscribed).length,
        optedOut: normalized.filter(c => c.channel === "WHATSAPP" && !c.isSubscribed).length,
      },
      facebook: {
        total: normalized.filter(c => c.channel === "FACEBOOK").length,
        optedIn: normalized.filter(c => c.channel === "FACEBOOK" && c.isSubscribed).length,
        optedOut: normalized.filter(c => c.channel === "FACEBOOK" && !c.isSubscribed).length,
      },
      instagram: {
        total: normalized.filter(c => c.channel === "INSTAGRAM").length,
        optedIn: normalized.filter(c => c.channel === "INSTAGRAM" && c.isSubscribed).length,
        optedOut: normalized.filter(c => c.channel === "INSTAGRAM" && !c.isSubscribed).length,
      },
    },
  }

  // Apply Channel Filter
  let filtered = normalized
  if (channelFilter && ["WHATSAPP", "FACEBOOK", "INSTAGRAM"].includes(channelFilter)) {
    filtered = filtered.filter(c => c.channel === channelFilter)
  }

  // Apply Status Filter
  if (status === "opted_in") {
    filtered = filtered.filter(c => c.isSubscribed)
  } else if (status === "opted_out") {
    filtered = filtered.filter(c => !c.isSubscribed)
  }

  // Apply Tag Filter
  if (tag) {
    filtered = filtered.filter(c => c.tagList.includes(tag))
  }

  const allTags = [...new Set(normalized.flatMap(c => c.tagList))].sort()

  return NextResponse.json({
    subscribers: filtered,
    stats,
    tags: allTags,
  })
}))

/** Bulk consent and tag operations from the subscriber table. */
export const PATCH = withErrors(withModule("BROADCAST", async (request: NextRequest) => {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const ids: string[] = Array.isArray(body.ids) ? body.ids : []
  if (ids.length === 0) return NextResponse.json({ error: "No subscribers selected" }, { status: 400 })

  const action = body.action as "opt_in" | "opt_out" | "add_tag" | "remove_tag"

  if (action === "opt_in" || action === "opt_out") {
    const optIn = action === "opt_in"
    const targetCustomers = await db.customer.findMany({
      where: { id: { in: ids } },
      select: { id: true, channel: true, phone: true, source: true },
    })

    let updatedCount = 0
    for (const cust of targetCustomers) {
      const ch = resolveSubscriberChannel(cust)
      const data: any = {
        optInSource: "STAFF",
        ...(optIn ? { optInAt: new Date(), optOutAt: null, optOutReason: null } : { optOutAt: new Date(), optOutReason: "STAFF" }),
      }

      if (ch === "WHATSAPP") {
        data.whatsappOptIn = optIn
      } else if (ch === "FACEBOOK") {
        data.facebookOptIn = optIn
      } else if (ch === "INSTAGRAM") {
        data.instagramOptIn = optIn
      }

      await db.customer.update({
        where: { id: cust.id },
        data,
      })

      // Log consent audit
      await db.consentLog.create({
        data: {
          customerId: cust.id,
          channel: ch,
          type: "MARKETING",
          action: optIn ? "OPT_IN" : "OPT_OUT",
          source: "STAFF",
        },
      }).catch(() => {})

      updatedCount++
    }

    return NextResponse.json({ updated: updatedCount })
  }

  if (action === "add_tag" || action === "remove_tag") {
    const tag = String(body.tag || "").trim()
    if (!tag) return NextResponse.json({ error: "Tag is required" }, { status: 400 })

    const customers = await db.customer.findMany({ where: { id: { in: ids } }, select: { id: true, tags: true } })
    for (const c of customers) {
      const current = parseTags(c.tags)
      const next = action === "add_tag"
        ? [...new Set([...current, tag])]
        : current.filter(t => t !== tag)
      await db.customer.update({ where: { id: c.id }, data: { tags: JSON.stringify(next) } })
    }
    return NextResponse.json({ updated: customers.length })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}))

/** Adds one subscriber across WhatsApp, Facebook, or Instagram. */
export const POST = withErrors(withModule("BROADCAST", async (request: NextRequest) => {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const channel: SubscriberChannel = body.channel && ["WHATSAPP", "FACEBOOK", "INSTAGRAM"].includes(body.channel.toUpperCase())
    ? body.channel.toUpperCase()
    : "WHATSAPP"

  const optIn = body.optIn !== false && body.whatsappOptIn !== false
  const name = String(body.name || "").trim().slice(0, 120) || null
  const email = String(body.email || "").trim().slice(0, 254) || null
  const tags = Array.isArray(body.tags) ? body.tags.map(String).slice(0, 20) : []

  let phone = String(body.phone || "").replace(/[\s()-]/g, "")
  let socialId: string | null = body.socialId ? String(body.socialId).trim() : null
  let socialUsername: string | null = body.socialUsername ? String(body.socialUsername).trim() : null

  if (channel === "WHATSAPP") {
    if (!/^\+?[1-9]\d{7,14}$/.test(phone)) {
      return NextResponse.json({ error: "Enter a valid phone number with country code (e.g. +96898821965)" }, { status: 400 })
    }
  } else if (channel === "INSTAGRAM") {
    const rawHandle = (socialUsername || name || phone || "").replace(/^@/, "").trim()
    if (!rawHandle) {
      return NextResponse.json({ error: "Enter an Instagram username or handle (e.g. @salma_studio)" }, { status: 400 })
    }
    socialUsername = `@${rawHandle}`
    socialId = socialId || rawHandle
    phone = phone && /^\+?[1-9]\d{7,14}$/.test(phone) ? phone : `social:instagram:${rawHandle}`
  } else if (channel === "FACEBOOK") {
    const fbIdentifier = (socialUsername || name || socialId || phone || "").trim()
    if (!fbIdentifier) {
      return NextResponse.json({ error: "Enter a Facebook profile name or Messenger ID" }, { status: 400 })
    }
    socialUsername = socialUsername || name || fbIdentifier
    socialId = socialId || fbIdentifier.toLowerCase().replace(/\s+/g, "_")
    phone = phone && /^\+?[1-9]\d{7,14}$/.test(phone) ? phone : `social:facebook:${socialId}`
  }

  // Check if subscriber exists by phone or socialId
  const existing = await db.customer.findFirst({
    where: {
      OR: [
        { phone },
        ...(socialId ? [{ socialId }] : []),
      ],
    },
  })

  if (existing) {
    const updated = await db.customer.update({
      where: { id: existing.id },
      data: {
        channel,
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(socialUsername ? { socialUsername } : {}),
        ...(socialId ? { socialId } : {}),
        ...(tags.length ? { tags: JSON.stringify(tags) } : {}),
        ...(channel === "WHATSAPP" && optIn ? { whatsappOptIn: true, optInSource: "STAFF", optInAt: new Date(), optOutAt: null } : {}),
        ...(channel === "FACEBOOK" && optIn ? { facebookOptIn: true, optInSource: "STAFF", optInAt: new Date(), optOutAt: null } : {}),
        ...(channel === "INSTAGRAM" && optIn ? { instagramOptIn: true, optInSource: "STAFF", optInAt: new Date(), optOutAt: null } : {}),
      },
    })
    return NextResponse.json({ subscriber: updated, existed: true })
  }

  const subscriber = await db.customer.create({
    data: {
      channel,
      name,
      phone,
      email,
      socialId,
      socialUsername,
      source: channel,
      preferredLang: body.preferredLang === "ar" ? "ar" : "en",
      tags: tags.length ? JSON.stringify(tags) : undefined,
      whatsappOptIn: channel === "WHATSAPP" ? optIn : false,
      facebookOptIn: channel === "FACEBOOK" ? optIn : true,
      instagramOptIn: channel === "INSTAGRAM" ? optIn : true,
      optInSource: optIn ? "STAFF" : null,
      optInAt: optIn ? new Date() : null,
    },
  })

  // Create audit log for consent
  if (optIn) {
    await db.consentLog.create({
      data: {
        customerId: subscriber.id,
        channel,
        type: "MARKETING",
        action: "OPT_IN",
        source: "STAFF",
      },
    }).catch(() => {})
  }

  return NextResponse.json({ subscriber }, { status: 201 })
}))

/**
 * Removes subscribers or sets opt-out across channels if they have orders/conversations.
 */
export const DELETE = withErrors(withModule("BROADCAST", async (request: NextRequest) => {
  const body = await request.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : []
  if (ids.length === 0) return NextResponse.json({ error: "No subscribers selected" }, { status: 400 })

  const customers = await db.customer.findMany({
    where: { id: { in: ids } },
    select: { id: true, _count: { select: { orders: true, conversations: true } } },
  })

  const removable = customers.filter(c => c._count.orders === 0 && c._count.conversations === 0).map(c => c.id)
  const keep = customers.filter(c => c._count.orders > 0 || c._count.conversations > 0).map(c => c.id)

  if (removable.length > 0) {
    await db.customer.deleteMany({ where: { id: { in: removable } } })
  }
  if (keep.length > 0) {
    await db.customer.updateMany({
      where: { id: { in: keep } },
      data: {
        whatsappOptIn: false,
        facebookOptIn: false,
        instagramOptIn: false,
        emailOptIn: false,
        optOutAt: new Date(),
        optOutReason: "DELETED_BY_STAFF",
      },
    })
  }

  return NextResponse.json({
    deleted: removable.length,
    optedOut: keep.length,
    message: keep.length
      ? `${removable.length} deleted. ${keep.length} kept and opted out — they have bookings or conversations on record.`
      : `${removable.length} deleted.`,
  })
}))
