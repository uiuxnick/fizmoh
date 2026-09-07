import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const GET = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ menus: [] })

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")

  const menus = await raw.restaurantMenu.findMany({
    where: {
      tenantId,
      ...(branchId ? { branchId } : {}),
    },
    include: {
      branch: { select: { id: true, name: true, slug: true } },
      _count: { select: { categories: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ menus })
}))

export const POST = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()
  const { name, nameAr, description, branchId, type, isActive, isPublished, sortOrder, availableDays, availableFrom, availableTo } = body

  if (!name) return NextResponse.json({ error: "Menu name is required" }, { status: 400 })

  const menu = await raw.restaurantMenu.create({
    data: {
      tenantId,
      branchId: branchId || undefined,
      name: String(name).trim(),
      nameAr: nameAr ? String(nameAr).trim() : null,
      description: description ? String(description).trim() : null,
      type: type || "DINE_IN",
      isActive: isActive !== false,
      isPublished: isPublished !== false,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      availableDays: availableDays || null,
      availableFrom: availableFrom || null,
      availableTo: availableTo || null,
    },
  })

  return NextResponse.json({ menu }, { status: 201 })
}))

export const PUT = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()
  const { id, ...rest } = body

  if (!id) return NextResponse.json({ error: "Menu ID is required" }, { status: 400 })

  await raw.restaurantMenu.updateMany({
    where: { id, tenantId },
    data: {
      ...(rest.name !== undefined ? { name: String(rest.name).trim() } : {}),
      ...(rest.nameAr !== undefined ? { nameAr: rest.nameAr ? String(rest.nameAr).trim() : null } : {}),
      ...(rest.description !== undefined ? { description: rest.description ? String(rest.description).trim() : null } : {}),
      ...(rest.branchId !== undefined ? { branchId: rest.branchId || null } : {}),
      ...(rest.type !== undefined ? { type: rest.type } : {}),
      ...(rest.isActive !== undefined ? { isActive: Boolean(rest.isActive) } : {}),
      ...(rest.isPublished !== undefined ? { isPublished: Boolean(rest.isPublished) } : {}),
      ...(rest.sortOrder !== undefined ? { sortOrder: Number(rest.sortOrder) } : {}),
      ...(rest.availableDays !== undefined ? { availableDays: rest.availableDays } : {}),
      ...(rest.availableFrom !== undefined ? { availableFrom: rest.availableFrom } : {}),
      ...(rest.availableTo !== undefined ? { availableTo: rest.availableTo } : {}),
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
  if (!id) return NextResponse.json({ error: "Menu ID is required" }, { status: 400 })

  await raw.restaurantMenu.deleteMany({
    where: { id, tenantId },
  })

  return NextResponse.json({ deleted: true })
}))
