import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"

/**
 * Everything that has happened with one contact, in one list.
 *
 * The history already existed — messages, orders, payments, notes, tasks,
 * appointments — but only as six separate lists on six screens, so nobody
 * could answer "what happened with this person" without stitching it together
 * by eye. Interleaving them is the difference between a database of a customer
 * and knowing the customer.
 *
 * Each source is capped before merging, so one very chatty conversation cannot
 * push every order off the page.
 */

type Entry = {
  id: string
  at: string
  kind: "message" | "order" | "payment" | "note" | "task" | "appointment"
  title: string
  detail?: string
  meta?: Record<string, string | number | null>
}

const PER_SOURCE = 40

export const GET = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { id } = await params
  const customer = await db.customer.findFirst({ where: { id }, select: { id: true } })
  if (!customer) return NextResponse.json({ error: "Contact not found" }, { status: 404 })

  const [messages, orders, payments, notes, tasks, appointments] = await Promise.all([
    db.message.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
      select: { id: true, direction: true, type: true, content: true, status: true, createdAt: true },
    }),
    db.order.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
      select: {
        id: true, orderNumber: true, orderStatus: true, paymentStatus: true,
        totalAmount: true, createdAt: true, tour: { select: { name: true } },
      },
    }),
    db.payment.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
      select: { id: true, method: true, status: true, amount: true, createdAt: true },
    }),
    db.contactNote.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
      select: { id: true, body: true, kind: true, pinned: true, createdAt: true },
    }),
    db.crmTask.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
      select: { id: true, title: true, type: true, dueAt: true, completedAt: true, createdAt: true },
    }),
    db.appointment.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
      select: { id: true, status: true, createdAt: true, scheduledAt: true },
    }).catch(() => []),
  ])

  const entries: Entry[] = []

  for (const m of messages) {
    entries.push({
      id: `msg-${m.id}`,
      at: m.createdAt.toISOString(),
      kind: "message",
      title: m.direction === "INBOUND" ? "Customer messaged" : m.direction === "BOT" ? "Bot replied" : "Team replied",
      // Long messages are trimmed: the timeline is for scanning, and the full
      // text is a click away in the conversation.
      detail: (m.content || "").replace(/\s+/g, " ").slice(0, 180),
      meta: { type: m.type, status: m.status },
    })
  }

  for (const o of orders) {
    entries.push({
      id: `ord-${o.id}`,
      at: o.createdAt.toISOString(),
      kind: "order",
      title: `Order ${o.orderNumber}`,
      detail: o.tour?.name ?? undefined,
      meta: { status: o.orderStatus, payment: o.paymentStatus, amount: o.totalAmount },
    })
  }

  for (const p of payments) {
    entries.push({
      id: `pay-${p.id}`,
      at: p.createdAt.toISOString(),
      kind: "payment",
      title: p.method === "BANK_TRANSFER" ? "Bank transfer" : "Card payment",
      meta: { status: p.status, amount: p.amount },
    })
  }

  for (const n of notes) {
    entries.push({
      id: `note-${n.id}`,
      at: n.createdAt.toISOString(),
      kind: "note",
      title: n.pinned ? "Pinned note" : "Note",
      detail: (n.body || "").slice(0, 300),
      meta: { kind: n.kind },
    })
  }

  for (const t of tasks) {
    entries.push({
      id: `task-${t.id}`,
      at: (t.completedAt ?? t.createdAt).toISOString(),
      kind: "task",
      title: t.completedAt ? `Completed: ${t.title}` : `Task: ${t.title}`,
      meta: { type: t.type, dueAt: t.dueAt ? t.dueAt.toISOString() : null },
    })
  }

  for (const a of appointments as { id: string; status: string; createdAt: Date; scheduledAt: Date | null }[]) {
    entries.push({
      id: `apt-${a.id}`,
      at: a.createdAt.toISOString(),
      kind: "appointment",
      title: "Appointment",
      meta: { status: a.status, scheduledAt: a.scheduledAt ? a.scheduledAt.toISOString() : null },
    })
  }

  entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))

  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit")) || 60, 200)
  return NextResponse.json({ entries: entries.slice(0, limit), total: entries.length })
})
