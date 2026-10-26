import { NextRequest, NextResponse } from "next/server"
import { sessionFromRequest } from "@/lib/auth"
import { raw } from "@/lib/db"
import { withTenant, type TenantContext } from "@/lib/tenant-context"
import { resolveTenant } from "@/lib/tenant"
import { hasAddon } from "@/lib/entitlements"
import type { EmailPermission } from "./types"

export interface EmailAuthContext {
  tenant: TenantContext
  staffId: string
  role: string
  permissions: Record<string, boolean>
  canReadFullEmail: boolean
}

/**
 * Server-side authorization pipeline enforcing:
 * Tenant -> Active Subscription -> EMAIL_MARKETING Addon Enabled -> Role / Permission
 */
export async function requireEmailMarketingAuth(
  request: NextRequest,
  requiredPermission?: EmailPermission
): Promise<{ auth?: EmailAuthContext; response?: NextResponse }> {
  const session = await sessionFromRequest(request).catch(() => null)
  if (!session || session.kind !== "staff" || !session.staffId) {
    return {
      response: NextResponse.json(
        { error: "Authentication required to access Email Marketing", code: "UNAUTHENTICATED" },
        { status: 401 }
      ),
    }
  }

  const cookieNamed = request.cookies.get("fizmoh_workspace")?.value || null
  const headerNamed = request.headers.get("x-fizmoh-workspace") || null
  const urlNamed = new URL(request.url).searchParams.get("workspace") || null
  const tenantSlug = cookieNamed || headerNamed || urlNamed
  const host = request.headers.get("host")

  const tenant = await resolveTenant({
    host,
    staffId: session.staffId,
    slug: tenantSlug,
    trustedSlug: cookieNamed,
  })

  if (!tenant || !tenant.tenantId) {
    return {
      response: NextResponse.json(
        { error: "Workspace context not found or access denied", code: "TENANT_NOT_FOUND" },
        { status: 403 }
      ),
    }
  }

  // 1. Verify EMAIL_MARKETING entitlement (included in plan or active addon) or platform operator bypass
  const { isPlatformOperator } = await import("@/lib/tenant")
  const isPlatformUser = tenant.role === "PLATFORM" || (await isPlatformOperator(session.staffId))
  if (!isPlatformUser) {
    const { getTenantEntitledModules } = await import("@/lib/entitlements")
    const entitledModules = await getTenantEntitledModules(tenant.tenantId)
    const isEntitled = entitledModules.includes("EMAIL_MARKETING") || (await hasAddon(tenant.tenantId, "email-marketing"))
    if (!isEntitled) {
      return {
        response: NextResponse.json(
          {
            error: "The Advanced Email Marketing addon is not enabled for this workspace.",
            code: "ADDON_DISABLED",
            addon: "EMAIL_MARKETING",
            upgradeUrl: "/billing?addon=email-marketing",
          },
          { status: 403 }
        ),
      }
    }
  }

  // 2. Resolve staff permissions
  let permissions: Record<string, boolean> = {}
  let role = tenant.role || session.role || "AGENT"

  const membership = await raw.tenantMember.findUnique({
    where: { tenantId_staffId: { tenantId: tenant.tenantId, staffId: session.staffId } },
  })

  if (membership) {
    role = membership.role
    if (membership.permissions && typeof membership.permissions === "object") {
      permissions = membership.permissions as Record<string, boolean>
    }
  }

  // Admin and Super Admin default to all permissions
  const isAdmin = isPlatformUser || role === "ADMIN" || role === "SUPER_ADMIN" || role === "OWNER"

  if (requiredPermission && !isAdmin) {
    // If not admin, check specific permission
    if (!permissions[requiredPermission]) {
      return {
        response: NextResponse.json(
          {
            error: `Missing required permission: ${requiredPermission}`,
            code: "PERMISSION_DENIED",
            permission: requiredPermission,
          },
          { status: 403 }
        ),
      }
    }
  }

  const canReadFullEmail = isAdmin || Boolean(permissions["email.subscribers.read_full"])

  return {
    auth: {
      tenant,
      staffId: session.staffId,
      role,
      permissions,
      canReadFullEmail,
    },
  }
}

/**
 * Mask email for privacy-safe displays when the operator lacks `email.subscribers.read_full`
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***"
  const [local, domain] = email.split("@")
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}***${local.slice(-1)}@${domain}`
}
