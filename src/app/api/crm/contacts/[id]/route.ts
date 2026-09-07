import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"

/**
 * Everything known about one contact, in one request.
 *
 * The panel used to answer this by opening four screens and remembering what
 * was on each. What somebody actually wants when they open a contact is the
 * story: when they first appeared, what they bought, what they paid, what they
 * asked, what we promised. So the pieces are gathered here and merged into one
 * timeline, newest first.
 */

export const GET = withErrors(async (
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const { id } = await context.params

  const contact = await db.customer.findFirst({ where: { id } })
  if (!contact) return NextResponse.json({ error: "No such contact" }, { status: 404 })

  const [orders, payments, conversations, appointments, notes, leads] = await Promise.all([
    db.order.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { tour: { select: { name: true } }, slot: { select: { date: true, startTime: true } } },
    }),
    db.payment.findMany({ where: { customerId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.conversation.findMany({
      where: { customerId: id },
      orderBy: { lastMessageAt: "desc" },
      take: 10,
      select: { id: true, status: true, lastMessageAt: true, unreadCount: true, botActive: true },
    }),
    db.appointment.findMany({ where: { customerId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.contactNote.findMany({
      where: { customerId: id },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    db.lead.findMany({ where: { customerId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ])

  // One story rather than six lists. Sorted newest first, because the useful
  // question is almost always "what happened last".
  const timeline = [
    ...orders.map(order => ({
      at: order.createdAt,
      kind: "order" as const,
      title: order.tour?.name ?? "Booking",
      detail: `${order.orderNumber} · ${order.totalAmount.toFixed(3)} · ${order.orderStatus}`,
    })),
    ...payments.map(payment => ({
      at: payment.createdAt,
      kind: "payment" as const,
      title: `${payment.status} payment`,
      detail: `${payment.amount.toFixed(3)} · ${payment.method ?? "—"}`,
    })),
    ...appointments.map(appointment => ({
      at: appointment.createdAt,
      kind: "appointment" as const,
      title: appointment.service ?? "Appointment",
      detail: `${appointment.status}`,
    })),
    ...leads.map(lead => ({
      at: lead.createdAt,
      kind: "lead" as const,
      title: lead.flowName ?? "Enquiry",
      detail: lead.status,
    })),
    ...notes.map(note => ({
      at: note.createdAt,
      kind: "note" as const,
      title: note.kind === "NOTE" ? "Note" : note.kind.toLowerCase(),
      detail: note.body,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime())

  return NextResponse.json({
    contact,
    orders,
    payments,
    conversations,
    appointments,
    notes,
    leads,
    timeline,
    totals: {
      orders: orders.length,
      spent: orders
        .filter(o => o.paymentStatus === "APPROVED" || o.paymentStatus === "PAID")
        .reduce((sum, o) => sum + o.totalAmount, 0),
      open: orders.filter(o => o.orderStatus === "PENDING_PAYMENT").length,
    },
  })
})

/** Editing the sales side of a contact: stage, owner, follow-up, tags. */
export const PATCH = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const existing = await db.customer.findFirst({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: "No such contact" }, { status: 404 })

  const contact = await db.customer.update({
    where: { id: existing.id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).slice(0, 120) || null } : {}),
      ...(body.email !== undefined ? { email: String(body.email).trim() || null } : {}),
      ...(body.stage !== undefined ? { stage: String(body.stage) } : {}),
      ...(body.source !== undefined ? { source: String(body.source) || null } : {}),
      ...(body.ownerStaffId !== undefined ? { ownerStaffId: String(body.ownerStaffId) || null } : {}),
      ...(body.tags !== undefined ? { tags: Array.isArray(body.tags) ? body.tags.map(String) : [] } : {}),
      ...(body.followUpNote !== undefined ? { followUpNote: String(body.followUpNote).slice(0, 500) || null } : {}),
      ...(body.nextFollowUpAt !== undefined
        ? { nextFollowUpAt: body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null }
        : {}),
      ...(body.preferredLang !== undefined ? { preferredLang: String(body.preferredLang) } : {}),
    },
  })

  return NextResponse.json({ contact })
})

/** Writing a note about the person rather than about one conversation. */
export const POST = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const { id } = await context.params
  const session = await sessionFromRequest(request)
  const body = await request.json().catch(() => null)
  const text = String(body?.body ?? "").trim()
  if (!text) return NextResponse.json({ error: "Write something first" }, { status: 400 })

  const contact = await db.customer.findFirst({ where: { id }, select: { id: true } })
  if (!contact) return NextResponse.json({ error: "No such contact" }, { status: 404 })

  const note = await db.contactNote.create({
    data: {
      customerId: contact.id,
      staffId: session?.kind === "staff" ? session.staffId ?? null : null,
      body: text.slice(0, 4000),
      kind: ["NOTE", "CALL", "MEETING", "EMAIL"].includes(String(body?.kind))
        ? String(body.kind)
        : "NOTE",
      pinned: body?.pinned === true,
    },
  })

  // A note is contact: writing one means somebody dealt with this person
  // today, and the "not spoken to in a month" list should reflect that.
  await db.customer.update({
    where: { id: contact.id },
    data: { lastContactAt: new Date() },
  })

  return NextResponse.json({ note }, { status: 201 })
})
