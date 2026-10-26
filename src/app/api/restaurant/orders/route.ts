import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { placeOrder, updateOrderStatus } from "@/lib/restaurant"

const ORDER_EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "AGENT", "CHAT_AGENT", "PLATFORM"]

export const GET = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ orders: [] })

  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get("status")
  const branchId = searchParams.get("branchId")
  const tableId = searchParams.get("tableId")
  const limit = Math.min(100, Number(searchParams.get("limit")) || 50)

  const orders = await raw.kitchenOrder.findMany({
    where: {
      tenantId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(branchId ? { branchId } : {}),
      ...(tableId ? { tableId } : {}),
    },
    include: {
      table: { select: { id: true, number: true, area: true, type: true, roomNumber: true } },
      branch: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return NextResponse.json({ orders })
}))

export const POST = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  if (tenant.role && !ORDER_EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to create orders" }, { status: 403 })
  }

  const body = await req.json()
  const {
    branchId, tableId, tableNumber, roomNumber, orderType,
    customerName, customerPhone, customerEmail, deliveryAddress,
    items, specialNotes, discountCode, tipAmount, paymentMethod, paymentStatus,
  } = body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Order items cannot be empty" }, { status: 400 })
  }

  // Map incoming items if old format or new format
  const normalizedItems = items.map((item: any) => ({
    menuItemId: item.menuItemId || item.id,
    qty: Number(item.qty || item.quantity) || 1,
    variantId: item.variantId || item.variant?.id || null,
    modifierOptionIds: Array.isArray(item.modifierOptionIds)
      ? item.modifierOptionIds
      : Array.isArray(item.modifiers)
      ? item.modifiers.map((m: any) => m.id)
      : [],
    notes: item.notes || null,
  }))

  const order = await placeOrder({
    tenantId,
    branchId: branchId || null,
    tableId: tableId || null,
    tableNumber: tableNumber ? String(tableNumber) : null,
    roomNumber: roomNumber ? String(roomNumber) : null,
    orderType: orderType || "DINE_IN",
    customerName: customerName ? String(customerName).trim() : null,
    customerPhone: customerPhone ? String(customerPhone).trim() : null,
    customerEmail: customerEmail ? String(customerEmail).trim() : null,
    deliveryAddress: deliveryAddress ? String(deliveryAddress).trim() : null,
    specialNotes: specialNotes ? String(specialNotes).trim() : null,
    items: normalizedItems,
    discountCode: discountCode || null,
    tipAmount: Number(tipAmount) || 0,
    paymentMethod: paymentMethod || "CASH",
    paymentStatus: paymentStatus || "UNPAID",
  })

  return NextResponse.json({ order }, { status: 201 })
}))

export const PUT = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  if (tenant.role && !ORDER_EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to manage orders" }, { status: 403 })
  }

  const body = await req.json()
  const {
    id,
    status,
    paymentStatus,
    paymentMethod,
    paymentRef,
    note,
    customerName,
    customerPhone,
    customerEmail,
    tableNumber,
    roomNumber,
    specialNotes,
    orderType,
    items,
  } = body

  if (!id) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
  }

  // Pre-validate tenant ownership to strictly prevent cross-tenant IDOR updates
  const existingOrder = await raw.kitchenOrder.findFirst({
    where: { id, tenantId },
  })
  if (!existingOrder) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  // If status is being updated via standard transition
  if (status) {
    await updateOrderStatus(tenantId, id, status, note)
  }

  // Calculate new total if items are edited
  let itemsJsonUpdate: string | undefined
  let totalAmountUpdate: number | undefined
  let subtotalUpdate: number | undefined
  if (Array.isArray(items) && items.length > 0) {
    const calculatedSubtotal = items.reduce((sum: number, item: any) => {
      const q = Number(item.qty || item.quantity) || 1
      const p = Number(item.price) || 0
      return sum + (q * p)
    }, 0)
    itemsJsonUpdate = JSON.stringify(items)
    subtotalUpdate = calculatedSubtotal
    totalAmountUpdate = calculatedSubtotal // or include taxes/service charges
  }

  const updatedOrder = await raw.kitchenOrder.update({
    where: { id: existingOrder.id },
    data: {
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(paymentRef !== undefined ? { paymentRef } : {}),
      ...(customerName !== undefined ? { customerName: String(customerName).trim() } : {}),
      ...(customerPhone !== undefined ? { customerPhone: String(customerPhone).trim() } : {}),
      ...(customerEmail !== undefined ? { customerEmail: String(customerEmail).trim() } : {}),
      ...(tableNumber !== undefined ? { tableNumber: String(tableNumber).trim() } : {}),
      ...(roomNumber !== undefined ? { roomNumber: String(roomNumber).trim() } : {}),
      ...(specialNotes !== undefined ? { specialNotes: String(specialNotes).trim() } : {}),
      ...(orderType !== undefined ? { orderType: String(orderType).trim() } : {}),
      ...(itemsJsonUpdate !== undefined ? { itemsJson: itemsJsonUpdate } : {}),
      ...(subtotalUpdate !== undefined ? { subtotalAmount: subtotalUpdate } : {}),
      ...(totalAmountUpdate !== undefined ? { totalAmount: totalAmountUpdate } : {}),
    },
    include: {
      table: true,
      branch: true,
    },
  })

  return NextResponse.json({ order: updatedOrder, updated: true })
}))
