import { db } from "@/lib/db"
import { ORDER_STATUS } from "@/lib/constants"
import { currentTenant } from "@/lib/tenant"

/**
 * Database work that used to live in helpers.ts.
 *
 * helpers.ts is imported by client components for formatting — currency,
 * dates, "3 hours ago" — so anything in it reaches the browser bundle. A
 * Prisma import there, even a dynamic one, is still bundled and throws on load,
 * which took the whole admin panel down with a client-side exception.
 *
 * Seat holds and audit logs are server work; they belong here.
 */
export async function holdSlotSeats(slotId: string, count: number, holdMinutes = 15): Promise<boolean> {
  const tenantId = currentTenant()?.tenantId
  if (!tenantId || !Number.isSafeInteger(count) || count < 1) return false
  return db.$transaction(async tx => {
    const changed = await tx.$executeRaw`UPDATE "Slot" SET "seatsHeld" = "seatsHeld" + ${count} WHERE id = ${slotId} AND "tenantId" = ${tenantId} AND status = 'OPEN' AND capacity - "seatsBooked" - "seatsHeld" >= ${count}`
    if (!changed) return false
    await tx.botSeatHold.create({ data: { tenantId, slotId, remaining: count, expiresAt: new Date(Date.now() + holdMinutes * 60_000) } })
    return true
  })
}

export async function expireBotSeatHolds() {
  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return
  const due = await db.botSeatHold.findMany({ where: { tenantId, remaining: { gt: 0 }, expiresAt: { lte: new Date() } }, take: 100 })
  for (const hold of due) await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Slot" WHERE id = ${hold.slotId} AND "tenantId" = ${tenantId} FOR UPDATE`
    const fresh = await tx.botSeatHold.findFirst({ where: { id: hold.id, tenantId, remaining: { gt: 0 } } })
    if (!fresh) return
    await tx.$executeRaw`UPDATE "Slot" SET "seatsHeld" = GREATEST(0, "seatsHeld" - ${fresh.remaining}) WHERE id = ${hold.slotId} AND "tenantId" = ${tenantId}`
    await tx.botSeatHold.update({ where: { id: fresh.id }, data: { remaining: 0 } })
  })
}

export async function confirmSlotSeats(slotId: string, count: number): Promise<void> {
  const slotOwner = await db.slot.findUnique({ where: { id: slotId }, select: { tenantId: true } })
  if (!slotOwner?.tenantId || !Number.isSafeInteger(count) || count < 1) return
  const tenantId = slotOwner.tenantId
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Slot" WHERE id = ${slotId} AND "tenantId" = ${slotOwner.tenantId} FOR UPDATE`
    const holds = await tx.botSeatHold.findMany({ where: { slotId, tenantId, remaining: { gt: 0 } }, orderBy: { createdAt: "asc" } })
    let consume = count
    for (const hold of holds) {
      const used = Math.min(consume, hold.remaining)
      if (used) await tx.botSeatHold.update({ where: { id: hold.id }, data: { remaining: { decrement: used } } })
      consume -= used
      if (!consume) break
    }
    await tx.$executeRaw`UPDATE "Slot" SET "seatsBooked" = "seatsBooked" + ${count}, "seatsHeld" = GREATEST(0, "seatsHeld" - ${count}), status = CASE WHEN "seatsBooked" + ${count} >= capacity THEN 'FULL' ELSE status END WHERE id = ${slotId} AND "tenantId" = ${slotOwner.tenantId}`
  })
}

export async function createAuditLog(data: {
  staffId?: string
  customerId?: string
  orderId?: string
  action: string
  entity: string
  entityId: string
  details?: any
  reason?: string
}) {
  return db.auditLog.create({ data })
}
