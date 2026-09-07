import crypto from "crypto"
import { db } from "@/lib/db"
import { publish } from "@/lib/realtime"
import { sendTextMessage } from "@/lib/whatsapp"

export interface OrderItemSnapshot {
  id: string
  menuItemId: string
  name: string
  nameAr?: string | null
  price: number
  qty: number
  variant?: {
    id: string
    name: string
    nameAr?: string | null
    price: number
  } | null
  modifiers?: Array<{
    id: string
    name: string
    nameAr?: string | null
    price: number
  }>
  notes?: string | null
  lineTotal: number
}

export interface OrderCalculationResult {
  items: OrderItemSnapshot[]
  subtotalAmount: number
  discountAmount: number
  discountId?: string | null
  discountCode?: string | null
  taxRate: number
  taxAmount: number
  serviceChargeRate: number
  serviceChargeAmount: number
  deliveryFee: number
  tipAmount: number
  totalAmount: number
  currency: string
}

export interface PlaceOrderInput {
  tenantId: string
  branchId?: string | null
  tableId?: string | null
  tableNumber?: string | null
  roomNumber?: string | null
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ROOM_SERVICE"
  customerName?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  deliveryAddress?: string | null
  specialNotes?: string | null
  items: Array<{
    menuItemId: string
    qty: number
    variantId?: string | null
    modifierOptionIds?: string[]
    notes?: string | null
  }>
  discountCode?: string | null
  tipAmount?: number
  paymentMethod?: "CASH" | "CARD_AT_VENUE" | "AMWALPAY_ONLINE" | "PAYMOB_ONLINE" | "ROOM_CHARGE" | null
  paymentStatus?: "UNPAID" | "PENDING" | "PAID"
  paymentRef?: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Branch Helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function ensureDefaultBranch(tenantId: string) {
  let branch = await db.restaurantBranch.findFirst({
    where: { tenantId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  })

  if (!branch) {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true, currency: true },
    })

    const slug = (tenant?.slug || "main").toLowerCase().replace(/[^a-z0-9]/g, "-")
    branch = await db.restaurantBranch.create({
      data: {
        tenantId,
        name: tenant?.name ? `${tenant.name} Main Branch` : "Main Branch",
        nameAr: "الفرع الرئيسي",
        slug: `${slug}-main-${crypto.randomBytes(3).toString("hex")}`,
        isDefault: true,
        businessType: "RESTAURANT",
        currency: tenant?.currency || "OMR",
        taxRate: 0.05, // 5% VAT typical in GCC
        serviceChargeRate: 0,
        deliveryFee: 1.5,
        isActive: true,
      },
    })
  }

  return branch
}

export async function getBranchByIdOrSlug(tenantId: string, idOrSlug: string) {
  return db.restaurantBranch.findFirst({
    where: {
      tenantId,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Table & Cryptographic QR Token Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function createSecureToken(prefix = "rt"): string {
  return `${prefix}_${crypto.randomBytes(16).toString("hex")}`
}

export async function ensureTableToken(tableId: string, tenantId: string): Promise<string> {
  const table = await db.restaurantTable.findFirst({
    where: { id: tableId, tenantId },
    select: { id: true, token: true },
  })
  if (!table) throw new Error("Table not found")
  if (table.token) return table.token

  const newToken = createSecureToken("tab")
  await db.restaurantTable.update({
    where: { id: table.id },
    data: { token: newToken },
  })
  return newToken
}

export async function resolveTableByToken(token: string) {
  const table = await db.restaurantTable.findFirst({
    where: { token },
    include: {
      branch: true,
    },
  })
  if (!table) return null

  const tenant = await db.tenant.findUnique({
    where: { id: table.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      currency: true,
    },
  })

  return { table, branch: table.branch, tenant }
}

// ─────────────────────────────────────────────────────────────────────────────
// Price Calculation & Atomic Order Engine
// ─────────────────────────────────────────────────────────────────────────────

export async function calculateOrder(params: {
  tenantId: string
  branchId?: string | null
  items: Array<{
    menuItemId: string
    qty: number
    variantId?: string | null
    modifierOptionIds?: string[]
    notes?: string | null
  }>
  discountCode?: string | null
  tipAmount?: number
  orderType?: string
}): Promise<OrderCalculationResult> {
  const { tenantId, branchId, items, discountCode, tipAmount = 0, orderType = "DINE_IN" } = params

  if (!items || items.length === 0) {
    throw new Error("Cannot calculate an order with no items")
  }

  // 1. Resolve branch rules
  let branch = branchId
    ? await db.restaurantBranch.findFirst({ where: { id: branchId, tenantId } })
    : null
  if (!branch) {
    branch = await ensureDefaultBranch(tenantId)
  }

  const currency = branch.currency || "OMR"
  const taxRate = branch.taxRate || 0
  const serviceChargeRate = orderType === "DINE_IN" || orderType === "ROOM_SERVICE" ? (branch.serviceChargeRate || 0) : 0
  const deliveryFee = orderType === "DELIVERY" ? (branch.deliveryFee || 0) : 0

  // 2. Fetch all menu items belonging to tenant in one query (multi-tenant safe)
  const itemIds = Array.from(new Set(items.map((i) => i.menuItemId)))
  const menuItems = await db.menuItem.findMany({
    where: {
      id: { in: itemIds },
      tenantId,
      isAvailable: true,
      isSoldOut: false,
    },
  })

  const itemMap = new Map(menuItems.map((m) => [m.id, m]))

  // 3. Process each line item, compute unit price and line total
  const calculatedItems: OrderItemSnapshot[] = []
  let subtotalAmount = 0

  for (const itemInput of items) {
    const menuItem = itemMap.get(itemInput.menuItemId)
    if (!menuItem) {
      throw new Error(`Menu item not found or unavailable: ${itemInput.menuItemId}`)
    }

    const qty = Math.max(1, Math.floor(itemInput.qty || 1))
    let unitPrice = menuItem.salePrice !== null && menuItem.salePrice !== undefined && menuItem.salePrice > 0
      ? menuItem.salePrice
      : menuItem.price

    // Check variant
    let chosenVariant: { id: string; name: string; nameAr?: string | null; price: number } | null = null
    if (menuItem.variantsJson && itemInput.variantId) {
      try {
        const variants = JSON.parse(menuItem.variantsJson) as Array<{ id: string; name: string; nameAr?: string; price: number }>
        const match = variants.find((v) => v.id === itemInput.variantId)
        if (match) {
          chosenVariant = match
          unitPrice = match.price
        }
      } catch {}
    }

    // Check modifiers
    const chosenModifiers: Array<{ id: string; name: string; nameAr?: string | null; price: number }> = []
    if (menuItem.modifiersJson && itemInput.modifierOptionIds && itemInput.modifierOptionIds.length > 0) {
      try {
        const modifierGroups = JSON.parse(menuItem.modifiersJson) as Array<{
          id: string
          name: string
          options: Array<{ id: string; name: string; nameAr?: string; price: number }>
        }>
        const selectedIds = new Set(itemInput.modifierOptionIds)

        for (const group of modifierGroups) {
          for (const opt of group.options || []) {
            if (selectedIds.has(opt.id)) {
              chosenModifiers.push(opt)
              unitPrice += opt.price || 0
            }
          }
        }
      } catch {}
    }

    const lineTotal = Math.round(unitPrice * qty * 1000) / 1000
    subtotalAmount += lineTotal

    calculatedItems.push({
      id: crypto.randomBytes(8).toString("hex"),
      menuItemId: menuItem.id,
      name: menuItem.name,
      nameAr: menuItem.nameAr,
      price: unitPrice,
      qty,
      variant: chosenVariant,
      modifiers: chosenModifiers.length > 0 ? chosenModifiers : undefined,
      notes: itemInput.notes?.trim() || null,
      lineTotal,
    })
  }

  // 4. Validate and apply discount coupon if provided
  let discountAmount = 0
  let discountId: string | null = null
  let appliedCode: string | null = null

  if (discountCode) {
    const cleanCode = discountCode.trim().toUpperCase()
    const discount = await db.restaurantDiscount.findFirst({
      where: {
        tenantId,
        code: cleanCode,
        isActive: true,
      },
    })

    if (discount) {
      const now = new Date()
      const isStarted = !discount.startsAt || discount.startsAt <= now
      const isNotEnded = !discount.endsAt || discount.endsAt >= now

      if (isStarted && isNotEnded) {
        discountId = discount.id
        appliedCode = discount.code
        if (discount.kind === "PERCENT") {
          discountAmount = Math.round(subtotalAmount * (discount.value / 100) * 1000) / 1000
        } else {
          discountAmount = Math.min(subtotalAmount, discount.value)
        }
      }
    }
  }

  const taxableAmount = Math.max(0, subtotalAmount - discountAmount)
  const taxAmount = Math.round(taxableAmount * taxRate * 1000) / 1000
  const serviceChargeAmount = Math.round(subtotalAmount * serviceChargeRate * 1000) / 1000
  const tip = Math.max(0, tipAmount)
  const totalAmount = Math.round((taxableAmount + taxAmount + serviceChargeAmount + deliveryFee + tip) * 1000) / 1000

  return {
    items: calculatedItems,
    subtotalAmount: Math.round(subtotalAmount * 1000) / 1000,
    discountAmount: Math.round(discountAmount * 1000) / 1000,
    discountId,
    discountCode: appliedCode,
    taxRate,
    taxAmount,
    serviceChargeRate,
    serviceChargeAmount,
    deliveryFee: Math.round(deliveryFee * 1000) / 1000,
    tipAmount: Math.round(tip * 1000) / 1000,
    totalAmount,
    currency,
  }
}

export async function placeOrder(input: PlaceOrderInput) {
  const {
    tenantId,
    branchId,
    tableId,
    tableNumber,
    roomNumber,
    orderType,
    customerName,
    customerPhone,
    customerEmail,
    deliveryAddress,
    specialNotes,
    items,
    discountCode,
    tipAmount = 0,
    paymentMethod = "CASH",
    paymentStatus = "UNPAID",
    paymentRef,
  } = input

  // 1. Recalculate everything strictly on the server
  const calculation = await calculateOrder({
    tenantId,
    branchId,
    items,
    discountCode,
    tipAmount,
    orderType,
  })

  // 2. Resolve Table information if tableId given
  let resolvedTableNumber = tableNumber
  let resolvedRoomNumber = roomNumber
  let validTableId = tableId

  if (tableId) {
    const table = await db.restaurantTable.findFirst({
      where: { id: tableId, tenantId },
    })
    if (table) {
      resolvedTableNumber = table.number
      resolvedRoomNumber = table.roomNumber || undefined
      validTableId = table.id
    } else {
      validTableId = null
    }
  }

  // 3. Generate human order number and unguessable public tracking token
  const countToday = await db.kitchenOrder.count({
    where: {
      tenantId,
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  })
  const orderNumber = `#${1001 + countToday}`
  const publicToken = createSecureToken("ord")

  const initialHistory = JSON.stringify([
    { status: "PENDING", timestamp: new Date().toISOString(), note: "Order placed by customer" },
  ])

  // 4. CRM: Link or upsert customer contact if phone provided
  let customerId: string | null = null
  if (customerPhone) {
    try {
      const cleanPhone = customerPhone.replace(/[^\d+]/g, "")
      if (cleanPhone.length >= 7) {
        const customer = await db.customer.upsert({
          where: {
            tenantId_phone: { tenantId, phone: cleanPhone },
          },
          create: {
            tenantId,
            phone: cleanPhone,
            name: customerName?.trim() || null,
            email: customerEmail?.trim() || null,
            whatsappOptIn: true,
          },
          update: {
            name: customerName?.trim() || undefined,
            email: customerEmail?.trim() || undefined,
          },
        })
        customerId = customer.id
      }
    } catch {}
  }

  // 5. Atomic Order Creation
  const order = await db.kitchenOrder.create({
    data: {
      tenantId,
      branchId: branchId || undefined,
      orderNumber,
      publicToken,
      tableId: validTableId,
      tableNumber: resolvedTableNumber || undefined,
      roomNumber: resolvedRoomNumber || undefined,
      orderType,
      customerName: customerName?.trim() || undefined,
      customerPhone: customerPhone?.trim() || undefined,
      customerEmail: customerEmail?.trim() || undefined,
      customerId,
      deliveryAddress: deliveryAddress?.trim() || undefined,
      specialNotes: specialNotes?.trim() || undefined,
      itemsJson: JSON.stringify(calculation.items),
      subtotalAmount: calculation.subtotalAmount,
      discountAmount: calculation.discountAmount,
      taxAmount: calculation.taxAmount,
      serviceChargeAmount: calculation.serviceChargeAmount,
      deliveryChargeAmount: calculation.deliveryFee,
      tipAmount: calculation.tipAmount,
      totalAmount: calculation.totalAmount,
      currency: calculation.currency,
      discountId: calculation.discountId,
      status: "PENDING",
      paymentStatus,
      paymentMethod,
      paymentRef,
      statusHistoryJson: initialHistory,
    },
    include: {
      table: true,
      branch: true,
    },
  })

  // 6. If Dine-in, update table status to OCCUPIED
  if (validTableId && orderType === "DINE_IN") {
    await db.restaurantTable.update({
      where: { id: validTableId },
      data: {
        status: "OCCUPIED",
        currentOrderRef: order.id,
      },
    }).catch(() => {})
  }

  // 7. Publish Realtime SSE Event to Kitchen & Staff
  publish({
    type: "restaurant_order",
    orderId: order.id,
    status: order.status,
    tableNumber: order.tableNumber || undefined,
    orderNumber: order.orderNumber || undefined,
    branchId: order.branchId || undefined,
    totalAmount: order.totalAmount,
    currency: order.currency,
    tenantId,
  })

  // 8. Optionally send WhatsApp Order Confirmation
  if (customerPhone) {
    try {
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, slug: true },
      })
      const businessName = tenant?.name || "Our Restaurant"
      const trackingUrl = `https://app.fizmoh.cloud/order/${publicToken}`
      const locationText = orderType === "DINE_IN" && order.tableNumber
        ? `Table ${order.tableNumber}`
        : orderType === "ROOM_SERVICE" && order.roomNumber
        ? `Room ${order.roomNumber}`
        : orderType

      const messageBody = `🍽️ *${businessName}* - Order Confirmed!
Order ${orderNumber} (${locationText}) has been received by the kitchen.

Total: ${calculation.currency} ${calculation.totalAmount.toFixed(2)}
Track live preparation & order status here:
${trackingUrl}`

      await sendTextMessage(customerPhone, messageBody).catch(() => {})
    } catch {}
  }

  return order
}

export async function updateOrderStatus(
  tenantId: string,
  orderId: string,
  newStatus: "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED",
  note?: string
) {
  const order = await db.kitchenOrder.findFirst({
    where: { id: orderId, tenantId },
  })
  if (!order) throw new Error("Order not found")

  const now = new Date()
  const history: Array<{ status: string; timestamp: string; note?: string }> = order.statusHistoryJson
    ? JSON.parse(order.statusHistoryJson)
    : []
  history.push({ status: newStatus, timestamp: now.toISOString(), note })

  const updateData: Record<string, unknown> = {
    status: newStatus,
    statusHistoryJson: JSON.stringify(history),
  }

  if (newStatus === "ACCEPTED" && !order.acceptedAt) updateData.acceptedAt = now
  if (newStatus === "PREPARING" && !order.preparingAt) updateData.preparingAt = now
  if (newStatus === "READY" && !order.readyAt) updateData.readyAt = now
  if (newStatus === "SERVED" && !order.servedAt) updateData.servedAt = now
  if (newStatus === "COMPLETED" && !order.completedAt) updateData.completedAt = now
  if (newStatus === "CANCELLED" && !order.cancelledAt) updateData.cancelledAt = now

  const updated = await db.kitchenOrder.update({
    where: { id: orderId },
    data: updateData,
    include: { table: true, branch: true },
  })

  // If order completed or cancelled, and was assigned to a table, check if table can become available
  if ((newStatus === "COMPLETED" || newStatus === "CANCELLED") && order.tableId) {
    const otherActiveOrders = await db.kitchenOrder.count({
      where: {
        tableId: order.tableId,
        status: { in: ["PENDING", "ACCEPTED", "PREPARING", "READY"] },
      },
    })
    if (otherActiveOrders === 0) {
      await db.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE", currentOrderRef: null },
      }).catch(() => {})
    }
  }

  // Publish Realtime SSE
  publish({
    type: "restaurant_order",
    orderId: updated.id,
    status: updated.status,
    tableNumber: updated.tableNumber || undefined,
    orderNumber: updated.orderNumber || undefined,
    branchId: updated.branchId || undefined,
    totalAmount: updated.totalAmount,
    currency: updated.currency,
    tenantId,
  })

  // WhatsApp notification if order moves to READY
  if (newStatus === "READY" && updated.customerPhone) {
    try {
      const trackingUrl = updated.publicToken ? `https://app.fizmoh.cloud/order/${updated.publicToken}` : ""
      const readyMsg = `🎉 Your order ${updated.orderNumber || ""} is READY! ${
        updated.orderType === "TAKEAWAY"
          ? "Please collect your order at the counter."
          : "Our team is serving it to you now."
      }\n${trackingUrl}`
      await sendTextMessage(updated.customerPhone, readyMsg).catch(() => {})
    } catch {}
  }

  return updated
}

// ─────────────────────────────────────────────────────────────────────────────
// Waiter Calling & Bill Requests
// ─────────────────────────────────────────────────────────────────────────────

export async function callWaiter(params: {
  tenantId: string
  branchId?: string | null
  tableId?: string | null
  tableNumber?: string | null
  roomNumber?: string | null
  requestType: "WATER" | "BILL" | "CUTLERY" | "CLEAN_TABLE" | "ASSISTANCE" | "OTHER"
  message?: string
}) {
  const { tenantId, branchId, tableId, tableNumber, roomNumber, requestType, message } = params

  // Anti-spam debounce: check for a pending request from the same table/room within 60s
  const oneMinuteAgo = new Date(Date.now() - 60_000)
  const existingPending = await db.restaurantWaiterRequest.findFirst({
    where: {
      tenantId,
      status: "PENDING",
      requestType,
      createdAt: { gte: oneMinuteAgo },
      OR: [
        tableId ? { tableId } : {},
        tableNumber ? { tableNumber } : {},
        roomNumber ? { roomNumber } : {},
      ],
    },
  })

  if (existingPending) {
    return {
      success: true,
      requestId: existingPending.id,
      debounced: true,
      message: "Request already notified to staff",
    }
  }

  const req = await db.restaurantWaiterRequest.create({
    data: {
      tenantId,
      branchId: branchId || undefined,
      tableId: tableId || undefined,
      tableNumber: tableNumber || undefined,
      roomNumber: roomNumber || undefined,
      requestType,
      message: message?.trim() || undefined,
      status: "PENDING",
    },
  })

  // If Bill requested and tableId present, update table status
  if (requestType === "BILL" && tableId) {
    await db.restaurantTable.update({
      where: { id: tableId },
      data: { status: "BILL_REQUESTED" },
    }).catch(() => {})
  }

  // Publish Realtime SSE
  if (requestType === "BILL") {
    publish({
      type: "restaurant_bill_request",
      requestId: req.id,
      tableNumber: tableNumber || roomNumber || "Unknown",
      branchId: branchId || undefined,
      roomNumber: roomNumber || undefined,
      tenantId,
    })
  } else {
    publish({
      type: "restaurant_waiter_call",
      requestId: req.id,
      tableNumber: tableNumber || roomNumber || "Unknown",
      requestType,
      branchId: branchId || undefined,
      roomNumber: roomNumber || undefined,
      message: message || undefined,
      tenantId,
    })
  }

  return { success: true, requestId: req.id, debounced: false }
}

export async function resolveWaiterRequest(
  tenantId: string,
  requestId: string,
  staffId?: string,
  status: "ACCEPTED" | "RESOLVED" | "CANCELLED" = "RESOLVED"
) {
  const req = await db.restaurantWaiterRequest.findFirst({
    where: { id: requestId, tenantId },
  })
  if (!req) throw new Error("Waiter request not found")

  const now = new Date()
  const updated = await db.restaurantWaiterRequest.update({
    where: { id: requestId },
    data: {
      status,
      assignedStaffId: staffId || req.assignedStaffId,
      acceptedAt: status === "ACCEPTED" ? now : req.acceptedAt,
      completedAt: status === "RESOLVED" || status === "CANCELLED" ? now : req.completedAt,
    },
  })

  return updated
}
