import { withErrors } from "@/lib/api-handler"
import { wcRequest } from "@/lib/woocommerce-client"
import { NextRequest, NextResponse } from "next/server"
import { sessionFromRequest } from "@/lib/auth"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"

/**
 * List WooCommerce Orders
 */
export const GET = withErrors(withModule("WOOCOMMERCE", async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Staff authentication required" }, { status: 401 })
  }

  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status") || "any"
  const page = searchParams.get("page") || "1"
  const perPage = searchParams.get("per_page") || "50"

  const query = new URLSearchParams()
  query.set("page", page)
  query.set("per_page", perPage)
  if (status !== "any") query.set("status", status)

  try {
    const orders = await wcRequest(`orders?${query.toString()}`)
    return NextResponse.json({ success: true, orders: Array.isArray(orders) ? orders : [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch WooCommerce orders" }, { status: 400 })
  }
}))
