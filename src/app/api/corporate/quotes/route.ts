import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { sessionFromRequest } from "@/lib/auth"

export const GET = withErrors(withModule("CORPORATE", async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const search = searchParams.get("search")?.toLowerCase().trim()

  const where: any = {}
  if (tenantId) where.tenantId = tenantId
  if (status && status !== "ALL") where.status = status

  const allLeads = await db.lead.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  })

  // Parse answers and filter/format for corporate RFQ view
  const quotes = allLeads.map(lead => {
    let parsedAnswers: Record<string, any> = {}
    if (typeof lead.answers === "string") {
      try {
        parsedAnswers = JSON.parse(lead.answers)
      } catch {
        parsedAnswers = { raw: lead.answers }
      }
    } else if (lead.answers && typeof lead.answers === "object") {
      parsedAnswers = lead.answers as Record<string, any>
    }

    const customerName =
      parsedAnswers.customer_name ||
      parsedAnswers.name ||
      parsedAnswers.customer_name_phone ||
      lead.customer?.name ||
      "Prospective Client"

    const customerPhone =
      parsedAnswers.phone ||
      parsedAnswers.customer_phone ||
      lead.customer?.phone ||
      ""

    const projectLocation =
      parsedAnswers.project_location ||
      parsedAnswers.location ||
      parsedAnswers.wilayat ||
      "Oman"

    const productType =
      parsedAnswers.required_product ||
      parsedAnswers.product ||
      parsedAnswers.system ||
      parsedAnswers.activity_option ||
      "Architectural Systems"

    const projectDetails =
      parsedAnswers.project_details ||
      parsedAnswers.details ||
      parsedAnswers.scope ||
      ""

    const mediaUploads =
      parsedAnswers.drawings_and_measurements ||
      parsedAnswers.media ||
      parsedAnswers.drawings ||
      ""

    const quotedAmount = parsedAnswers.quotedAmount || null

    return {
      id: lead.id,
      flowName: lead.flowName || "EMADI Architectural RFQ",
      status: lead.status || "NEW",
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      customerName,
      customerPhone,
      projectLocation,
      productType,
      projectDetails,
      mediaUploads,
      notes: lead.notes || "",
      quotedAmount,
      assignedStaffId: lead.assignedStaffId,
      customerId: lead.customerId,
      conversationId: lead.conversationId,
      rawAnswers: parsedAnswers,
    }
  }).filter(q => {
    if (!search) return true
    return (
      q.customerName.toLowerCase().includes(search) ||
      q.customerPhone.toLowerCase().includes(search) ||
      q.projectLocation.toLowerCase().includes(search) ||
      q.productType.toLowerCase().includes(search) ||
      q.projectDetails.toLowerCase().includes(search)
    )
  })

  // Quick stats
  const stats = {
    total: quotes.length,
    new: quotes.filter(q => q.status === "NEW").length,
    reviewing: quotes.filter(q => q.status === "REVIEWING" || q.status === "CONTACTED").length,
    quoted: quotes.filter(q => q.status === "QUOTED" || q.status === "QUALIFIED").length,
    won: quotes.filter(q => q.status === "WON").length,
  }

  return NextResponse.json({ quotes, stats })
}))

export const POST = withErrors(withModule("CORPORATE", async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  const body = await request.json()

  const {
    customerName,
    customerPhone,
    projectLocation,
    productType,
    projectDetails,
    drawings,
    notes,
    quotedAmount,
  } = body

  if (!customerName || !customerPhone) {
    return NextResponse.json({ error: "Customer name and phone are required" }, { status: 400 })
  }

  // Find or create customer
  let customer = await db.customer.findFirst({
    where: { phone: customerPhone, ...(tenantId ? { tenantId } : {}) },
  })

  if (!customer) {
    customer = await db.customer.create({
      data: {
        name: customerName,
        phone: customerPhone,
        tenantId: tenantId || null,
        source: "CORPORATE_RFQ",
      },
    })
  }

  const answers = {
    customer_name: customerName,
    customer_phone: customerPhone,
    project_location: projectLocation || "Muscat, Oman",
    required_product: productType || "Architectural Aluminium & Glass",
    project_details: projectDetails || "",
    drawings_and_measurements: drawings || "",
    quotedAmount: quotedAmount ? Number(quotedAmount) : null,
  }

  const lead = await db.lead.create({
    data: {
      tenantId: tenantId || null,
      customerId: customer.id,
      flowName: "EMADI_CORPORATE_RFQ",
      answers: JSON.stringify(answers),
      status: "NEW",
      notes: notes || null,
    },
  })

  return NextResponse.json({ success: true, leadId: lead.id })
}))

export const PATCH = withErrors(withModule("CORPORATE", async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  const body = await request.json()
  const { id, status, notes, quotedAmount, assignedStaffId } = body

  if (!id) {
    return NextResponse.json({ error: "Lead ID is required" }, { status: 400 })
  }

  const existing = await db.lead.findUnique({ where: { id } })
  if (!existing || (tenantId && existing.tenantId && existing.tenantId !== tenantId)) {
    return NextResponse.json({ error: "Quotation request not found" }, { status: 404 })
  }

  let answersObj: Record<string, any> = {}
  try {
    answersObj = typeof existing.answers === "string" ? JSON.parse(existing.answers) : (existing.answers || {})
  } catch {
    answersObj = {}
  }

  if (quotedAmount !== undefined) {
    answersObj.quotedAmount = quotedAmount ? Number(quotedAmount) : null
  }

  const updated = await db.lead.update({
    where: { id },
    data: {
      status: status || existing.status,
      notes: notes !== undefined ? notes : existing.notes,
      assignedStaffId: assignedStaffId !== undefined ? assignedStaffId : existing.assignedStaffId,
      answers: JSON.stringify(answersObj),
    },
  })

  return NextResponse.json({ success: true, updated })
}))

export const DELETE = withErrors(withModule("CORPORATE", async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Quotation ID required" }, { status: 400 })
  }

  const existing = await db.lead.findUnique({ where: { id } })
  if (!existing || (tenantId && existing.tenantId && existing.tenantId !== tenantId)) {
    return NextResponse.json({ error: "Quotation request not found" }, { status: 404 })
  }

  await db.lead.delete({ where: { id } })
  return NextResponse.json({ success: true, deletedId: id })
}))
