import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { appointmentsEnabled } from "@/lib/appointments"
import { visaEnabled } from "@/lib/visa-flow"
import { currentModules, type Module } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route"

/**
 * Which optional sections are switched on as per the tenant's plan.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const modules = await currentModules()
  const has = (module: Module) => modules === null || modules.includes(module)

  return NextResponse.json({
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
    woocommerce: has("WOOCOMMERCE"),
    content: has("CONTENT"),
    reports: has("REPORTS"),
    digital_qr: has("DIGITAL_QR"),
    digital_vcard: has("DIGITAL_VCARD"),
    social_inbox: has("SOCIAL_INBOX"),
    live_chat: has("LIVE_CHAT"),
    modules,
    platform: !currentTenant()?.tenantId && !!(await requirePlatformAdmin(request)),
  })
})
