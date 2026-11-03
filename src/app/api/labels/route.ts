import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"
import { publish } from "@/lib/realtime"
import { z } from "zod"

/**
 * Workspace Label Management API
 * Supports CRUD (Create, Read, Update/Rename, Delete) for workspace tags/labels
 * and cascading updates to all customer tags, conversation labels, and segment rules.
 */

function parseList(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed || trimmed === "[]") return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
      return [trimmed]
    } catch {
      if (trimmed.includes(",")) {
        return trimmed.split(",").map(s => s.trim()).filter(Boolean)
      }
      return [trimmed]
    }
  }
  return []
}

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // 1. Get all declared labels from database
  const declaredLabels = await db.label.findMany({
    where: { tenantId: tenant.tenantId },
    orderBy: { createdAt: "desc" },
  })

  // 2. Aggregate actual usage from conversations & customers
  const [conversations, customers] = await Promise.all([
    db.conversation.findMany({
      where: { tenantId: tenant.tenantId },
      select: { id: true, labels: true },
    }),
    db.customer.findMany({
      where: { tenantId: tenant.tenantId },
      select: { id: true, tags: true },
    }),
  ])

  const counts = new Map<string, { conversations: number; customers: number }>()
  const bump = (label: string, kind: "conversations" | "customers") => {
    const trimmed = label.trim()
    if (!trimmed) return
    const key = trimmed
    const entry = counts.get(key) ?? { conversations: 0, customers: 0 }
    entry[kind]++
    counts.set(key, entry)
  }

  for (const c of conversations) parseList(c.labels).forEach(l => bump(l, "conversations"))
  for (const c of customers) parseList(c.tags).forEach(l => bump(l, "customers"))

  // 3. Ensure any label found on customers/conversations is also registered in db.label
  const declaredMap = new Map(declaredLabels.map(l => [l.name.toLowerCase().trim(), l]))
  const toUpsert: string[] = []

  for (const name of counts.keys()) {
    const lower = name.toLowerCase().trim()
    if (!declaredMap.has(lower) && name.length <= 50) {
      toUpsert.push(name)
    }
  }

  if (toUpsert.length > 0) {
    try {
      await Promise.all(
        toUpsert.map(async name => {
          try {
            const created = await db.label.create({
              data: {
                tenantId: tenant.tenantId,
                name: name.trim(),
                color: "emerald",
              },
            })
            declaredLabels.push(created)
            declaredMap.set(name.toLowerCase().trim(), created)
          } catch {
            // Ignore race condition or existing record
          }
        })
      )
    } catch {
      // Continue even if background register fails
    }
  }

  // 4. Merge all labels with their live counts and colors
  const labelMap = new Map<string, { id?: string; name: string; color: string; customers: number; conversations: number; total: number; createdAt?: Date }>()

  // Populate from declared records
  for (const dl of declaredLabels) {
    const key = dl.name.trim()
    const usage = counts.get(key) ?? { conversations: 0, customers: 0 }
    labelMap.set(key.toLowerCase(), {
      id: dl.id,
      name: dl.name,
      color: dl.color || "emerald",
      customers: usage.customers,
      conversations: usage.conversations,
      total: usage.customers + usage.conversations,
      createdAt: dl.createdAt,
    })
  }

  // Any remaining counts
  for (const [name, usage] of counts.entries()) {
    const lower = name.toLowerCase().trim()
    if (!labelMap.has(lower)) {
      labelMap.set(lower, {
        name,
        color: "emerald",
        customers: usage.customers,
        conversations: usage.conversations,
        total: usage.customers + usage.conversations,
      })
    }
  }

  const result = Array.from(labelMap.values()).sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name)
  )

  return NextResponse.json({ labels: result })
})

const createLabelSchema = z.object({
  action: z.literal("create"),
  name: z.string().trim().min(1, "Name is required").max(50, "Name too long"),
  color: z.string().trim().max(30).optional().default("emerald"),
})

const modifyLabelSchema = z.object({
  action: z.enum(["modify", "update"]),
  id: z.string().optional(),
  oldName: z.string().trim().min(1),
  newName: z.string().trim().min(1).max(50).optional(),
  color: z.string().trim().max(30).optional(),
})

const deleteLabelSchema = z.object({
  action: z.literal("delete"),
  id: z.string().optional(),
  name: z.string().trim().min(1),
})

const assignSchema = z.object({
  action: z.enum(["add", "remove"]).default("add"),
  label: z.string().trim().min(1).max(50),
  conversationId: z.string().min(1).max(100).optional(),
  customerId: z.string().min(1).max(100).optional(),
})

export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const action = body.action || "add"

  // ─── ACTION: CREATE LABEL ───
  if (action === "create") {
    const parsed = createLabelSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid label data" }, { status: 400 })
    }
    const { name, color } = parsed.data

    // Check if label already exists
    const existing = await db.label.findFirst({
      where: {
        tenantId: tenant.tenantId,
        name: { equals: name, mode: "insensitive" },
      },
    })
    if (existing) {
      return NextResponse.json({ error: `Label "${name}" already exists` }, { status: 409 })
    }

    const created = await db.label.create({
      data: {
        tenantId: tenant.tenantId,
        name,
        color: color || "emerald",
      },
    })

    return NextResponse.json({ ok: true, label: created }, { status: 201 })
  }

  // ─── ACTION: MODIFY / RENAME LABEL ───
  if (action === "modify" || action === "update") {
    const parsed = modifyLabelSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid update data" }, { status: 400 })
    }
    const { oldName, newName, color, id } = parsed.data
    const targetNewName = (newName || oldName).trim()

    // If name changed, check uniqueness
    if (targetNewName.toLowerCase() !== oldName.toLowerCase()) {
      const clash = await db.label.findFirst({
        where: {
          tenantId: tenant.tenantId,
          name: { equals: targetNewName, mode: "insensitive" },
        },
      })
      if (clash && clash.id !== id) {
        return NextResponse.json({ error: `A label named "${targetNewName}" already exists` }, { status: 409 })
      }
    }

    // 1. Update Label table
    if (id) {
      await db.label.update({
        where: { id },
        data: {
          name: targetNewName,
          ...(color ? { color } : {}),
        },
      })
    } else {
      await db.label.updateMany({
        where: {
          tenantId: tenant.tenantId,
          name: { equals: oldName, mode: "insensitive" },
        },
        data: {
          name: targetNewName,
          ...(color ? { color } : {}),
        },
      })
    }

    // 2. Cascade rename to Customers if name changed
    if (targetNewName.toLowerCase() !== oldName.toLowerCase()) {
      const lowerOld = oldName.toLowerCase()
      const customers = await db.customer.findMany({
        where: {
          tenantId: tenant.tenantId,
          OR: [
            { tags: { array_contains: oldName } },
            { tags: { array_contains: lowerOld } },
            { tags: { string_contains: oldName } },
          ],
        },
        select: { id: true, tags: true },
      })

      for (const cust of customers) {
        const currentTags = parseList(cust.tags)
        const updatedTags = currentTags.map(t =>
          t.toLowerCase().trim() === lowerOld ? targetNewName : t
        )
        await db.customer.update({
          where: { id: cust.id },
          data: { tags: Array.from(new Set(updatedTags)) },
        })
      }

      // 3. Cascade rename to Conversations
      const conversations = await db.conversation.findMany({
        where: {
          tenantId: tenant.tenantId,
          OR: [
            { labels: { array_contains: oldName } },
            { labels: { array_contains: lowerOld } },
            { labels: { string_contains: oldName } },
          ],
        },
        select: { id: true, labels: true },
      })

      for (const conv of conversations) {
        const currentLabels = parseList(conv.labels)
        const updatedLabels = currentLabels.map(l =>
          l.toLowerCase().trim() === lowerOld ? targetNewName : l
        )
        await db.conversation.update({
          where: { id: conv.id },
          data: { labels: Array.from(new Set(updatedLabels)) },
        })
        publish({
          type: "conversation",
          conversationId: conv.id,
          tenantId: tenant.tenantId,
        })
      }

      // 4. Cascade rename to Segment filterRules
      const segments = await db.segment.findMany({
        where: { tenantId: tenant.tenantId },
        select: { id: true, filterRules: true },
      })
      for (const seg of segments) {
        if (!seg.filterRules) continue
        try {
          const rules = typeof seg.filterRules === "string" ? JSON.parse(seg.filterRules) : seg.filterRules
          if (Array.isArray(rules)) {
            let modified = false
            const nextRules = rules.map((r: any) => {
              if (r.field === "tag" && String(r.value || "").toLowerCase().trim() === lowerOld) {
                modified = true
                return { ...r, value: targetNewName }
              }
              return r
            })
            if (modified) {
              await db.segment.update({
                where: { id: seg.id },
                data: { filterRules: JSON.stringify(nextRules) },
              })
            }
          }
        } catch {
          // ignore malformed rules
        }
      }
    }

    return NextResponse.json({
      ok: true,
      label: { name: targetNewName, color: color || "emerald" },
    })
  }

  // ─── ACTION: DELETE LABEL ───
  if (action === "delete") {
    const parsed = deleteLabelSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid delete request" }, { status: 400 })
    }
    const { name, id } = parsed.data
    const lowerName = name.toLowerCase().trim()

    // 1. Delete record in Label table
    if (id) {
      await db.label.deleteMany({
        where: { id, tenantId: tenant.tenantId },
      })
    } else {
      await db.label.deleteMany({
        where: {
          tenantId: tenant.tenantId,
          name: { equals: name, mode: "insensitive" },
        },
      })
    }

    // 2. Remove tag from Customers
    const customers = await db.customer.findMany({
      where: {
        tenantId: tenant.tenantId,
        OR: [
          { tags: { array_contains: name } },
          { tags: { array_contains: lowerName } },
          { tags: { string_contains: name } },
        ],
      },
      select: { id: true, tags: true },
    })

    for (const cust of customers) {
      const currentTags = parseList(cust.tags)
      const updatedTags = currentTags.filter(t => t.toLowerCase().trim() !== lowerName)
      await db.customer.update({
        where: { id: cust.id },
        data: { tags: updatedTags },
      })
    }

    // 3. Remove label from Conversations
    const conversations = await db.conversation.findMany({
      where: {
        tenantId: tenant.tenantId,
        OR: [
          { labels: { array_contains: name } },
          { labels: { array_contains: lowerName } },
          { labels: { string_contains: name } },
        ],
      },
      select: { id: true, labels: true },
    })

    for (const conv of conversations) {
      const currentLabels = parseList(conv.labels)
      const updatedLabels = currentLabels.filter(l => l.toLowerCase().trim() !== lowerName)
      await db.conversation.update({
        where: { id: conv.id },
        data: { labels: updatedLabels },
      })
      publish({
        type: "conversation",
        conversationId: conv.id,
        tenantId: tenant.tenantId,
      })
    }

    return NextResponse.json({ ok: true, deleted: name })
  }

  // ─── LEGACY ACTION: ASSIGN / UNASSIGN SINGLE CONTACT OR CHAT ───
  const parsedAssign = assignSchema.safeParse(body)
  if (!parsedAssign.success) {
    return NextResponse.json({ error: "Invalid label assignment" }, { status: 400 })
  }
  const { conversationId, customerId, label, action: assignAction } = parsedAssign.data
  if (!conversationId && !customerId) {
    return NextResponse.json({ error: "Specify a conversation or a customer" }, { status: 400 })
  }

  const nextList = (current: string[]) =>
    assignAction === "add"
      ? [...new Set([...current, label])]
      : current.filter(l => l.toLowerCase().trim() !== label.toLowerCase().trim())

  if (conversationId) {
    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, tenantId: tenant.tenantId },
      select: { labels: true },
    })
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    const updated = nextList(parseList(conversation.labels))
    await db.conversation.update({
      where: { id: conversationId },
      data: { labels: updated },
    })
    publish({
      type: "conversation",
      conversationId,
      tenantId: tenant.tenantId,
    })
  }

  if (customerId) {
    const customer = await db.customer.findFirst({
      where: { id: customerId, tenantId: tenant.tenantId },
      select: { tags: true },
    })
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    await db.customer.update({
      where: { id: customerId },
      data: { tags: nextList(parseList(customer.tags)) },
    })
  }

  // Also ensure label exists in db.label if adding
  if (assignAction === "add") {
    try {
      const exists = await db.label.findFirst({
        where: { tenantId: tenant.tenantId, name: { equals: label, mode: "insensitive" } },
      })
      if (!exists) {
        await db.label.create({
          data: {
            tenantId: tenant.tenantId,
            name: label.trim(),
            color: "emerald",
          },
        })
      }
    } catch {
      // non-critical
    }
  }

  return NextResponse.json({ ok: true })
})

export const DELETE = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const name = searchParams.get("name")?.trim()
  const id = searchParams.get("id")?.trim()

  if (!name && !id) {
    return NextResponse.json({ error: "Name or ID required" }, { status: 400 })
  }

  const targetName = name || (id ? (await db.label.findUnique({ where: { id } }))?.name : null)
  if (!targetName) {
    return NextResponse.json({ error: "Label not found" }, { status: 404 })
  }

  // Reuse delete logic
  if (id) {
    await db.label.deleteMany({ where: { id, tenantId: tenant.tenantId } })
  } else {
    await db.label.deleteMany({
      where: { tenantId: tenant.tenantId, name: { equals: targetName, mode: "insensitive" } },
    })
  }

  const lowerName = targetName.toLowerCase().trim()

  const customers = await db.customer.findMany({
    where: {
      tenantId: tenant.tenantId,
      OR: [
        { tags: { array_contains: targetName } },
        { tags: { array_contains: lowerName } },
        { tags: { string_contains: targetName } },
      ],
    },
    select: { id: true, tags: true },
  })

  for (const cust of customers) {
    const currentTags = parseList(cust.tags)
    const updatedTags = currentTags.filter(t => t.toLowerCase().trim() !== lowerName)
    await db.customer.update({
      where: { id: cust.id },
      data: { tags: updatedTags },
    })
  }

  const conversations = await db.conversation.findMany({
    where: {
      tenantId: tenant.tenantId,
      OR: [
        { labels: { array_contains: targetName } },
        { labels: { array_contains: lowerName } },
        { labels: { string_contains: targetName } },
      ],
    },
    select: { id: true, labels: true },
  })

  for (const conv of conversations) {
    const currentLabels = parseList(conv.labels)
    const updatedLabels = currentLabels.filter(l => l.toLowerCase().trim() !== lowerName)
    await db.conversation.update({
      where: { id: conv.id },
      data: { labels: updatedLabels },
    })
    publish({
      type: "conversation",
      conversationId: conv.id,
      tenantId: tenant.tenantId,
    })
  }

  return NextResponse.json({ ok: true, deleted: targetName })
})
