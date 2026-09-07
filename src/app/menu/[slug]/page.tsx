import { notFound } from "next/navigation"
import { raw } from "@/lib/db"
import CustomerMenu from "@/components/restaurant/customer-menu"

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tableToken?: string; branch?: string }>
}

export default async function TenantMenuPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { tableToken, branch: branchSlug } = await searchParams

  const tenant = await raw.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      currency: true,
    },
  })

  if (!tenant) notFound()

  const tenantId = tenant.id

  // Table token resolution
  let tableInfo: any = null
  if (tableToken) {
    const table = await raw.restaurantTable.findFirst({
      where: { token: tableToken, tenantId },
      include: { branch: true },
    })
    if (table) {
      tableInfo = {
        id: table.id,
        number: table.number,
        name: table.name,
        area: table.area,
        type: table.type,
        roomNumber: table.roomNumber,
        branchId: table.branchId,
        branchSlug: table.branch?.slug,
      }
    }
  }

  // Branches
  const branches = await raw.restaurantBranch.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  })

  let activeBranch: any = null
  if (tableInfo?.branchId) {
    activeBranch = branches.find((b) => b.id === tableInfo.branchId) || null
  } else if (branchSlug) {
    activeBranch = branches.find((b) => b.slug === branchSlug) || null
  }
  if (!activeBranch && branches.length > 0) {
    activeBranch = branches[0]
  }

  // Categories & Items
  const rawCategories = await raw.menuCategory.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(activeBranch ? { OR: [{ branchId: activeBranch.id }, { branchId: null }] } : {}),
    },
    include: {
      items: {
        where: {
          isAvailable: true,
          isSoldOut: false,
          ...(activeBranch ? { OR: [{ branchId: activeBranch.id }, { branchId: null }] } : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  })

  // Format categories
  const categories = rawCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    nameAr: cat.nameAr,
    description: cat.description,
    descriptionAr: cat.descriptionAr,
    imageUrl: cat.imageUrl,
    icon: cat.icon,
    items: cat.items.map((item) => ({
      id: item.id,
      name: item.name,
      nameAr: item.nameAr,
      description: item.description,
      descriptionAr: item.descriptionAr,
      price: item.price,
      salePrice: item.salePrice,
      imageUrl: item.imageUrl,
      allergens: item.allergens,
      isVegetarian: item.isVegetarian,
      isVegan: item.isVegan,
      isGlutenFree: item.isGlutenFree,
      isSoldOut: item.isSoldOut,
      isFeatured: item.isFeatured,
      prepTimeMinutes: item.prepTimeMinutes,
      calories: item.calories,
      tagsJson: item.tagsJson,
      variantsJson: item.variantsJson,
      modifiersJson: item.modifiersJson,
    })),
  }))

  // Active Discounts
  const discounts = await raw.restaurantDiscount.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
    },
    select: {
      code: true,
      name: true,
      kind: true,
      value: true,
    },
  })

  return (
    <CustomerMenu
      tenant={tenant}
      branches={branches.map((b) => ({
        id: b.id,
        name: b.name,
        nameAr: b.nameAr,
        slug: b.slug,
        businessType: b.businessType,
        currency: b.currency,
        taxRate: b.taxRate,
        serviceChargeRate: b.serviceChargeRate,
        deliveryFee: b.deliveryFee,
        address: b.address,
        phone: b.phone,
      }))}
      activeBranch={
        activeBranch
          ? {
              id: activeBranch.id,
              name: activeBranch.name,
              nameAr: activeBranch.nameAr,
              slug: activeBranch.slug,
              businessType: activeBranch.businessType,
              currency: activeBranch.currency,
              taxRate: activeBranch.taxRate,
              serviceChargeRate: activeBranch.serviceChargeRate,
              deliveryFee: activeBranch.deliveryFee,
              address: activeBranch.address,
              phone: activeBranch.phone,
            }
          : null
      }
      table={tableInfo}
      categories={categories}
      discounts={discounts.filter((d) => d.code !== null) as any}
      tableToken={tableToken}
    />
  )
}
