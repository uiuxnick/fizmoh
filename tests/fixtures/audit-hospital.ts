import { mock } from 'bun:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
let tenant: any = null
let session: any = null
let settings = [{ tenantId: 'a' }]
mock.module('@/lib/tenant', () => ({ currentTenant: () => tenant }))
mock.module('@/lib/auth', () => ({ sessionFromRequest: async () => session }))
mock.module('@/lib/db', () => ({ raw: {
  customer: { findFirst: async ({ where }: any) => where.id === 'customer-a' && where.tenantId === 'a' ? { phone: '+96891234567' } : null },
  hospSettings: { findMany: async () => settings },
} }))
const { canReadPatient } = await import('../../src/lib/hospital-patient-access')
const { resolveHospTenantId } = await import('../../src/lib/hospital')
const request = new NextRequest('https://example.test/api/hospital/patients/identify')
assert.equal(await canReadPatient(request, 'a', '+96891234567'), false)
session = { kind: 'customer', customerId: 'customer-a' }
assert.equal(await canReadPatient(request, 'a', '+968 9123 4567'), true)
assert.equal(await canReadPatient(request, 'a', '+96899999999'), false)
assert.equal(await canReadPatient(request, 'b', '+96891234567'), false)
session = { kind: 'staff', staffId: 'staff-a' }; tenant = { tenantId: 'a', staffId: 'staff-a' }
assert.equal(await canReadPatient(request, 'a', '+96899999999'), true)
assert.equal(await canReadPatient(request, 'b', '+96899999999'), false)
tenant = null; delete process.env.HOSPITAL_PUBLIC_TENANT_ID
assert.equal(await resolveHospTenantId(request), 'a')
settings = [{ tenantId: 'a' }, { tenantId: 'b' }]
await assert.rejects(resolveHospTenantId(request))
process.env.HOSPITAL_PUBLIC_TENANT_ID = 'b'
assert.equal(await resolveHospTenantId(request), 'b')
console.log('Patient access requires verified phone and matching tenant; ambiguous hospital selection fails closed')
