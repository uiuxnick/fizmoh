import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { sessionFromRequest } from "@/lib/auth"
import { createAuditLog } from "@/lib/slots-server"
import {
  CONFIG_GROUPS,
  isPlatformKey,
  getConfigValues,
  saveConfigValues,
  clearConfigValue,
  isSecretConfigKey,
  isKnownConfigKey,
} from "@/lib/app-config"
import { refreshAmwalPayConfig } from "@/lib/amwalpay"
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route"

function mask(value: string): string {
  if (!value) return ""
  if (value.length <= 8) return "••••"
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}

/** Credentials decide where money and messages go, so this is admin-only. */
async function requireAdmin(request: NextRequest) {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") return null
  const staff = await db.staff.findUnique({ where: { id: session.staffId } })
  if (!staff || !["SUPER_ADMIN", "MANAGER"].includes(staff.role)) return null
  return staff
}

export const GET = withErrors(async (request: NextRequest) => {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Only an administrator can view configuration" }, { status: 403 })
  }

  /*
   * The platform's own credentials are not a customer's business.
   *
   * Our Meta app secret and the merchant account that collects subscription
   * fees decide where our revenue lands and who can send as our app. A
   * workspace administrator is an administrator of their business, not of the
   * installation, so those fields are not shown to them and — below — are not
   * accepted from them either.
   */
  const platformAdmin = !!(await requirePlatformAdmin(request))

  const values = await getConfigValues()
  const groups = CONFIG_GROUPS
    .map(group => ({
      ...group,
      fields: group.fields.filter(field => platformAdmin || !isPlatformKey(field.key)),
    }))
    .filter(group => group.fields.length > 0)
    .map(group => ({
    ...group,
    fields: group.fields.map(field => {
      const entry = values[field.key]
      return {
        ...field,
        set: !!entry.value,
        source: entry.source,
        // Secrets never leave the server; the panel shows a mask so an operator
        // can tell one is present without being able to read it.
        value: field.secret ? undefined : entry.value,
        masked: field.secret ? mask(entry.value) : undefined,
      }
    }),
  }))

  return NextResponse.json({ groups })
})

export const PUT = withErrors(async (request: NextRequest) => {
  const staff = await requireAdmin(request)
  if (!staff) {
    return NextResponse.json({ error: "Only an administrator can change configuration" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  if (typeof body.clear === "string") {
    if (!isKnownConfigKey(body.clear)) {
      return NextResponse.json({ error: "Unknown setting" }, { status: 400 })
    }
    if (isPlatformKey(body.clear) && !(await requirePlatformAdmin(request))) {
      return NextResponse.json(
        { error: "That setting belongs to the platform, not to this workspace." },
        { status: 403 },
      )
    }
    await clearConfigValue(body.clear)
    await refreshAmwalPayConfig()
    await createAuditLog({
      staffId: staff.id,
      action: "CLEAR_CONFIG",
      entity: "SETTING",
      entityId: body.clear,
      details: JSON.stringify({ key: body.clear }),
    })
    return NextResponse.json({ cleared: body.clear })
  }

  const platformAdmin = !!(await requirePlatformAdmin(request))
  const incoming = body as Record<string, string>
  const refused = Object.keys(incoming).filter(key => isPlatformKey(key) && !platformAdmin)
  if (refused.length > 0) {
    return NextResponse.json(
      { error: "Those settings belong to the platform, not to this workspace.", refused },
      { status: 403 },
    )
  }

  const saved = await saveConfigValues(incoming)

  // The gateway config is read synchronously inside the payment webhook, so
  // its snapshot is refreshed here rather than waiting for a cache to expire.
  if (saved.some(key => key.startsWith("amwalpay_"))) {
    await refreshAmwalPayConfig()
  }

  if (saved.length > 0) {
    await createAuditLog({
      staffId: staff.id,
      action: "UPDATE_CONFIG",
      entity: "SETTING",
      entityId: saved.join(","),
      // Which settings changed is recorded; the values never are.
      details: JSON.stringify({ keys: saved, secrets: saved.filter(isSecretConfigKey) }),
    })
  }

  return NextResponse.json({ saved })
})
