import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/slots-server"
import { withErrors } from "@/lib/api-handler"

// ============================================================
// POST /api/customers/[id]/consent
// Records an explicit opt-in / opt-out event and updates the
// matching boolean flag on the customer record.
// Body: { channel: "WHATSAPP" | "EMAIL", action: "OPT_IN" | "OPT_OUT",
//         type?: "MARKETING" | "TRANSACTIONAL" (default MARKETING),
//         source?: "WEBSITE" | "WHATSAPP" | "ADMIN" (default ADMIN),
//         staffId? }
// ============================================================
export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = await request.json()
  const { channel, action, type = "MARKETING", source = "ADMIN", staffId } = body

  if (!channel || !action) {
    return NextResponse.json({ error: "channel and action are required" }, { status: 400 })
  }
  if (!["WHATSAPP", "EMAIL"].includes(channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 })
  }
  if (!["OPT_IN", "OPT_OUT"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const existing = await db.customer.findFirst({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  const optedIn = action === "OPT_IN"
  const updateField = channel === "WHATSAPP" ? "whatsappOptIn" : "emailOptIn"

  // Update the customer flag + create the consent log in parallel
  const [updated, consentLog] = await Promise.all([
    db.customer.update({
      where: { id },
      data: { [updateField]: optedIn },
    }),
    db.consentLog.create({
      data: { customerId: id, channel, type, action, source },
    }),
  ])

  if (staffId) {
    await createAuditLog({
      staffId,
      customerId: id,
      action: `CONSENT_${action}`,
      entity: "CUSTOMER",
      entityId: id,
      details: { channel, type, source },
    })
  }

  return NextResponse.json({ customer: updated, consentLog }, { status: 201 })
})
