import { mock } from 'bun:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
let queried = false
let tenant: any = null
let session: any = { kind: 'staff', staffId: 'staff-a' }
mock.module('@/lib/api-handler', () => ({ withErrors: (handler: unknown) => handler }))
mock.module('@/lib/tenant', () => ({ currentTenant: () => tenant }))
mock.module('@/lib/auth', () => ({ sessionFromRequest: async () => session }))
mock.module('@/lib/db', () => ({ db: new Proxy({}, { get() { queried = true; throw new Error('Unexpected database access') } }) }))
const { GET } = await import('../../src/app/api/reports/route')
for (const context of [null, { tenantId: 'b', staffId: 'staff-b' }]) {
  tenant = context
  for (const suffix of ['', '?format=csv']) {
    const result = await GET(new NextRequest('https://example.test/api/reports' + suffix), undefined)
    assert.equal(result.status, 403)
    assert.equal(queried, false)
  }
}
console.log('Report tenant guard rejects missing/mismatched workspace before database access')
