import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/slots-server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"

// ============================================================
// GET /api/customers/[id]
// Returns a unified customer profile:
//   - core customer record
//   - orders (with tour, slot, payments, vouchers)
//   - conversations (with last message + counts)
//   - consentLogs (sorted desc, all opt-in/out events)
//   - reviews (with tour name)
// ============================================================
export const GET = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const { id } = await params

  const customer = await db.customer.findFirst({
    where: { id },
    include: {
      orders: {
        include: {
          tour: true,
          slot: true,
          payments: true,
          vouchers: true,
        },
        orderBy: { createdAt: "desc" },
      },
      conversations: {
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
          assignedStaff: true,
        },
        orderBy: { lastMessageAt: "desc" },
      },
      consentLogs: {
        orderBy: { createdAt: "desc" },
      },
      reviews: {
        include: { tour: true },
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        include: { staff: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: {
        select: { orders: true, conversations: true, reviews: true, consentLogs: true },
      },
    },
  })

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  return NextResponse.json({ customer })
})

// ============================================================
// PATCH /api/customers/[id]
// Body: { tags?, notes?, whatsappOptIn?, emailOptIn?, loyaltyTier?,
//         loyaltyPoints?, preferredLang?, name?, email?, staffId? }
// Updates customer fields. When whatsappOptIn / emailOptIn is changed,
// a ConsentLog entry is automatically created.
// ============================================================
export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  const staffId = session.staffId!

  const { id } = await params
  const body = await request.json()
  const {
    tags, notes, whatsappOptIn, facebookOptIn, instagramOptIn, emailOptIn,
    channel, socialUsername, loyaltyTier, loyaltyPoints, preferredLang, name, email, ...rest
  } = body

  const existing = await db.customer.findFirst({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  const data: any = {}
  if (tags !== undefined) data.tags = Array.isArray(tags) ? JSON.stringify(tags) : tags
  if (notes !== undefined) data.notes = notes
  if (preferredLang !== undefined) data.preferredLang = preferredLang
  if (name !== undefined) data.name = name
  if (email !== undefined) data.email = email
  if (channel !== undefined) data.channel = channel
  if (socialUsername !== undefined) data.socialUsername = socialUsername
  if (loyaltyTier !== undefined) data.loyaltyTier = loyaltyTier
  if (loyaltyPoints !== undefined) data.loyaltyPoints = loyaltyPoints

  // Track consent changes
  const consentLogsToCreate: any[] = []
  if (whatsappOptIn !== undefined && whatsappOptIn !== existing.whatsappOptIn) {
    data.whatsappOptIn = whatsappOptIn
    consentLogsToCreate.push({
      customerId: id,
      channel: "WHATSAPP",
      type: "MARKETING",
      action: whatsappOptIn ? "OPT_IN" : "OPT_OUT",
      source: "ADMIN",
    })
  }
  if (facebookOptIn !== undefined && facebookOptIn !== existing.facebookOptIn) {
    data.facebookOptIn = facebookOptIn
    consentLogsToCreate.push({
      customerId: id,
      channel: "FACEBOOK",
      type: "MARKETING",
      action: facebookOptIn ? "OPT_IN" : "OPT_OUT",
      source: "ADMIN",
    })
  }
  if (instagramOptIn !== undefined && instagramOptIn !== existing.instagramOptIn) {
    data.instagramOptIn = instagramOptIn
    consentLogsToCreate.push({
      customerId: id,
      channel: "INSTAGRAM",
      type: "MARKETING",
      action: instagramOptIn ? "OPT_IN" : "OPT_OUT",
      source: "ADMIN",
    })
  }
  if (emailOptIn !== undefined && emailOptIn !== existing.emailOptIn) {
    data.emailOptIn = emailOptIn
    consentLogsToCreate.push({
      customerId: id,
      channel: "EMAIL",
      type: "MARKETING",
      action: emailOptIn ? "OPT_IN" : "OPT_OUT",
      source: "ADMIN",
    })
  }

  // Copy remaining scalar fields (e.g. preferredCurrency)
  for (const k of Object.keys(rest)) {
    if (["preferredCurrency"].includes(k)) {
      data[k] = rest[k]
    }
  }

  const updated = await db.customer.update({
    where: { id },
    data,
    include: {
      _count: { select: { orders: true, conversations: true } },
    },
  })

  // Create consent logs (after update so the FK is solid)
  for (const cl of consentLogsToCreate) {
    await db.consentLog.create({ data: cl })
  }

  // Audit log entry
  if (staffId) {
    await createAuditLog({
      staffId,
      customerId: id,
      action: "UPDATE_CUSTOMER",
      entity: "CUSTOMER",
      entityId: id,
      details: { tags, notes, whatsappOptIn, emailOptIn, loyaltyTier, loyaltyPoints },
    })
  }

  // Re-fetch consent logs to return the freshly-created ones
  const consentLogs = await db.consentLog.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ customer: updated, consentLogs })
})
