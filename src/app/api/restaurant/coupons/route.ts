import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const GET = withErrors(withModule("RESTAURANT", async () => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ coupons: [] })

  const coupons = await raw.restaurantDiscount.findMany({
    where: { tenantId },
    include: {
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ coupons })
}))

export const POST = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()
  const { name, code, kind, value, startsAt, endsAt, isActive } = body

  if (!name || !code || value === undefined) {
    return NextResponse.json({ error: "Name, Code and Value are required" }, { status: 400 })
  }

  const cleanCode = String(code).trim().toUpperCase()

  const existing = await raw.restaurantDiscount.findFirst({
    where: { tenantId, code: cleanCode },
  })
  if (existing) {
    return NextResponse.json({ error: "Discount code already exists" }, { status: 400 })
  }

  const coupon = await raw.restaurantDiscount.create({
    data: {
      tenantId,
      name: String(name).trim(),
      code: cleanCode,
      kind: kind === "FIXED" ? "FIXED" : "PERCENT",
      value: Number(value) || 0,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      isActive: isActive !== false,
    },
  })

  return NextResponse.json({ coupon }, { status: 201 })
}))

export const PUT = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()
  const { id, name, code, kind, value, startsAt, endsAt, isActive } = body

  if (!id) return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 })

  await raw.restaurantDiscount.updateMany({
    where: { id, tenantId },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(code !== undefined ? { code: String(code).trim().toUpperCase() } : {}),
      ...(kind !== undefined ? { kind: kind === "FIXED" ? "FIXED" : "PERCENT" } : {}),
      ...(value !== undefined ? { value: Number(value) } : {}),
      ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
      ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    },
  })

  return NextResponse.json({ updated: true })
}))

export const DELETE = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 })

  await raw.restaurantDiscount.deleteMany({
    where: { id, tenantId },
  })

  return NextResponse.json({ deleted: true })
}))
