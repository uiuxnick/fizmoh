import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const GET = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ categories: [] })

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")
  const menuId = searchParams.get("menuId")

  const categories = await raw.menuCategory.findMany({
    where: {
      tenantId,
      ...(branchId ? { branchId } : {}),
      ...(menuId ? { menuId } : {}),
    },
    include: {
      items: {
        where: {
          ...(branchId ? { branchId } : {}),
          ...(menuId ? { menuId } : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ categories })
}))

export const POST = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()

  // Create Category
  if (body.type === "CATEGORY") {
    const { name, nameAr, description, descriptionAr, imageUrl, icon, branchId, menuId, displayOrder } = body
    if (!name) return NextResponse.json({ error: "Category name required" }, { status: 400 })

    const category = await raw.menuCategory.create({
      data: {
        tenantId,
        branchId: branchId || undefined,
        menuId: menuId || undefined,
        name: String(name).trim(),
        nameAr: nameAr ? String(nameAr).trim() : null,
        description: description ? String(description).trim() : null,
        descriptionAr: descriptionAr ? String(descriptionAr).trim() : null,
        imageUrl: imageUrl || null,
        icon: icon || null,
        displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
      },
    })
    return NextResponse.json({ category }, { status: 201 })
  }

  // Create Menu Item
  const {
    categoryId, name, nameAr, description, descriptionAr, price, salePrice,
    imageUrl, allergens, prepTimeMinutes, isVegetarian, isVegan, isGlutenFree,
    addonsJson, variantsJson, modifiersJson, tagsJson, branchId, menuId,
    calories, sku, sortOrder, isAvailable, isSoldOut, isFeatured,
  } = body

  if (!categoryId || !name || price === undefined) {
    return NextResponse.json({ error: "Category ID, Name and Price are required" }, { status: 400 })
  }

  const item = await raw.menuItem.create({
    data: {
      tenantId,
      branchId: branchId || undefined,
      menuId: menuId || undefined,
      categoryId,
      name: String(name).trim(),
      nameAr: nameAr ? String(nameAr).trim() : null,
      description: description ? String(description).trim() : null,
      descriptionAr: descriptionAr ? String(descriptionAr).trim() : null,
      price: Number(price) || 0,
      salePrice: salePrice !== null && salePrice !== undefined && salePrice !== "" ? Number(salePrice) : null,
      imageUrl: imageUrl || null,
      allergens: allergens || null,
      prepTimeMinutes: Number(prepTimeMinutes) || 15,
      isAvailable: isAvailable !== false,
      isSoldOut: Boolean(isSoldOut),
      isFeatured: Boolean(isFeatured),
      isVegetarian: Boolean(isVegetarian),
      isVegan: Boolean(isVegan),
      isGlutenFree: Boolean(isGlutenFree),
      calories: calories ? Number(calories) : null,
      sku: sku ? String(sku).trim() : null,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      addonsJson: addonsJson ? (typeof addonsJson === "string" ? addonsJson : JSON.stringify(addonsJson)) : null,
      variantsJson: variantsJson ? (typeof variantsJson === "string" ? variantsJson : JSON.stringify(variantsJson)) : null,
      modifiersJson: modifiersJson ? (typeof modifiersJson === "string" ? modifiersJson : JSON.stringify(modifiersJson)) : null,
      tagsJson: tagsJson ? (typeof tagsJson === "string" ? tagsJson : JSON.stringify(tagsJson)) : null,
    },
  })

  return NextResponse.json({ item }, { status: 201 })
}))

export const PUT = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()

  if (body.type === "CATEGORY") {
    const { id, name, nameAr, description, descriptionAr, imageUrl, icon, isActive, displayOrder } = body
    if (!id) return NextResponse.json({ error: "Category ID required" }, { status: 400 })

    await raw.menuCategory.updateMany({
      where: { id, tenantId },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(nameAr !== undefined ? { nameAr: nameAr ? String(nameAr).trim() : null } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(descriptionAr !== undefined ? { descriptionAr: descriptionAr ? String(descriptionAr).trim() : null } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(icon !== undefined ? { icon } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(displayOrder !== undefined ? { displayOrder: Number(displayOrder) } : {}),
      },
    })
    return NextResponse.json({ updated: true })
  }

  const {
    id, categoryId, name, nameAr, description, descriptionAr, price, salePrice,
    imageUrl, allergens, prepTimeMinutes, isAvailable, isSoldOut, isFeatured,
    isVegetarian, isVegan, isGlutenFree, addonsJson, variantsJson, modifiersJson,
    tagsJson, calories, sku, sortOrder,
  } = body

  if (!id) return NextResponse.json({ error: "Menu item ID required" }, { status: 400 })

  await raw.menuItem.updateMany({
    where: { id, tenantId },
    data: {
      ...(categoryId ? { categoryId } : {}),
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(nameAr !== undefined ? { nameAr: nameAr ? String(nameAr).trim() : null } : {}),
      ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
      ...(descriptionAr !== undefined ? { descriptionAr: descriptionAr ? String(descriptionAr).trim() : null } : {}),
      ...(price !== undefined ? { price: Number(price) } : {}),
      ...(salePrice !== undefined ? { salePrice: salePrice !== null && salePrice !== "" ? Number(salePrice) : null } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(allergens !== undefined ? { allergens } : {}),
      ...(prepTimeMinutes !== undefined ? { prepTimeMinutes: Number(prepTimeMinutes) } : {}),
      ...(isAvailable !== undefined ? { isAvailable: Boolean(isAvailable) } : {}),
      ...(isSoldOut !== undefined ? { isSoldOut: Boolean(isSoldOut) } : {}),
      ...(isFeatured !== undefined ? { isFeatured: Boolean(isFeatured) } : {}),
      ...(isVegetarian !== undefined ? { isVegetarian: Boolean(isVegetarian) } : {}),
      ...(isVegan !== undefined ? { isVegan: Boolean(isVegan) } : {}),
      ...(isGlutenFree !== undefined ? { isGlutenFree: Boolean(isGlutenFree) } : {}),
      ...(calories !== undefined ? { calories: calories ? Number(calories) : null } : {}),
      ...(sku !== undefined ? { sku: sku ? String(sku).trim() : null } : {}),
      ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
      ...(addonsJson !== undefined ? { addonsJson: typeof addonsJson === "string" ? addonsJson : JSON.stringify(addonsJson) } : {}),
      ...(variantsJson !== undefined ? { variantsJson: typeof variantsJson === "string" ? variantsJson : JSON.stringify(variantsJson) } : {}),
      ...(modifiersJson !== undefined ? { modifiersJson: typeof modifiersJson === "string" ? modifiersJson : JSON.stringify(modifiersJson) } : {}),
      ...(tagsJson !== undefined ? { tagsJson: typeof tagsJson === "string" ? tagsJson : JSON.stringify(tagsJson) } : {}),
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
  const type = searchParams.get("type")

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  if (type === "CATEGORY") {
    await raw.menuCategory.deleteMany({
      where: { id, tenantId },
    })
  } else {
    await raw.menuItem.deleteMany({
      where: { id, tenantId },
    })
  }

  return NextResponse.json({ deleted: true })
}))
