import { withErrors } from "@/lib/api-handler"
import { wcRequest } from "@/lib/woocommerce-client"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

/**
 * List & Sync WooCommerce Customers
 */
export const GET = withErrors(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get("search") || ""
  const page = searchParams.get("page") || "1"
  const perPage = searchParams.get("per_page") || "50"

  const query = new URLSearchParams()
  query.set("page", page)
  query.set("per_page", perPage)
  if (search) query.set("search", search)

  try {
    const wcCustomers = await wcRequest(`customers?${query.toString()}`)
    const list = Array.isArray(wcCustomers) ? wcCustomers : []

    // Sync WooCommerce customers into db.customer (CRM) in background
    for (const c of list) {
      const phone = c.billing?.phone || c.shipping?.phone || ""
      if (phone) {
        const cleanPhone = phone.replace(/[^0-9+]/g, "")
        const fullName = `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.username
        if (cleanPhone) {
          const existing = await db.customer.findFirst({ where: { phone: cleanPhone } })
          if (!existing) {
            await db.customer.create({
              data: {
                phone: cleanPhone,
                name: fullName,
                email: c.email || undefined,
                notes: `WooCommerce Customer #${c.id}`,
              },
            }).catch(() => {})
          }
        }
      }
    }

    return NextResponse.json({ success: true, customers: list })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch WooCommerce customers" }, { status: 400 })
  }
})

export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}))
  const { email, first_name, last_name, phone } = body

  if (!email) {
    return NextResponse.json({ error: "Customer email is required" }, { status: 400 })
  }

  try {
    const customer = await wcRequest("customers", {
      method: "POST",
      body: JSON.stringify({
        email,
        first_name: first_name || "",
        last_name: last_name || "",
        billing: { phone: phone || "" },
      }),
    })

    return NextResponse.json({ success: true, customer })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create WooCommerce customer" }, { status: 400 })
  }
})
