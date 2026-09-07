import { withErrors } from "@/lib/api-handler"
import { wcRequest } from "@/lib/woocommerce-client"
import { NextRequest, NextResponse } from "next/server"

/**
 * List WooCommerce Product Categories
 */
export const GET = withErrors(async (request: NextRequest) => {
  try {
    const categories = await wcRequest("products/categories?per_page=100&hide_empty=true")
    return NextResponse.json({ success: true, categories: Array.isArray(categories) ? categories : [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch WooCommerce categories" }, { status: 400 })
  }
})
