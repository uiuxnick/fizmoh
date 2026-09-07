import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withinLimit, limitReached } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"
import {
  discoverFromToken, exchangeCode, fetchNumberDetails, maskToken, registerNumber,
  requestBusinessAppData, subscribeApp, tokenFor, upsertAccount,
} from "@/lib/whatsapp-accounts"
import { createAuditLog } from "@/lib/slots-server"
import { z } from "zod"
import { currentTenant } from "@/lib/tenant"

/**
 * The connected numbers.
 *
 * Quality and the messaging limit are read live from Meta rather than served
 * from the last time somebody looked: a number that has dropped to RED is
 * hours from being restricted, and a stale green light is worse than none.
 */
export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const refresh = new URL(request.url).searchParams.get("refresh") === "1"
  const accounts = await db.whatsAppAccount.findMany({ orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] })

  const rows = await Promise.all(
    accounts.map(async account => {
      let record = account
      if (refresh) {
        const live = await fetchNumberDetails(account.phoneNumberId, tokenFor(account))
        record = await db.whatsAppAccount.update({
          where: { id: account.id },
          data: live.ok
            ? { ...live.details, status: "CONNECTED", lastError: null, syncedAt: new Date() }
            : { status: "ERROR", lastError: live.error ?? "Meta did not answer", syncedAt: new Date() },
        })
      }
      return {
        id: record.id,
        wabaId: record.wabaId,
        phoneNumberId: record.phoneNumberId,
        businessId: record.businessId,
        displayPhone: record.displayPhone,
        verifiedName: record.verifiedName,
        qualityRating: record.qualityRating,
        messagingLimit: record.messagingLimit,
        codeVerification: record.codeVerification,
        platformType: record.platformType,
        throughput: record.throughput,
        status: record.status,
        lastError: record.lastError,
        connectedVia: record.connectedVia,
        isDefault: record.isDefault,
        webhookSubscribed: record.webhookSubscribed,
        registered: record.registered,
        syncedAt: record.syncedAt,
        // Never the token itself in a list. Revealing one is a separate,
        // deliberate request that is written to the audit log.
        tokenPreview: maskToken(tokenFor(record)),
      }
    }),
  )

  return NextResponse.json({ accounts: rows })
})

const manual = z.object({
  mode: z.literal("manual"),
  wabaId: z.string().trim().min(5).max(40),
  phoneNumberId: z.string().trim().min(5).max(40),
  accessToken: z.string().trim().min(20).max(500),
  businessId: z.string().trim().max(40).optional(),
})

const embedded = z.object({
  mode: z.literal("embedded"),
  // Meta normally returns a short-lived signup code. Some valid Wptour
  // configurations return the already-authorized access token instead.
  code: z.string().trim().min(10).max(1000).optional(),
  accessToken: z.string().trim().min(20).max(500).optional(),
  // Optional, because they arrive on a window message that a signup opened in
  // a tab rather than a popup may never deliver. The token is asked what it
  // can reach instead.
  wabaId: z.string().trim().min(5).max(40).optional(),
  phoneNumberId: z.string().trim().min(5).max(40).optional(),
  businessId: z.string().trim().max(40).optional(),
  /**
   * The business connected a number that is still running on their phone.
   *
   * Set by the sign-up dialog, which reports it as
   * FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING rather than the ordinary FINISH.
   * It changes two things: the number must not be registered again, and their
   * existing contacts and history have to be asked for.
   */
  coexistence: z.boolean().optional(),
}).refine(value => !!value.code || !!value.accessToken, {
  message: "A signup code or access token is required",
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can connect WhatsApp numbers" }, { status: 403 })
  }
  // How many WhatsApp numbers a plan allows.
  const room = await withinLimit("numbers")
  if (!room.ok) return limitReached("numbers", room.used, room.cap)

  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const parsed = z.discriminatedUnion("mode", [manual, embedded]).safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) return NextResponse.json({ error: "Incomplete details" }, { status: 400 })
  const body = parsed.data

  let token: string
  let wabaId: string | undefined = body.wabaId
  let phoneNumberId: string | undefined = body.phoneNumberId

  if (body.mode === "embedded") {
    if (body.code) {
      // The code expires in thirty seconds, so nothing else happens first.
      const exchanged = await exchangeCode(body.code)
      if (!exchanged.ok || !exchanged.token) {
        return NextResponse.json({ error: exchanged.error || "That sign-up could not be completed" }, { status: 502 })
      }
      token = exchanged.token
    } else {
      token = body.accessToken!
    }

    const found = await discoverFromToken(token, wabaId, phoneNumberId)
    wabaId = found.wabaId ?? wabaId
    phoneNumberId = found.phoneNumberId ?? phoneNumberId
    if (!wabaId || !phoneNumberId || found.error) {
      return NextResponse.json(
        { error: found.error || "That sign-up finished without a valid number to connect" },
        { status: 400 },
      )
    }
  } else {
    token = body.accessToken
    wabaId = body.wabaId
    phoneNumberId = body.phoneNumberId
  }

  if (!wabaId || !phoneNumberId) {
    return NextResponse.json({ error: "Incomplete details" }, { status: 400 })
  }

  // Checked before it is stored. A token that does not work saved as though it
  // does is a number that appears connected and sends nothing.
  const live = await fetchNumberDetails(phoneNumberId, token)
  if (!live.ok) {
    return NextResponse.json(
      { error: live.error || "Meta would not confirm that number with this token" },
      { status: 400 },
    )
  }

  const subscribed = await subscribeApp(wabaId, token)

  /*
   * A number still living on the owner's phone is already registered.
   *
   * Coexistence connects a number that is running in the WhatsApp Business
   * app, so Meta has registered it long since; calling /register again fails
   * and would report a working connection as broken. Instead we ask for what
   * that phone already holds — their contacts and their conversation history —
   * which Meta only accepts within 24 hours of connecting.
   */
  const coexisting = body.mode === "embedded" && body.coexistence === true

  const registered = coexisting
    ? { ok: true }
    : await registerNumber(phoneNumberId, token)

  const imported = coexisting
    ? await requestBusinessAppData(phoneNumberId, token)
    : null

  const account = await upsertAccount({
    wabaId,
    phoneNumberId,
    businessId: body.businessId,
    token,
    connectedVia: body.mode === "embedded" ? "EMBEDDED_SIGNUP" : "MANUAL",
    webhookSubscribed: subscribed.ok,
    registered: registered.ok,
  })

  await createAuditLog({
    action: "WHATSAPP_ACCOUNT_CONNECTED",
    entity: "WhatsAppAccount",
    entityId: account.id,
    staffId: session.staffId,
    details: `${body.mode} · ${live.details?.displayPhone ?? phoneNumberId}`,
  }).catch(() => {})

  return NextResponse.json({
    account: { id: account.id, displayPhone: account.displayPhone, verifiedName: account.verifiedName },
    // Reported rather than hidden: a number connected without its webhook
    // receives nothing, and finding that out later costs a day.
    webhookSubscribed: subscribed.ok,
    registered: registered.ok,
    /** Coexistence only: their phone keeps working and its data is on its way. */
    coexisting,
    importing: imported ? { contacts: imported.contacts, history: imported.history } : null,
    warnings: [
      ...((subscribed as any).ok ? [] : [`Webhook not subscribed: ${(subscribed as any).error ?? "unknown"}`]),
      ...((registered as any).ok ? [] : [`Number not registered: ${(registered as any).error ?? "unknown"}`]),
      ...(imported?.errors ?? []),
    ],
  }, { status: 201 })
})
