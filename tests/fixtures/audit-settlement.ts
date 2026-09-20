import { mock } from 'bun:test'
import assert from 'node:assert/strict'
let status = 'PENDING'
let quantity = 2
let failAssignment = false
let writes = 0
const tx = {
  subscriptionInvoice: { updateMany: async () => { if (status !== 'PENDING') return { count: 0 }; status = 'PAID'; return { count: 1 } } },
  tenantAddon: { updateMany: async ({ data }: any) => { if (failAssignment) throw new Error('Simulated write failure'); quantity = data.quantity; writes++; return { count: 1 } } },
}
mock.module('@/lib/db', () => ({ db: {
  subscriptionInvoice: { findUnique: async () => ({ id: 'invoice', reference: 'ADDON-assignment-date', tenantId: 'tenant', subscriptionId: 'sub', status, periodEnd: new Date(), items: [{ quantity: 4 }] }) },
  $transaction: async (work: (client: typeof tx) => unknown) => { const before = status; try { return await work(tx) } catch (error) { status = before; throw error } },
} }))
mock.module('@/lib/tenant', () => ({ PLATFORM: '', withTenant: (_: unknown, work: () => unknown) => work() }))
mock.module('@/lib/amwalpay', () => ({ createPaymentSession: async () => {}, platformAmwalPayConfig: async () => ({}) }))
mock.module('@/lib/paymob', () => ({ createPaymobIntention: async () => {}, platformPaymobConfig: async () => ({}) }))
mock.module('@/lib/notifications', () => ({ sendEmail: async () => {} }))
const { settleInvoice } = await import('../../src/lib/billing')
const payment = { reference: 'ADDON-assignment-date', approved: true }
failAssignment = true
await assert.rejects(settleInvoice(payment))
assert.equal(status, 'PENDING')
assert.equal(quantity, 2)
failAssignment = false
await settleInvoice(payment)
assert.equal(status, 'PAID')
assert.equal(quantity, 4)
await settleInvoice(payment)
assert.equal(writes, 1)
console.log('Settlement retries preserve atomicity and activate the purchased quantity once')
