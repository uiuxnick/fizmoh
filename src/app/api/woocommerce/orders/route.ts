import { withErrors } from "@/lib/api-handler"
import { wcRequest } from "@/lib/woocommerce-client"
import { NextRequest, NextResponse } from "next/server"

/**
 * List WooCommerce Orders
 */
export const GET = withErrors(async (request: NextRequest) => {
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
})
