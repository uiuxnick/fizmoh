import { withErrors } from "@/lib/api-handler"
import { wcRequest } from "@/lib/woocommerce-client"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { sessionFromRequest } from "@/lib/auth"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"

const EDIT_ROLES = new Set(["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "PLATFORM"])

/**
 * List & Sync WooCommerce Customers
 */
export const GET = withErrors(withModule("WOOCOMMERCE", async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Staff authentication required" }, { status: 401 })
  }

  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
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

    // Sync WooCommerce customers into db.customer (CRM) with strict tenant scoping
    if (tenantId) {
      for (const c of list) {
        const phone = c.billing?.phone || c.shipping?.phone || ""
        if (phone) {
          const cleanPhone = phone.replace(/[^0-9+]/g, "")
          const fullName = `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.username
          if (cleanPhone) {
            const existing = await db.customer.findFirst({ where: { phone: cleanPhone, tenantId } })
            if (!existing) {
              await db.customer.create({
                data: {
                  tenantId,
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
    }

    return NextResponse.json({ success: true, customers: list })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch WooCommerce customers" }, { status: 400 })
  }
}))

export const POST = withErrors(withModule("WOOCOMMERCE", async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Staff authentication required" }, { status: 401 })
  }

  const role = session.role?.toUpperCase() || ""
  if (!EDIT_ROLES.has(role)) {
    return NextResponse.json({ error: "Insufficient permissions to create WooCommerce customers" }, { status: 403 })
  }

  const tenantId = currentTenant()?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })

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
}))
