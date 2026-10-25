import { NextRequest } from "next/server"
import { validateApiKey } from "@/lib/api-keys"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant } from "@/lib/tenant"
import { db } from "@/lib/db"

export interface EcommerceAuthContext {
  tenantId: string
  storeId?: string | null
  storeName?: string
  authMethod: "API_KEY" | "STORE_KEY" | "SESSION" | "INTERNAL_CRON"
}

export async function resolveEcommerceAuth(request: NextRequest): Promise<EcommerceAuthContext | null> {
  const apiKeyHeader = request.headers.get("x-api-key") || request.headers.get("authorization")
  const cleanKey = apiKeyHeader ? apiKeyHeader.replace(/^Bearer\s+/i, "").trim() : ""

  // 1. Check if key matches an EcommerceStore apiKey
  if (cleanKey) {
    const store = await db.ecommerceStore.findFirst({
      where: { apiKey: cleanKey, isActive: true },
      select: { id: true, tenantId: true, name: true },
    }).catch(() => null)

    if (store) {
      return {
        tenantId: store.tenantId,
        storeId: store.id,
        storeName: store.name,
        authMethod: "STORE_KEY",
      }
    }

    // 2. Check platform API key
    const valid = await validateApiKey(cleanKey)
    if (valid?.tenantId) {
      return {
        tenantId: valid.tenantId,
        authMethod: "API_KEY",
      }
    }
  }

  // 3. Check active staff session
  const session = await sessionFromRequest(request).catch(() => null)
  if (session && session.kind === "staff") {
    const tenant = currentTenant()
    const tenantId = tenant?.tenantId || (session as any).tenantId
    if (tenantId) {
      return {
        tenantId,
        authMethod: "SESSION",
      }
    }
  }

  // 4. Internal cron / system caller with verified CRON_SECRET only
  const cronSecretHeader = request.headers.get("x-cron-secret") || request.headers.get("x-fizmoh-cron") || request.headers.get("x-internal-token")
  const { searchParams } = new URL(request.url)
  const workspaceSlug = searchParams.get("workspace")?.trim()

  if (workspaceSlug && process.env.CRON_SECRET && cronSecretHeader === process.env.CRON_SECRET) {
    const targetTenant = await db.tenant.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true, name: true },
    }).catch(() => null)

    if (targetTenant) {
      return {
        tenantId: targetTenant.id,
        authMethod: "INTERNAL_CRON",
      }
    }
  }

  return null
}
