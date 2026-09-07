import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import { notifyStaff } from "@/lib/realtime"
import { createAuditLog } from "@/lib/slots-server"
import { VISA_STATUSES, DESTINATIONS, PURPOSES, visaEnabled } from "@/lib/visa-flow"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  nationality: z.string().trim().min(2).max(80),
  destination: z.string().trim().min(1).max(80),
  purpose: z.enum(["TOURISM", "BUSINESS", "FAMILY_VISIT", "OTHER"]).default("TOURISM"),
  omanResident: z.boolean().optional(),
  enquiryType: z.enum(["APPLY", "REQUIREMENTS", "PRICING", "STATUS", "CONSULTANT", "OTHER"]).default("APPLY"),
  travellers: z.coerce.number().int().min(1).max(50).default(1),
  arrivalDate: z.coerce.date().optional(),
  stayNights: z.coerce.number().int().min(1).max(365).optional(),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export const GET = withErrors(withModule("VISA", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { nationality: { contains: search, mode: "insensitive" } },
      { destination: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ]
  }

  const enquiries = await db.visaEnquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(200, parseInt(searchParams.get("limit") || "100")),
  })

  return NextResponse.json({
    enquiries,
    statuses: VISA_STATUSES,
    destinations: DESTINATIONS,
    purposes: PURPOSES,
    enabled: await visaEnabled(),
  })
}))

export const POST = withErrors(withModule("VISA", async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid enquiry details" }, { status: 400 })
  const body = parsed.data

  const enquiry = await db.visaEnquiry.create({
    data: {
      reference: `VIS-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      ...body,
      email: body.email || null,
      source: "ADMIN",
      createdById: session.staffId,
    },
  })

  await notifyStaff({
    type: "NEW_BOOKING",
    title: "New visa enquiry",
    message: `${enquiry.reference} · ${enquiry.name} · ${enquiry.nationality}`,
    data: { visaEnquiryId: enquiry.id },
  })
  await createAuditLog({
    staffId: session.staffId,
    action: "CREATE_VISA_ENQUIRY",
    entity: "VISA_ENQUIRY",
    entityId: enquiry.id,
    details: JSON.stringify({ reference: enquiry.reference }),
  })

  return NextResponse.json({ enquiry }, { status: 201 })
}))
