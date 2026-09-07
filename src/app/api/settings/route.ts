import { NextRequest, NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { PLATFORM, currentTenant } from "@/lib/tenant"
import { refreshAmwalPayConfig } from "@/lib/amwalpay"
import { refreshPaymobConfig } from "@/lib/paymob"

export const GET = withErrors(async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const tenantId = tenant.tenantId || PLATFORM
  // Values that must never leave the server. The merchant and terminal IDs are
  // deliberately NOT here: they are account identifiers, printed on receipts,
  // and hiding them left the settings screen unable to show which merchant
  // account a workspace is actually paid into — the fields rendered blank even
  // when configured, which then invited an empty overwrite.
  const secret = new Set([
    "amwalpay_secure_key",
    "paymob_api_key",
    "paymob_hmac_secret",
    "whatsapp_access_token",
    "meta_access_token",
    "smtp_pass",
    "api_secret",
  ])
  const settings = await db.systemSetting.findMany({
    where: { tenantId },
  })
  const settingsObj: Record<string, any> = {}
  for (const s of settings) {
    if (secret.has(s.key)) {
      // Enough to prove a value is stored, and to recognise which one, without
      // shipping a live signing key to a browser.
      if (s.value) {
        settingsObj[`${s.key}_set`] = true
        settingsObj[`${s.key}_hint`] = s.value.slice(-4)
      }
      continue
    }
    settingsObj[s.key] = s.type === "BOOLEAN" ? s.value === "true" : s.type === "NUMBER" ? parseFloat(s.value) : s.type === "JSON" ? JSON.parse(s.value) : s.value
  }

  if (tenantId && tenantId !== PLATFORM) {
    const tenant = await raw.tenant.findUnique({ where: { id: tenantId } })
    if (tenant) {
      settingsObj.custom_domain = settingsObj.custom_domain || tenant.customDomain || ""
      settingsObj.workspace_slug = tenant.slug
      settingsObj.tenant_name = tenant.name
      settingsObj.website_logo_url = settingsObj.website_logo_url || tenant.logoUrl || ""
      settingsObj.website_primary_color = settingsObj.website_primary_color || "#0d9488"
    }
  }

  return NextResponse.json({ settings: settingsObj })
})

export const PUT = withErrors(async (request: NextRequest) => {
  const body = await request.json()
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can update settings" }, { status: 403 })
  }
  const tenantId = tenant.tenantId || PLATFORM
  const sensitive = new Set([
    "amwalpay_secure_key",
    "amwalpay_merchant_id",
    "amwalpay_terminal_id",
    "paymob_api_key",
    "paymob_hmac_secret",
    "whatsapp_access_token",
    "meta_access_token",
    "smtp_pass",
    "api_secret",
  ])
  const protectedWebsiteCode = new Set(["seo_head_code", "seo_body_code", "seo_footer_code"])

  // Normalize custom domain if present in body
  if (body.custom_domain !== undefined || body.customDomain !== undefined) {
    const domainVal = String(body.custom_domain ?? body.customDomain ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    if (tenantId && tenantId !== PLATFORM) {
      if (domainVal) {
        const existing = await raw.tenant.findFirst({
          where: { customDomain: domainVal, id: { not: tenantId } },
        })
        if (existing) {
          return NextResponse.json({ error: `Domain '${domainVal}' is already connected to another workspace.` }, { status: 400 })
        }
      }
      await raw.tenant.update({
        where: { id: tenantId },
        data: {
          customDomain: domainVal || null,
          ...(body.website_logo_url ? { logoUrl: String(body.website_logo_url) } : {}),
          ...(body.currency ? { currency: String(body.currency) } : {}),
        },
      })
    }
    body.custom_domain = domainVal
  }

  for (const [key, value] of Object.entries(body)) {
    if (!/^[a-zA-Z0-9_.-]{1,120}$/.test(key)) return NextResponse.json({ error: "Invalid setting key" }, { status: 400 })
    if (protectedWebsiteCode.has(key)) {
      if (tenant.role && !["OWNER", "SUPER_ADMIN"].includes(tenant.role)) {
        return NextResponse.json({ error: "Only the workspace owner or super admin can change website custom code" }, { status: 403 })
      }
      if (typeof value !== "string" || value.length > 20000) {
        return NextResponse.json({ error: "Custom code must be text and no longer than 20,000 characters" }, { status: 400 })
      }
    }
    if (sensitive.has(key) && tenant.role && !["OWNER", "SUPER_ADMIN"].includes(tenant.role)) {
      return NextResponse.json({ error: "Only the owner or super admin can change payment and integration secrets" }, { status: 403 })
    }
    // A blank sensitive value is never an instruction to erase a credential.
    // These fields render empty (the secret ones cannot be read back), so an
    // onBlur from merely tabbing through the input arrives here as "" — which
    // used to overwrite a live merchant key with nothing. Clearing one is done
    // by deleting the setting, not by submitting an empty box.
    if (sensitive.has(key) && (value === "" || value === null || value === undefined)) continue

    const type = typeof value === "boolean" ? "BOOLEAN" : typeof value === "number" ? "NUMBER" : typeof value === "object" ? "JSON" : "STRING"
    const strValue = type === "JSON" ? JSON.stringify(value) : String(value)
    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { value: strValue, type },
      create: { tenantId, key, value: strValue, type },
    })
  }
  await refreshAmwalPayConfig()
  await refreshPaymobConfig()
  return NextResponse.json({ success: true })
})
