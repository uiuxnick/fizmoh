import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"

const canRestore = new Set(["OWNER", "SUPER_ADMIN"])
const canExport = new Set(["OWNER", "SUPER_ADMIN", "PLATFORM"])

export const GET = withErrors(async () => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !canExport.has(tenant.role)) return NextResponse.json({ error: "Only workspace administrators can export data" }, { status: 403 })
  const [workspace, customers, conversations, orders, flows, menuCategories, menu, tables, hospitalPatients, hospitalTreatments] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenant.tenantId }, select: { id: true, slug: true, name: true, timezone: true, currency: true, locale: true, createdAt: true } }),
    db.customer.findMany({ where: { tenantId: tenant.tenantId } }),
    db.conversation.findMany({ where: { tenantId: tenant.tenantId }, include: { messages: true } }),
    db.order.findMany({ where: { tenantId: tenant.tenantId } }),
    db.botFlow.findMany({ where: { tenantId: tenant.tenantId } }),
    db.menuCategory.findMany({ where: { tenantId: tenant.tenantId } }),
    db.menuItem.findMany({ where: { tenantId: tenant.tenantId } }),
    db.restaurantTable.findMany({ where: { tenantId: tenant.tenantId } }),
    db.hospPatient.findMany({ where: { tenantId: tenant.tenantId } }),
    db.hospTreatmentRecord.findMany({ where: { tenantId: tenant.tenantId } }),
  ])
  return NextResponse.json({ version: 1, exportedAt: new Date().toISOString(), workspace, customers, conversations, orders, flows, menuCategories, menu, tables, hospitalPatients, hospitalTreatments })
})

/** Guarded, additive restore: it upserts contacts only and never deletes live data. */
export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant(); if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !canRestore.has(tenant.role)) return NextResponse.json({ error: "Only an owner can restore data" }, { status: 403 })
  const contentLength = Number(request.headers.get("content-length") || 0)
  if (contentLength > 50 * 1024 * 1024) return NextResponse.json({ error: "Export payload is too large" }, { status: 413 })
  const body = await request.json().catch(() => null)
  if (body?.version !== 1 || !Array.isArray(body?.customers)) return NextResponse.json({ error: "Unsupported export format" }, { status: 400 })
  let restored = 0
  for (const item of body.customers.slice(0, 10000)) {
    const phone = String(item?.phone ?? "").trim(); if (!phone) continue
    await db.customer.upsert({ where: { tenantId_phone: { tenantId: tenant.tenantId, phone } }, create: { tenantId: tenant.tenantId, phone, name: item.name ? String(item.name) : null, email: item.email ? String(item.email) : null, whatsappOptIn: item.whatsappOptIn !== false }, update: { name: item.name ? String(item.name) : undefined, email: item.email ? String(item.email) : undefined } })
    restored++
  }
  let restoredTables = 0
  for (const item of Array.isArray(body.tables) ? body.tables.slice(0, 500) : []) {
    const number = String(item?.number ?? "").trim(); if (!number) continue
    await db.restaurantTable.upsert({ where: { tenantId_number: { tenantId: tenant.tenantId, number } }, create: { tenantId: tenant.tenantId, number, name: item.name ? String(item.name) : null, capacity: Math.max(1, Number(item.capacity) || 4), section: String(item.section ?? "MAIN") }, update: { name: item.name ? String(item.name) : undefined, capacity: Math.max(1, Number(item.capacity) || 4), section: String(item.section ?? "MAIN") } })
    restoredTables++
  }
  let restoredFlows = 0
  for (const item of Array.isArray(body.flows) ? body.flows.slice(0, 500) : []) {
    if (!item?.name || !item?.trigger) continue
    await db.botFlow.create({ data: { tenantId: tenant.tenantId, name: String(item.name).slice(0, 120), description: item.description ? String(item.description).slice(0, 500) : null, trigger: String(item.trigger), triggerConfig: item.triggerConfig ?? undefined, nodes: item.nodes ?? undefined, edges: item.edges ?? undefined, isActive: false } })
    restoredFlows++
  }
  let restoredConversations = 0
  let restoredMessages = 0
  for (const item of Array.isArray(body.conversations) ? body.conversations.slice(0, 5000) : []) {
    if (!item?.customerPhone) continue
    const customer = await db.customer.findFirst({ where: { tenantId: tenant.tenantId, phone: String(item.customerPhone) }, select: { id: true } })
    const existing = await db.conversation.findUnique({ where: { id: String(item.id) } })
    const conversation = existing || await db.conversation.create({ data: { id: String(item.id), tenantId: tenant.tenantId, customerId: customer?.id ?? null, customerPhone: String(item.customerPhone), customerName: item.customerName ? String(item.customerName) : null, status: String(item.status ?? "OPEN"), botActive: item.botActive !== false, lastMessageAt: item.lastMessageAt ? new Date(item.lastMessageAt) : null, lastMessageText: item.lastMessageText ? String(item.lastMessageText) : null } })
    if (!existing) restoredConversations++
    for (const message of Array.isArray(item.messages) ? item.messages.slice(0, 100) : []) {
      if (!message?.id || await db.message.findUnique({ where: { id: String(message.id) }, select: { id: true } })) continue
      await db.message.create({ data: { id: String(message.id), tenantId: tenant.tenantId, conversationId: conversation.id, customerId: customer?.id ?? null, direction: String(message.direction ?? "INBOUND"), type: String(message.type ?? "TEXT"), content: String(message.content ?? ""), status: String(message.status ?? "SENT"), createdAt: message.createdAt ? new Date(message.createdAt) : undefined } })
      restoredMessages++
    }
  }
  let restoredPatients = 0
  const patientIds = new Map<string, string>()
  for (const item of Array.isArray(body.hospitalPatients) ? body.hospitalPatients.slice(0, 10000) : []) {
    const mrn = String(item?.mrn ?? "").trim(); if (!mrn || !item?.fullName || !item?.mobile) continue
    const patient = await db.hospPatient.upsert({ where: { tenantId_mrn: { tenantId: tenant.tenantId, mrn } }, create: { tenantId: tenant.tenantId, mrn, fullName: String(item.fullName), mobile: String(item.mobile), email: item.email ? String(item.email) : null, dob: item.dob ? new Date(item.dob) : null, gender: item.gender ? String(item.gender) : null }, update: { fullName: String(item.fullName), mobile: String(item.mobile), email: item.email ? String(item.email) : undefined }, select: { id: true } })
    if (item.id) patientIds.set(String(item.id), patient.id)
    restoredPatients++
  }
  let restoredCategories = 0
  const categoryIds = new Map<string, string>()
  for (const item of Array.isArray(body.menuCategories) ? body.menuCategories.slice(0, 1000) : []) {
    if (!item?.name) continue
    const category = await db.menuCategory.create({ data: { tenantId: tenant.tenantId, name: String(item.name).slice(0, 120), description: item.description ? String(item.description).slice(0, 500) : null, displayOrder: Number(item.displayOrder) || 0, isActive: item.isActive !== false } })
    if (item.id) categoryIds.set(String(item.id), category.id)
    restoredCategories++
  }
  let restoredMenuItems = 0
  for (const item of Array.isArray(body.menu) ? body.menu.slice(0, 5000) : []) {
    const categoryId = categoryIds.get(String(item?.categoryId))
    if (!categoryId || !item?.name) continue
    await db.menuItem.create({ data: { tenantId: tenant.tenantId, categoryId, name: String(item.name).slice(0, 160), description: item.description ? String(item.description).slice(0, 1000) : null, price: Math.max(0, Number(item.price) || 0), currency: String(item.currency || "OMR"), imageUrl: item.imageUrl ? String(item.imageUrl) : null, allergens: item.allergens ? String(item.allergens) : null, prepTimeMinutes: Math.max(0, Number(item.prepTimeMinutes) || 15), isAvailable: item.isAvailable !== false, isVegetarian: item.isVegetarian === true, isVegan: item.isVegan === true, isGlutenFree: item.isGlutenFree === true, addonsJson: item.addonsJson ? String(item.addonsJson) : null } })
    restoredMenuItems++
  }
  let restoredTreatments = 0
  for (const item of Array.isArray(body.hospitalTreatments) ? body.hospitalTreatments.slice(0, 10000) : []) {
    const patientId = patientIds.get(String(item?.patientId))
    if (!patientId || !item?.treatmentType) continue
    await db.hospTreatmentRecord.create({ data: { tenantId: tenant.tenantId, patientId, treatmentType: String(item.treatmentType).slice(0, 160), status: String(item.status || "COMPLETED"), notes: item.notes ? String(item.notes).slice(0, 5000) : null, recordedBy: item.recordedBy ? String(item.recordedBy).slice(0, 160) : null, occurredAt: item.occurredAt ? new Date(item.occurredAt) : undefined } })
    restoredTreatments++
  }
  await db.platformAuditEvent.create({ data: { tenantId: tenant.tenantId, actorStaffId: tenant.staffId ?? null, action: "TENANT_RESTORE", entity: "Tenant", entityId: tenant.tenantId, after: { restored, restoredCategories, restoredMenuItems, restoredTreatments } } })
  return NextResponse.json({ restored, restoredTables, restoredFlows, restoredConversations, restoredMessages, restoredPatients, restoredCategories, restoredMenuItems, restoredTreatments })
})
