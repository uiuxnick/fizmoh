import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params

  const order = await raw.kitchenOrder.findFirst({
    where: { publicToken: token },
    include: {
      table: { select: { id: true, number: true, area: true, type: true, roomNumber: true } },
      branch: { select: { id: true, name: true, phone: true, whatsapp: true, address: true } },
    },
  })

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  const tenant = await raw.tenant.findUnique({
    where: { id: order.tenantId },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      currency: true,
    },
  })

  let parsedItems = []
  try {
    parsedItems = JSON.parse(order.itemsJson || "[]")
  } catch {}

  let history = []
  try {
    history = JSON.parse(order.statusHistoryJson || "[]")
  } catch {}

  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      roomNumber: order.roomNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      specialNotes: order.specialNotes,
      subtotalAmount: order.subtotalAmount,
      taxAmount: order.taxAmount,
      serviceChargeAmount: order.serviceChargeAmount,
      deliveryChargeAmount: order.deliveryChargeAmount,
      discountAmount: order.discountAmount,
      tipAmount: order.tipAmount,
      totalAmount: order.totalAmount,
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      acceptedAt: order.acceptedAt,
      preparingAt: order.preparingAt,
      readyAt: order.readyAt,
      servedAt: order.servedAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      items: parsedItems,
      history,
    },
    branch: order.branch,
    tenant,
  })
}
