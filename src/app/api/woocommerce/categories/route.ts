import { withErrors } from "@/lib/api-handler"
import { wcRequest } from "@/lib/woocommerce-client"
import { NextRequest, NextResponse } from "next/server"
import { sessionFromRequest } from "@/lib/auth"
import { withModule } from "@/lib/entitlements"

/**
 * List WooCommerce Product Categories
 */
export const GET = withErrors(withModule("WOOCOMMERCE", async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Staff authentication required" }, { status: 401 })
  }

  try {
    const categories = await wcRequest("products/categories?per_page=100&hide_empty=true")
    return NextResponse.json({ success: true, categories: Array.isArray(categories) ? categories : [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch WooCommerce categories" }, { status: 400 })
  }
}))
