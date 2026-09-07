import { db } from "@/lib/db"

/**
 * Recomputes a customer's lifetime totals and loyalty tier.
 *
 * `totalBookings` and `totalSpent` were read in five places — the assistant's
 * customer context, campaign segments, the CRM screen and the customer's own
 * account page — and written in none, so every customer looked like a first-time
 * visitor who had never spent anything. Campaign segments built on "customers
 * who have spent over X" therefore matched nobody.
 *
 * Derived from the orders rather than incremented, so it is correct after a
 * cancellation, a refund or a manual edit, and can be re-run to repair history.
 */
export async function refreshCustomerTotals(customerId: string) {
  const orders = await db.order.findMany({
    where: {
      customerId,
      // Money actually taken: a pending or cancelled order is not spend.
      orderStatus: { in: ["CONFIRMED", "COMPLETED"] },
    },
    select: { totalAmount: true },
  })

  const totalBookings = orders.length
  const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0)

  // Tiers follow spend. The thresholds are deliberately round numbers so they
  // can be explained to a customer who asks why they moved.
  const loyaltyTier = totalSpent >= 500 ? "GOLD" : totalSpent >= 200 ? "SILVER" : "BRONZE"

  await db.customer.update({
    where: { id: customerId },
    data: { totalBookings, totalSpent, loyaltyTier },
  })

  return { totalBookings, totalSpent, loyaltyTier }
}
