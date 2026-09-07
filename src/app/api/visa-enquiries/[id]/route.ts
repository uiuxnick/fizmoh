import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import { createAuditLog } from "@/lib/slots-server"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  nationality: z.string().trim().min(2).max(80).optional(),
  destination: z.string().trim().min(1).max(80).optional(),
  purpose: z.enum(["TOURISM", "BUSINESS", "FAMILY_VISIT", "OTHER"]).optional(),
  omanResident: z.boolean().nullable().optional(),
  travellers: z.coerce.number().int().min(1).max(50).optional(),
  arrivalDate: z.coerce.date().nullable().optional(),
  stayNights: z.coerce.number().int().min(1).max(365).nullable().optional(),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  notes: z.string().trim().max(2000).optional(),
  quotedAmount: z.coerce.number().min(0).max(100000).nullable().optional(),
  // No "rejected": a refusal is the embassy's decision, recorded in the notes.
  // A status implying the agency refused somebody would be wrong, and it is
  // read back to the customer verbatim.
  status: z.enum(["NEW", "DOCS_RECEIVED", "IN_PREPARATION", "SUBMITTED", "APPROVED", "DOCS_REQUIRED", "CLOSED"]).optional(),
  assignedStaffId: z.string().max(100).nullable().optional(),
})

export const GET = withErrors(withModule("VISA", async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params
  const enquiry = await db.visaEnquiry.findUnique({ where: { id }, include: { customer: true } })
  if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 })
  return NextResponse.json({ enquiry })
}))

export const PATCH = withErrors(withModule("VISA", async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const { id } = await context.params
  const existing = await db.visaEnquiry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 })

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid changes" }, { status: 400 })
  const changes = parsed.data

  const enquiry = await db.visaEnquiry.update({
    where: { id },
    data: { ...changes, email: changes.email === "" ? null : changes.email },
  })

  await createAuditLog({
    staffId: session.staffId,
    action: changes.status ? "SET_VISA_STATUS" : "UPDATE_VISA_ENQUIRY",
    entity: "VISA_ENQUIRY",
    entityId: id,
    details: JSON.stringify({ reference: existing.reference, changes: Object.keys(changes) }),
  })

  return NextResponse.json({ enquiry })
}))

export const DELETE = withErrors(withModule("VISA", async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  const staff = await db.staff.findUnique({ where: { id: session.staffId } })
  if (!staff || !["SUPER_ADMIN", "MANAGER"].includes(staff.role)) {
    return NextResponse.json({ error: "Only an administrator can delete an enquiry" }, { status: 403 })
  }

  const { id } = await context.params
  const existing = await db.visaEnquiry.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 })

  await db.visaEnquiry.delete({ where: { id } })
  await createAuditLog({
    staffId: session.staffId,
    action: "DELETE_VISA_ENQUIRY",
    entity: "VISA_ENQUIRY",
    entityId: id,
    details: JSON.stringify({ reference: existing.reference, name: existing.name }),
  })
  return NextResponse.json({ deleted: true })
}))
