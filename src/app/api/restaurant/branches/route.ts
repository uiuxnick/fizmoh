import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { ensureDefaultBranch } from "@/lib/restaurant"

export const GET = withErrors(withModule("RESTAURANT", async () => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ branches: [] })

  let branches = await raw.restaurantBranch.findMany({
    where: { tenantId },
    include: {
      _count: {
        select: { tables: true, orders: true },
      },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  })

  if (branches.length === 0) {
    const defaultBranch = await ensureDefaultBranch(tenantId)
    branches = [
      {
        ...defaultBranch,
        _count: { tables: 0, orders: 0 },
      } as any,
    ]
  }

  return NextResponse.json({ branches })
}))

export const POST = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()
  const {
    name, nameAr, slug, code, businessType, phone, whatsapp, email,
    address, city, lat, lng, openingHoursJson, currency, taxRate,
    serviceChargeRate, deliveryFee, minOrderDelivery, isActive, isDefault, timezone,
  } = body

  if (!name) {
    return NextResponse.json({ error: "Branch name is required" }, { status: 400 })
  }

  const generatedSlug = (slug || name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "branch"

  // Ensure unique slug
  let finalSlug = generatedSlug
  const existing = await raw.restaurantBranch.findFirst({
    where: { tenantId, slug: finalSlug },
  })
  if (existing) {
    finalSlug = `${generatedSlug}-${Date.now().toString().slice(-4)}`
  }

  if (isDefault) {
    await raw.restaurantBranch.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    })
  }

  const branch = await raw.restaurantBranch.create({
    data: {
      tenantId,
      name: String(name).trim(),
      nameAr: nameAr ? String(nameAr).trim() : null,
      slug: finalSlug,
      code: code ? String(code).trim() : null,
      businessType: businessType || "RESTAURANT",
      phone: phone || null,
      whatsapp: whatsapp || null,
      email: email || null,
      address: address || null,
      city: city || null,
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      openingHoursJson: openingHoursJson ? (typeof openingHoursJson === "string" ? openingHoursJson : JSON.stringify(openingHoursJson)) : null,
      currency: currency || "OMR",
      taxRate: typeof taxRate === "number" ? taxRate : 0.05,
      serviceChargeRate: typeof serviceChargeRate === "number" ? serviceChargeRate : 0,
      deliveryFee: typeof deliveryFee === "number" ? deliveryFee : 0,
      minOrderDelivery: typeof minOrderDelivery === "number" ? minOrderDelivery : 0,
      isActive: isActive !== false,
      isDefault: Boolean(isDefault),
      timezone: timezone || "Asia/Muscat",
    },
  })

  return NextResponse.json({ branch }, { status: 201 })
}))

export const PUT = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()
  const { id, isDefault, ...rest } = body

  if (!id) return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })

  if (isDefault) {
    await raw.restaurantBranch.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    })
  }

  const updateData: Record<string, unknown> = {}
  if (rest.name !== undefined) updateData.name = String(rest.name).trim()
  if (rest.nameAr !== undefined) updateData.nameAr = rest.nameAr ? String(rest.nameAr).trim() : null
  if (rest.code !== undefined) updateData.code = rest.code ? String(rest.code).trim() : null
  if (rest.businessType !== undefined) updateData.businessType = rest.businessType
  if (rest.phone !== undefined) updateData.phone = rest.phone || null
  if (rest.whatsapp !== undefined) updateData.whatsapp = rest.whatsapp || null
  if (rest.email !== undefined) updateData.email = rest.email || null
  if (rest.address !== undefined) updateData.address = rest.address || null
  if (rest.city !== undefined) updateData.city = rest.city || null
  if (rest.lat !== undefined) updateData.lat = rest.lat
  if (rest.lng !== undefined) updateData.lng = rest.lng
  if (rest.openingHoursJson !== undefined) {
    updateData.openingHoursJson = typeof rest.openingHoursJson === "string" ? rest.openingHoursJson : JSON.stringify(rest.openingHoursJson)
  }
  if (rest.currency !== undefined) updateData.currency = rest.currency
  if (rest.taxRate !== undefined) updateData.taxRate = Number(rest.taxRate)
  if (rest.serviceChargeRate !== undefined) updateData.serviceChargeRate = Number(rest.serviceChargeRate)
  if (rest.deliveryFee !== undefined) updateData.deliveryFee = Number(rest.deliveryFee)
  if (rest.minOrderDelivery !== undefined) updateData.minOrderDelivery = Number(rest.minOrderDelivery)
  if (rest.isActive !== undefined) updateData.isActive = Boolean(rest.isActive)
  if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault)
  if (rest.timezone !== undefined) updateData.timezone = rest.timezone

  await raw.restaurantBranch.updateMany({
    where: { id, tenantId },
    data: updateData,
  })

  return NextResponse.json({ updated: true })
}))

export const DELETE = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })

  // Check if default branch or only branch
  const total = await raw.restaurantBranch.count({ where: { tenantId } })
  if (total <= 1) {
    return NextResponse.json({ error: "Cannot delete the only branch of the restaurant" }, { status: 400 })
  }

  await raw.restaurantBranch.deleteMany({
    where: { id, tenantId },
  })

  return NextResponse.json({ deleted: true })
}))
