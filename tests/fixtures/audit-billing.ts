import { mock } from 'bun:test'
import assert from 'node:assert/strict'
const previous = { id: 'assignment', status: 'ACTIVE', quantity: 2, subscriptionId: 'sub' }
let invoiceData: any
let updateData: any
mock.module('@/lib/db', () => ({ db: {
  tenant: { findUnique: async () => ({ id: 'tenant', name: 'Business' }) },
  planAddon: { findUnique: async () => ({ id: 'addon', name: 'Extra seats', priceMonthly: 5000, priceYearly: 50000, currency: 'OMR' }) },
  subscription: { findFirst: async () => ({ id: 'sub' }) },
  tenantAddon: { findUnique: async () => previous, upsert: async (input: any) => { updateData = input.update; return previous } },
  subscriptionInvoice: { create: async (input: any) => { invoiceData = input.data; return { id: 'invoice' } }, update: async () => ({}) },
} }))
mock.module('@/lib/tenant', () => ({ PLATFORM: '', withTenant: (_: unknown, work: () => unknown) => work() }))
mock.module('@/lib/amwalpay', () => ({ createPaymentSession: async () => { throw new Error('Must not send') }, platformAmwalPayConfig: async () => ({}) }))
mock.module('@/lib/paymob', () => ({ createPaymobIntention: async () => { throw new Error('Must not send') }, platformPaymobConfig: async () => ({}) }))
mock.module('@/lib/app-config', () => ({ getConfigValue: async () => '' }))
mock.module('@/lib/notifications', () => ({ sendEmail: async () => {} }))
const { startAddonCheckout } = await import('../../src/lib/billing')
const result = await startAddonCheckout({ tenantId: 'tenant', addonId: 'addon', quantity: 4, period: 'MONTHLY', origin: 'https://example.test' })
assert.equal(result.ok, false)
assert.deepEqual(updateData, {})
assert.equal(previous.status, 'ACTIVE')
assert.equal(previous.quantity, 2)
assert.equal(invoiceData.amount, 20000)
assert.equal(invoiceData.items.create.quantity, 4)
assert.equal(invoiceData.items.create.unitAmount, 5000)
assert.equal(invoiceData.items.create.description, 'Extra seats (Monthly)')
console.log('Existing entitlement survives abandoned checkout; invoice preserves requested quantity and minor units')
