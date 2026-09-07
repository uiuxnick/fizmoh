import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"
import { getConfigValue } from "@/lib/app-config"
import { getWhatsAppConfig } from "@/lib/whatsapp"
import { currentModules } from "@/lib/entitlements"

/**
 * What a new business still has to do before the product works for them.
 *
 * Every tenant arrives at an empty workspace with no number connected, and
 * until they connect one nothing they do in the inbox can leave the building.
 * Saying so plainly, with the steps in the order they have to happen, beats a
 * dashboard of zeroes that gives no hint why.
 *
 * Only the first step is a gate. The rest are worth doing and can be done
 * whenever — a business that wants to look around before entering its gateway
 * credentials should be allowed to.
 */
export const GET = withErrors(async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    // The platform's own operator, or a request outside a workspace. There is
    // nothing to onboard.
    return NextResponse.json({ applies: false, complete: true, steps: [] })
  }

  const modules = (await currentModules()) ?? []
  const [whatsapp, businessName, businessPhone, merchantId, tours, staffCount, flows] =
    await Promise.all([
      getWhatsAppConfig(),
      getConfigValue("business_name"),
      getConfigValue("business_phone"),
      getConfigValue("amwalpay_merchant_id"),
      db.tour.count(),
      db.tenantMember.count(),
      db.botFlow.count(),
    ])

  const connected = Boolean(whatsapp.accessToken && whatsapp.phoneNumberId)

  const steps = [
    {
      id: "whatsapp",
      title: "Connect your WhatsApp number",
      body:
        "Sign in with Facebook to bring your WhatsApp Business number across, or paste an " +
        "access token if you already have one. Nothing can be sent or received until this is done.",
      href: "/numbers",
      action: "Connect a number",
      done: connected,
      required: true,
    },
    {
      id: "business",
      title: "Tell customers who you are",
      body:
        "Your name, contact details and a description of the business. This appears on your " +
        "shop and on every confirmation — and it is what your AI assistant knows about you.",
      href: "/settings",
      action: "Fill in your details",
      done: Boolean(businessName && businessPhone),
      required: false,
    },
    ...(modules.includes("PAYMENTS")
      ? [{
          id: "payments",
          title: "Connect your payment gateway",
          body:
            "Your own merchant account, so money from your customers reaches you directly. " +
            "Bookings still work without it — they simply cannot be paid for by card.",
          href: "/settings",
          action: "Add your gateway",
          done: Boolean(merchantId),
          required: false,
        }]
      : []),
    ...(modules.includes("TOURS")
      ? [{
          id: "catalogue",
          title: "Add what you sell",
          body: "Your shop is already live — it just has nothing in it yet.",
          href: "/tours",
          action: "Add your first tour",
          done: tours > 0,
          required: false,
        }]
      : []),
    ...(modules.includes("FLOWS")
      ? [{
          id: "flows",
          title: "Set up an automatic reply",
          body:
            "A greeting, opening hours, a price list — anything that answers while nobody is " +
            "watching the inbox.",
          href: "/automation",
          action: "Build a flow",
          done: flows > 0,
          required: false,
        }]
      : []),
    {
      id: "team",
      title: "Invite your team",
      body: "They each get their own sign-in rather than sharing yours.",
      href: "/staff",
      action: "Invite someone",
      done: staffCount > 1,
      required: false,
    },
  ]

  const blocking = steps.filter(step => step.required && !step.done)

  return NextResponse.json({
    applies: true,
    /** Everything worth doing is done. */
    complete: steps.every(step => step.done),
    /** Nothing stands between them and using the product. */
    ready: blocking.length === 0,
    done: steps.filter(step => step.done).length,
    total: steps.length,
    steps,
  })
})
