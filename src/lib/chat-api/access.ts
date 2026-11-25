import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { verifySession } from "@/lib/auth"
import { verifyMobileAccessToken } from "@/lib/mobile-auth"
import { raw } from "@/lib/db"
import { withTenant } from "@/lib/tenant-context"
import { modulesFor } from "@/lib/entitlements"
import { checkSharedRateLimit } from "@/lib/rate-limit"
import { hasPermission, resolveStaffPermissions } from "@/lib/permissions"
import { ChatError } from "./contracts"

export type ChatAccess = {
  tenantId: string
  slug: string
  staffId: string
  role: string
  permissions: Record<string, boolean>
  canViewPhoneNumbers: boolean
  canViewAllConversations: boolean
  canSendMessages: boolean
}

const READ_ROLES = new Set([
  "SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER", "OPS_ADMIN",
  "CHAT_AGENT", "AGENT", "MARKETING", "FINANCE", "GUIDE", "VIEWER",
])
const WRITE_ROLES = new Set([
  "SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER", "OPS_ADMIN",
  "CHAT_AGENT", "AGENT", "MARKETING",
])

export async function authenticateChat(request: NextRequest, write: boolean): Promise<ChatAccess> {
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") || "")?.[1]
  if (!token) throw new ChatError(401, "UNAUTHENTICATED", "A staff bearer token is required.")

  let staffId: string | undefined
  try {
    const mobilePayload = await verifyMobileAccessToken(token)
    staffId = mobilePayload.staffId
  } catch {
    const session = await verifySession(token).catch(() => null)
    if (session?.kind === "staff" && session.staffId) staffId = session.staffId
  }
  if (!staffId) throw new ChatError(401, "UNAUTHENTICATED", "A valid staff bearer token is required.")

  const slug = request.headers.get("x-fizmoh-workspace")?.trim().toLowerCase()
  if (!slug || !/^[a-z0-9-]{1,100}$/.test(slug)) throw new ChatError(400, "WORKSPACE_REQUIRED", "Specify x-fizmoh-workspace.")
  // Raw is intentional: authorization occurs before a tenant scope exists.
  const member = await raw.tenantMember.findFirst({
    where: { staffId, tenant: { slug }, staff: { isActive: true } },
    include: { tenant: { select: { id: true, slug: true, status: true } } },
  })
  if (!member || !["ACTIVE", "TRIALING"].includes(member.tenant.status)) {
    throw new ChatError(403, "WORKSPACE_FORBIDDEN", "Active workspace membership is required.")
  }

  const normalizedRole = String(member.role || "").toUpperCase()
  const allowed = write ? WRITE_ROLES : READ_ROLES
  if (!allowed.has(normalizedRole)) {
    throw new ChatError(403, "ROLE_FORBIDDEN", "Your workspace role does not allow this operation.")
  }

  const rawOverrides =
    member.permissions && typeof member.permissions === "object"
      ? (member.permissions as Record<string, boolean>)
      : null
  const permissions = resolveStaffPermissions(normalizedRole, rawOverrides)
  const subject = { role: normalizedRole, permissions }

  return {
    tenantId: member.tenant.id,
    slug: member.tenant.slug,
    staffId,
    role: normalizedRole,
    permissions,
    canViewPhoneNumbers: hasPermission(subject, "view_phone_numbers"),
    canViewAllConversations: hasPermission(subject, "view_all_conversations"),
    canSendMessages: hasPermission(subject, "send_messages"),
  }
}
export function chatRoute<C>(write: boolean, handler: (request: NextRequest, context: C, access: ChatAccess) => Promise<Response>) {
  return async (request: NextRequest, context: C): Promise<Response> => {
    const requestId = randomUUID()
    const headers = { "Cache-Control": "private, no-store", "X-Request-Id": requestId, "Vary": "Authorization, x-fizmoh-workspace" }
    try {
      if (process.env.FIZMOH_CHAT_API_V1 !== "1") throw new ChatError(503, "API_NOT_ENABLED", "Chat API v1 is not enabled on this installation.")
      const access = await authenticateChat(request, write)
      const rate = await checkSharedRateLimit(`chat:v1:${access.tenantId}:${access.staffId}:${write ? "write" : "read"}`, write ? 60 : 180, 60_000)
      if (!rate.allowed) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Try again later.", requestId } }, { status: 429, headers: { ...headers, "Retry-After": String(rate.retryAfter) } })
      return await withTenant(access, async () => {
        const subscription = await raw.subscription.findFirst({
          where: { tenantId: access.tenantId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
          select: { id: true },
        })
        if (!subscription) throw new ChatError(403, "SUBSCRIPTION_REQUIRED", "An active subscription or trial is required.")
        if (!(await modulesFor(access.tenantId)).includes("INBOX")) throw new ChatError(403, "MODULE_FORBIDDEN", "Inbox access is not enabled.")
        const response = await handler(request, context, access)
        for (const [key, value] of Object.entries(headers)) {
          if (key !== "Cache-Control" || !response.headers.has(key)) response.headers.set(key, value)
        }
        return response
      })
    } catch (error) {
      const known = error instanceof ChatError ? error : error instanceof ZodError ? new ChatError(400, "INVALID_REQUEST", "Request fields are invalid.") : null
      if (!known) console.error(`[chat-api] ${requestId} request failed`)
      return NextResponse.json({ error: { code: known?.code ?? "INTERNAL_ERROR", message: known?.message ?? "Request could not be completed.", requestId } }, { status: known?.status ?? 500, headers })
    }
  }
}
