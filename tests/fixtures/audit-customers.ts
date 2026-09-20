import { mock } from 'bun:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
let query: any
mock.module('@/lib/api-handler', () => ({ withErrors: (handler: unknown) => handler }))
mock.module('@/lib/auth', () => ({ sessionFromRequest: async () => ({ kind: 'staff' }) }))
mock.module('@/lib/tenant', () => ({ currentTenant: () => ({ tenantId: 'tenant-a' }) }))
mock.module('@/lib/entitlements', () => ({ withinLimit: async () => ({ ok: true }), limitReached: () => {} }))
mock.module('@/lib/db', () => ({ db: { customer: {
  findMany: async (input: any) => { query = input; return [{ id: 'z' }, { id: 'y' }, { id: 'x' }] },
  count: async () => 99,
} } }))
const { GET } = await import('../../src/app/api/customers/route')
const response = await GET(new NextRequest('https://example.test/api/customers?limit=2&cursor=zz&tier=GOLD&search=Name'), undefined)
const body = await response.json()
assert.equal(response.status, 200)
assert.equal(query.take, 3)
assert.equal(query.where.tenantId, 'tenant-a')
assert.equal(query.where.id.lt, 'zz')
assert.equal(query.where.loyaltyTier, 'GOLD')
assert.equal(query.where.OR[0].name.mode, 'insensitive')
assert.equal(body.customers.length, 2)
assert.equal(body.nextCursor, 'y')
assert.equal(body.total, 99)
assert.equal((await GET(new NextRequest('https://example.test/api/customers?limit=100000'), undefined)).status, 400)
console.log('Customer pages are bounded and search, cursor and tenant scope remain server-side')
