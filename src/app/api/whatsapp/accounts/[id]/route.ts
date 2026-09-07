import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { fetchNumberDetails, registerNumber, subscribeApp, tokenFor } from "@/lib/whatsapp-accounts"
import { createAuditLog } from "@/lib/slots-server"
import { z } from "zod"
import { currentTenant } from "@/lib/tenant"

const schema = z.object({
  action: z.enum(["make_default", "refresh", "reveal_token", "resubscribe", "reregister"]),
})

export const POST = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
    const session = await sessionFromRequest(request)
    if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })
    if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER"].includes(tenant.role)) {
      return NextResponse.json({ error: "Only workspace administrators can manage WhatsApp numbers" }, { status: 403 })
    }

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Unknown action" }, { status: 400 })

    const account = await db.whatsAppAccount.findFirst({ where: { id, tenantId: tenant.tenantId } })
    if (!account) return NextResponse.json({ error: "That number is not connected" }, { status: 404 })

    switch (parsed.data.action) {
      case "make_default": {
        // Exactly one default, changed in one transaction: two would mean
        // messages leaving from whichever row happened to be read first.
        await db.$transaction([
          db.whatsAppAccount.updateMany({ data: { isDefault: false }, where: { tenantId: tenant.tenantId } }),
          db.whatsAppAccount.update({ where: { id }, data: { isDefault: true } }),
        ])
        return NextResponse.json({ ok: true })
      }

      case "refresh": {
        const live = await fetchNumberDetails(account.phoneNumberId, tokenFor(account))
        const updated = await db.whatsAppAccount.update({
          where: { id },
          data: live.ok
            ? { ...live.details, status: "CONNECTED", lastError: null, syncedAt: new Date() }
            : { status: "ERROR", lastError: live.error ?? "Meta did not answer", syncedAt: new Date() },
        })
        return NextResponse.json({ ok: live.ok, account: updated, error: live.error })
      }

      case "resubscribe": {
        const result = await subscribeApp(account.wabaId, tokenFor(account))
        await db.whatsAppAccount.update({ where: { id }, data: { webhookSubscribed: result.ok } })
        return NextResponse.json({ ok: result.ok, error: result.error })
      }

      case "reregister": {
        const result = await registerNumber(account.phoneNumberId, tokenFor(account))
        await db.whatsAppAccount.update({ where: { id }, data: { registered: result.ok } })
        return NextResponse.json({ ok: result.ok, error: result.error })
      }

      case "reveal_token": {
        // The whole account, in one string. Only a super admin, and written
        // down every time — if a token leaks, the log is how anybody finds out
        // who had it.
        if (session.role !== "SUPER_ADMIN") {
          return NextResponse.json(
            { error: "Only a super admin can reveal a token" },
            { status: 403 },
          )
        }
        await createAuditLog({
          action: "WHATSAPP_TOKEN_REVEALED",
          entity: "WhatsAppAccount",
          entityId: id,
          staffId: session.staffId,
          details: account.displayPhone ?? account.phoneNumberId,
        }).catch(() => {})
        return NextResponse.json({ token: tokenFor(account) })
      }
    }
  },
)

/**
 * Disconnecting.
 *
 * The conversations and their messages stay — they are the history of real
 * customers and are not this number's to take away. Only the credentials go.
 */
export const DELETE = withErrors(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const tenant = currentTenant()
    if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
    const session = await sessionFromRequest(request)
    if (session?.kind !== "staff") return NextResponse.json({ error: "Sign in first" }, { status: 401 })
    if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER"].includes(tenant.role)) {
      return NextResponse.json({ error: "Only workspace administrators can disconnect WhatsApp numbers" }, { status: 403 })
    }

    const account = await db.whatsAppAccount.findFirst({ where: { id, tenantId: tenant.tenantId } })
    if (!account) return NextResponse.json({ error: "That number is not connected" }, { status: 404 })

    await db.whatsAppAccount.delete({ where: { id } })

    // Something has to be the default, or the next message has nowhere to go.
    if (account.isDefault) {
      const next = await db.whatsAppAccount.findFirst({ where: { tenantId: tenant.tenantId }, orderBy: { createdAt: "asc" } })
      if (next) await db.whatsAppAccount.update({ where: { id: next.id }, data: { isDefault: true } })
    }

    await createAuditLog({
      action: "WHATSAPP_ACCOUNT_DISCONNECTED",
      entity: "WhatsAppAccount",
      entityId: id,
      staffId: session.staffId,
      details: account.displayPhone ?? account.phoneNumberId,
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  },
)
