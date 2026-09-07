import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const { searchParams } = new URL(req.url)
  const branchSlug = searchParams.get("branch")
  const tableToken = searchParams.get("tableToken")

  // Find tenant by slug
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

  if (!tenant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 })
  }

  const tenantId = tenant.id

  // If tableToken provided, resolve table and its branch
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

  // Find branches
  const branches = await raw.restaurantBranch.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  })

  // Determine active branch
  let activeBranch: any = null
  if (tableInfo?.branchId) {
    activeBranch = branches.find((b) => b.id === tableInfo.branchId) || null
  } else if (branchSlug) {
    activeBranch = branches.find((b) => b.slug === branchSlug) || null
  }
  if (!activeBranch && branches.length > 0) {
    activeBranch = branches[0]
  }

  // Fetch categories & items for active branch or tenant
  const categories = await raw.menuCategory.findMany({
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

  // Fetch active promotions/discounts
  const discounts = await raw.restaurantDiscount.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [
        { endsAt: null },
        { endsAt: { gte: new Date() } },
      ],
    },
    select: {
      code: true,
      name: true,
      kind: true,
      value: true,
    },
  })

  return NextResponse.json({
    tenant,
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      nameAr: b.nameAr,
      slug: b.slug,
      businessType: b.businessType,
      address: b.address,
      city: b.city,
      phone: b.phone,
      currency: b.currency,
      taxRate: b.taxRate,
      serviceChargeRate: b.serviceChargeRate,
      deliveryFee: b.deliveryFee,
      isDefault: b.isDefault,
    })),
    activeBranch: activeBranch ? {
      id: activeBranch.id,
      name: activeBranch.name,
      nameAr: activeBranch.nameAr,
      slug: activeBranch.slug,
      businessType: activeBranch.businessType,
      currency: activeBranch.currency,
      taxRate: activeBranch.taxRate,
      serviceChargeRate: activeBranch.serviceChargeRate,
      deliveryFee: activeBranch.deliveryFee,
      minOrderDelivery: activeBranch.minOrderDelivery,
    } : null,
    table: tableInfo,
    categories,
    discounts,
  })
}
