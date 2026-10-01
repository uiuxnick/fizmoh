import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { appointmentsEnabled } from "@/lib/appointments"
import { visaEnabled } from "@/lib/visa-flow"
import { currentModules, type Module } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * Which optional sections are switched on as per the tenant's plan.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  const isPlatform = tenant?.role === "PLATFORM"
  const modules = await currentModules()
  const has = (module: Module) => isPlatform || (modules ? modules.includes(module) : false)

  const res = NextResponse.json({
    inbox: has("INBOX"),
    crm: has("CRM"),
    staff: has("STAFF"),
    appointments: has("APPOINTMENTS"),
    visa: (await visaEnabled()) && has("VISA"),
    tours: has("TOURS"),
    broadcast: has("BROADCAST"),
    flows: has("FLOWS"),
    ai: has("AI"),
    knowledge: has("KNOWLEDGE"),
    calls: has("CALLS"),
    payments: has("PAYMENTS"),
    restaurant: has("RESTAURANT"),
    hospital: has("HOSPITAL"),
    catalog: has("CATALOG"),
    woocommerce: has("WOOCOMMERCE") || has("ECOMMERCE"),
    ecommerce: has("ECOMMERCE"),
    content: has("CONTENT"),
    reports: has("REPORTS"),
    digital_qr: has("DIGITAL_QR") && has("REPUTATION"),
    reputation: has("REPUTATION") && has("DIGITAL_QR"),
    digital_vcard: has("DIGITAL_VCARD"),
    social_inbox: has("SOCIAL_INBOX"),
    live_chat: has("LIVE_CHAT"),
    corporate: has("CORPORATE"),
    customer_site: has("CUSTOMER_SITE"),
    website_builder: has("WEBSITE"),
    website: has("WEBSITE") || has("CUSTOMER_SITE") || has("TOURS") || has("RESTAURANT"),
    integration: has("INTEGRATION"),
    white_label: has("WHITE_LABEL"),
    training: has("TRAINING"),
    modules,
    platform: !currentTenant()?.tenantId && !!(await requirePlatformAdmin(request)),
  })

  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  res.headers.set("Pragma", "no-cache")
  res.headers.set("Expires", "0")
  return res
})
