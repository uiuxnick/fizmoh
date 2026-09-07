import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { placeOrder, updateOrderStatus } from "@/lib/restaurant"

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

  const body = await req.json()
  const { id, status, paymentStatus, paymentMethod, paymentRef, note } = body

  if (!id) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
  }

  // If status is being updated
  let updatedOrder
  if (status) {
    updatedOrder = await updateOrderStatus(tenantId, id, status, note)
  }

  // If payment fields being updated
  if (paymentStatus || paymentMethod || paymentRef !== undefined) {
    updatedOrder = await raw.kitchenOrder.update({
      where: { id },
      data: {
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(paymentRef !== undefined ? { paymentRef } : {}),
      },
      include: {
        table: true,
        branch: true,
      },
    })
  }

  return NextResponse.json({ order: updatedOrder, updated: true })
}))
