import { mock } from 'bun:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
process.env.JWT_SECRET = 'support-route-test-secret-with-at-least-32-chars'
let ticket: any = null
let reads = 0
let replyWhere: any
let aiAction: 'reply' | 'takeover' | 'fail' = 'reply'
let admin: any = null
let tick = Date.now()
const now = () => new Date(++tick)
const replies = [{ id: 'welcome', staffId: 'platform-support-ai', body: 'Welcome', createdAt: new Date() }]
mock.module('@/lib/rate-limit', () => ({ checkSharedRateLimit: async () => ({ allowed: true }), requestIp: () => 'test' }))
mock.module('@/lib/platform-support-ai', () => ({ platformSupportReply: async () => { if (aiAction === 'takeover') { ticket.status = 'IN_PROGRESS'; ticket.assignedStaffId = 'owner' } if (aiAction === 'fail') throw new Error('unavailable'); return 'AI reply' } }))
mock.module('@/lib/api-handler', () => ({ withErrors: (handler: unknown) => handler }))
mock.module('@/app/api/platform/tenants/route', () => ({ requirePlatformAdmin: async () => admin }))
const fake = {
  supportTicket: {
    create: async ({ data }: any) => { ticket = { ...data, assignedStaffId: null }; return ticket },
    findUnique: async () => ticket,
    findUniqueOrThrow: async () => ticket,
    update: async ({ data }: any) => { ticket = { ...ticket, ...data, updatedAt: now() }; return { ...ticket } },
    updateMany: async ({ where, data }: any) => {
      if (where.updatedAt && (ticket.updatedAt.getTime() !== where.updatedAt.getTime() || ticket.status !== where.status || ticket.assignedStaffId !== null)) return { count: 0 };
      if (where.status?.notIn?.includes(ticket.status)) return { count: 0 };
      ticket = { ...ticket, ...data, updatedAt: now() }; return { count: 1 };
    },
    findFirst: async ({ where }: any) => { reads++; assert.equal(where.tenantId, null); assert.equal(where.createdById, ticket.createdById); return where.id === ticket.id ? ticket : null },
  },
  supportTicketReply: {
    findMany: async ({ where }: any) => { replyWhere = where; return [...replies].filter((r: any) => !r.isInternal).reverse() },
    create: async ({ data }: any) => { const reply = { ...data, id: String(replies.length), createdAt: now() }; replies.push(reply); return reply },
  },
  $queryRaw: async () => [],
  $transaction: async (work: (tx: any) => Promise<any>): Promise<any> => work(fake),
}
mock.module('@/lib/db', () => ({ raw: fake, db: fake }))
const { GET, POST } = await import('../../src/app/api/widget/support/route')
const req = (method: string, body?: any, token?: string, origin = 'https://app.fizmoh.cloud') => new NextRequest('https://app.fizmoh.cloud/api/widget/support', { method, headers: { origin, 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
assert.equal((await GET(req('GET'))).status, 401)
assert.equal((await POST(req('POST', { name: 'Visitor' }))).status, 400)
assert.equal((await POST(req('POST', { name: 'Visitor', phone: '+96898314456' }, undefined, 'https://evil.example'))).status, 403)
const repeated = await GET(req('GET', undefined, undefined, 'https://app.fizmoh.cloud, https://app.fizmoh.cloud'))
assert.equal(repeated.status, 401)
assert.equal(repeated.headers.get('access-control-allow-origin'), 'https://app.fizmoh.cloud')
assert.equal((await GET(req('GET', undefined, undefined, 'https://app.fizmoh.cloud, https://evil.example'))).status, 403)
assert.equal(reads, 0)
const started = await POST(req('POST', { name: 'Visitor', phone: '+96898314456' }))
assert.equal(started.status, 201)
const session = await started.json()
assert.ok(session.sessionToken)
assert.equal(ticket.tenantId, null)
assert.equal(ticket.channel, 'LIVE_CHAT')
const response = await GET(req('GET', undefined, session.sessionToken))
assert.equal(response.status, 200)
assert.equal(replyWhere.isInternal, false)
assert.equal(replyWhere.ticketId, ticket.id)
assert.equal((await response.json()).messages[0].direction, 'BOT')
assert.equal((await GET(req('GET', undefined, 'tampered'))).status, 401)
console.log('Support lead validation, private visitor token, platform scope and internal-note exclusion passed')

const send = (content: string) => POST(req('POST', { content }, session.sessionToken))
let sent = await send('How do I contact support?')
assert.equal(sent.status, 200)
assert.equal((await sent.json()).aiResponse.content, 'AI reply')
aiAction = 'takeover'
sent = await send('Another question')
assert.equal((await sent.json()).aiResponse, null, 'An in-flight AI answer must lose to owner takeover')
const { POST: reply } = await import('../../src/app/api/platform/support/tickets/[id]/replies/route')
const ownerReq = (isInternal = false) => req('POST', { body: 'Owner response', isInternal })
assert.equal((await reply(ownerReq(), { params: Promise.resolve({ id: ticket.id }) })).status, 403)
admin = { id: 'owner' }
assert.equal((await reply(ownerReq(true), { params: Promise.resolve({ id: ticket.id }) })).status, 201)
const visible = await (await GET(req('GET', undefined, session.sessionToken))).json()
assert.ok(!visible.messages.some((r: any) => r.content === 'Owner response'))
assert.equal((await reply(ownerReq(), { params: Promise.resolve({ id: ticket.id }) })).status, 201)
assert.equal(ticket.assignedStaffId, 'owner')
assert.equal(ticket.status, 'IN_PROGRESS')
const withOwner = await (await GET(req('GET', undefined, session.sessionToken))).json()
assert.ok(withOwner.messages.some((r: any) => r.content === 'Owner response' && r.direction === 'OUTBOUND'))
ticket.status = 'CLOSED'
assert.equal((await send('closed message')).status, 409)
assert.equal((await reply(ownerReq(), { params: Promise.resolve({ id: ticket.id }) })).status, 409)
console.log('Owner authorization, private notes, visitor delivery, AI takeover race and closed-ticket guards passed')

ticket.status = 'OPEN'; ticket.assignedStaffId = null; aiAction = 'fail'
const previousWarn = console.warn
console.warn = () => {}
const fallback = await send('Please help').finally(() => { console.warn = previousWarn })
assert.equal((await fallback.json()).aiResponse.content.includes('queued'), true)
assert.equal(ticket.status, 'WAITING')
let tenant: any = { tenantId: 'tenant-a', staffId: 'staff-a' }
mock.module('@/lib/tenant', () => ({ currentTenant: () => tenant }))
mock.module('@/lib/auth', () => ({ sessionFromRequest: async () => ({ kind: 'staff', staffId: 'staff-a' }) }))
;(fake.supportTicket as any).findMany = async ({ where, include }: any) => {
  assert.equal(where.tenantId, 'tenant-a')
  assert.equal(include.replies.where.isInternal, false)
  return []
}
const { GET: tenantTickets } = await import('../../src/app/api/support/tickets/route')
assert.equal((await tenantTickets(req('GET'), undefined)).status, 200)
tenant = { tenantId: 'tenant-b', staffId: 'different-staff' }
assert.equal((await tenantTickets(req('GET'), undefined)).status, 401)
console.log('AI failure queues support and tenant ticket reads exclude platform tickets and internal notes')
const { POST: legacySession } = await import('../../src/app/api/widget/session/route')
const legacy = await legacySession(req('POST', { widgetId: 'platform-support', visitorId: 'old-browser', name: 'Visitor', phone: '+96898314456' }))
assert.equal(legacy.status, 400)
assert.match((await legacy.json()).error, /refresh/)
console.log('Cached legacy widget cannot create a platform chat in a fallback customer workspace')
