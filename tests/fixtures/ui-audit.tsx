import React from 'react'
import { createRoot } from 'react-dom/client'
import CustomersView from '../../src/components/views/customers-view'
import { BotMessagesEditor } from '../../src/components/views/bot-messages-editor'
import BillingView from '../../src/components/views/billing-view'
import { HospitalPhoneVerification } from '../../src/components/hospital-phone-verification'
const customers = Array.from({ length: 55 }, (_, i) => ({ id: `customer-${String(100-i).padStart(3, '0')}`, name: `Audit Customer ${i+1}`, phone: '+96890000000', email: null, loyaltyTier: 'BRONZE', loyaltyPoints: 0, totalBookings: 0, totalSpent: 0, createdAt: new Date().toISOString(), _count: { orders: 0, conversations: 0 } }))
window.fetch = async (input, init) => {
  const url = new URL(String(input), location.origin)
  if (init?.method && init.method !== 'GET') return Response.json({ error: 'Read-only audit fixture' }, { status: 405 })
  if (url.pathname === '/api/customers') {
    const matching = customers.filter(c => c.name.toLowerCase().includes((url.searchParams.get('search') || '').toLowerCase()))
    const start = url.searchParams.has('cursor') ? 50 : 0
    return Response.json({ customers: matching.slice(start, start + 50), total: matching.length, nextCursor: matching.length > start + 50 ? matching[start+49].id : null })
  }
  if (url.pathname === '/api/bot-messages') return Response.json({ messages: [{ key: 'welcome', group: 'Opening', label: 'Welcome line', vars: ['business'], defaultEn: 'Welcome', defaultAr: 'مرحبا', en: '', ar: '' }] })
  if (url.pathname === '/api/hospital/patient-session') return Response.json({ workspace: 'audit-only', phone: null })
  if (url.pathname === '/api/billing/addons') return Response.json({ available: [{ id: 'addon', name: 'Hospital Operations', description: 'Hospital features', priceMonthly: 49000, priceYearly: 490000, currency: 'OMR' }] })
  if (url.pathname === '/api/billing') return Response.json({ billing: null, plans: [{ id: 'plan', name: 'Audit Plan', slug: 'audit', priceMonthly: 19000, priceYearly: 190000, currency: 'OMR', modules: ['SOCIAL_INBOX','DIGITAL_VCARD','LIVE_CHAT'], limits: {} }], invoices: [{ id: 'invoice', reference: 'ADDON-audit', amount: 49000, currency: 'OMR', status: 'PAID', period: 'MONTHLY', createdAt: new Date().toISOString(), subscription: { plan: { name: 'Enterprise' } }, items: [{ description: 'Hospital Operations (Monthly)' }] }] })
  return Response.json({})
}
const mode = new URLSearchParams(location.search).get('view')
createRoot(document.getElementById('root')!).render(mode === 'messages' ? <BotMessagesEditor/> : mode === 'billing' ? <BillingView/> : mode === 'hospital' ? <HospitalPhoneVerification mobile="+96890000000" onVerified={()=>{}}/> : <CustomersView/>)
