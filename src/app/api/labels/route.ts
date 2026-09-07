import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"
import { z } from "zod"

/**
 * Labels, which are what WhatsApp Business calls groups of contacts.
 *
 * There is no label table. A label is a string in a conversation's `labels`
 * array or a customer's `tags` array, which means the set of labels in use is
 * derived rather than declared — no orphaned label nobody uses, and no way for
 * the list to disagree with reality.
 */

function parseList(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const [conversations, customers] = await Promise.all([
    db.conversation.findMany({ where: { tenantId: tenant.tenantId }, select: { id: true, labels: true } }),
    db.customer.findMany({ where: { tenantId: tenant.tenantId }, select: { id: true, tags: true } }),
  ])

  const counts = new Map<string, { conversations: number; customers: number }>()
  const bump = (label: string, kind: "conversations" | "customers") => {
    const trimmed = label.trim()
    if (!trimmed) return
    const entry = counts.get(trimmed) ?? { conversations: 0, customers: 0 }
    entry[kind]++
    counts.set(trimmed, entry)
  }

  for (const c of conversations) parseList(c.labels).forEach(l => bump(l, "conversations"))
  for (const c of customers) parseList(c.tags).forEach(l => bump(l, "customers"))

  const labels = [...counts.entries()]
    .map(([name, counts]) => ({ name, ...counts, total: counts.conversations + counts.customers }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))

  return NextResponse.json({ labels })
})

const applySchema = z.object({
  conversationId: z.string().min(1).max(100).optional(),
  customerId: z.string().min(1).max(100).optional(),
  label: z.string().trim().min(1).max(40),
  action: z.enum(["add", "remove"]).default("add"),
})

/** Adds or removes one label on a conversation or a customer. */
export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const parsed = applySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid label" }, { status: 400 })
  const { conversationId, customerId, label, action } = parsed.data
  if (!conversationId && !customerId) {
    return NextResponse.json({ error: "Name a conversation or a customer" }, { status: 400 })
  }

  const next = (current: string[]) =>
    action === "add"
      ? [...new Set([...current, label])]
      : current.filter(l => l !== label)

  if (conversationId) {
    const conversation = await db.conversation.findFirst({ where: { id: conversationId, tenantId: tenant.tenantId }, select: { labels: true } })
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    await db.conversation.update({
      where: { id: conversationId },
      data: { labels: JSON.stringify(next(parseList(conversation.labels))) },
    })
  }

  if (customerId) {
    const customer = await db.customer.findFirst({ where: { id: customerId, tenantId: tenant.tenantId }, select: { tags: true } })
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    await db.customer.update({
      where: { id: customerId },
      data: { tags: JSON.stringify(next(parseList(customer.tags))) },
    })
  }

  return NextResponse.json({ ok: true })
})
