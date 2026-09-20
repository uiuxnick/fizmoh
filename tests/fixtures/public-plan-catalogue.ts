import { mock } from 'bun:test'
import assert from 'node:assert/strict'
let query: any
mock.module('@/lib/db', () => ({ raw: { plan: { findMany: async (args: any) => { query=args; return [{id:'public',slug:'starter',name:'Starter',priceMonthly:20000,priceYearly:200000,currency:'OMR',modules:[],limits:{staff:7}}] } } } }))
const { getPublicPlanCatalogue } = await import('../../src/lib/public-plan-catalogue')
const { plans } = await getPublicPlanCatalogue()
assert.deepEqual(query.where,{isPublic:true})
assert.equal(plans[0].priceMonthly,20000)
assert.equal(plans[0].limits.staff,7)
assert.equal(plans[0].limits.messagesPerMonth,1000)
assert.ok(!Object.keys(query.select).includes('tenants'))
console.log('Public-only catalogue preserves prices and configured quotas')
