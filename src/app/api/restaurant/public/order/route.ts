import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { placeOrder } from "@/lib/restaurant"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tenantSlug,
      branchSlug,
      tableToken,
      roomNumber,
      orderType,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      specialNotes,
      items,
      discountCode,
      tipAmount,
      paymentMethod,
    } = body

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug is required" }, { status: 400 })
    }

    const tenant = await raw.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    })
    if (!tenant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 })
    }
    const tenantId = tenant.id

    // Resolve branch
    let branchId: string | null = null
    if (branchSlug) {
      const branch = await raw.restaurantBranch.findFirst({
        where: { tenantId, slug: branchSlug, isActive: true },
        select: { id: true },
      })
      if (branch) branchId = branch.id
    }

    // Resolve table if tableToken given
    let tableId: string | null = null
    let tableNumber: string | null = null
    let resolvedRoom = roomNumber || null

    if (tableToken) {
      const table = await raw.restaurantTable.findFirst({
        where: { token: tableToken, tenantId },
      })
      if (table) {
        tableId = table.id
        tableNumber = table.number
        if (!branchId && table.branchId) branchId = table.branchId
        if (table.type === "ROOM" && table.roomNumber) {
          resolvedRoom = table.roomNumber
        }
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

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
      branchId,
      tableId,
      tableNumber,
      roomNumber: resolvedRoom,
      orderType: orderType || (tableId ? "DINE_IN" : "TAKEAWAY"),
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      specialNotes,
      items: normalizedItems,
      discountCode,
      tipAmount: Number(tipAmount) || 0,
      paymentMethod: paymentMethod || "CASH",
      paymentStatus: "UNPAID",
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      publicToken: order.publicToken,
      totalAmount: order.totalAmount,
      currency: order.currency,
      trackingUrl: `/order/${order.publicToken}`,
    }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to place order" },
      { status: 400 }
    )
  }
}
