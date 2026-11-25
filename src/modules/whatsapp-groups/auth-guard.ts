import { NextRequest, NextResponse } from "next/server"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"
import { GroupFeatureError, isWhatsAppGroupsEnabled } from "@/modules/whatsapp-groups"

const ALLOWED_GROUP_ROLES = new Set([
  "SUPER_ADMIN",
  "OWNER",
  "ADMIN",
  "MANAGER",
  "OPS_ADMIN",
])

export async function requireGroupAdmin(request: NextRequest) {
  if (!isWhatsAppGroupsEnabled()) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "WhatsApp Groups feature is disabled" }, { status: 404 }),
    }
  }

  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (session?.kind !== "staff" || !tenant?.tenantId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    }
  }

  const role = String(session.role || "").toUpperCase()
  if (!ALLOWED_GROUP_ROLES.has(role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Admin or Manager role required to manage WhatsApp Groups" },
        { status: 403 },
      ),
    }
  }

  return { ok: true as const, session, tenant }
}

export function handleGroupError(err: unknown) {
  if (err instanceof GroupFeatureError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status },
    )
  }
  const message = err instanceof Error ? err.message : "Internal server error"
  return NextResponse.json({ error: message }, { status: 500 })
}
