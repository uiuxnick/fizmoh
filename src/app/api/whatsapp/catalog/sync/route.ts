import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { getWhatsAppConfig, GRAPH_API_VERSION } from "@/lib/whatsapp"
import { getTenantCourses } from "@/lib/training-service"
import { NextRequest, NextResponse } from "next/server"

/**
 * Meta WhatsApp Catalog Synchronization API
 * Strictly multi-tenant: products are isolated by the caller's tenantId.
 * Generates and syncs items from MenuItems, Tours, Training Courses & WooCommerce Cache into Meta Commerce Catalog.
 */
export const GET = withErrors(async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json(
      {
        success: false,
        error: "403 – Access Denied: Workspace context required to access catalog feed.",
        totalItems: 0,
        feed: [],
      },
      { status: 401 },
    )
  }

  const tenantId = tenant.tenantId

  const [menuItems, tours, wcCache, courses] = await Promise.all([
    db.menuItem.findMany({
      where: { tenantId },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    db.tour.findMany({
      where: { tenantId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    db.systemSetting.findFirst({
      where: { tenantId, key: "WOOCOMMERCE_PRODUCTS_CACHE" },
    }),
    getTenantCourses(tenantId).catch(() => []),
  ])

  let wcProducts: any[] = []
  if (wcCache?.value) {
    try {
      const parsed = JSON.parse(wcCache.value)
      if (Array.isArray(parsed.products)) {
        wcProducts = parsed.products
      }
    } catch {}
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.fizmoh.cloud"

  const courseItems = courses
    .filter((c: any) => c.status === "PUBLISHED" || !c.status)
    .map((c: any) => {
      const priceNum = Number(c.discountPrice && c.discountPrice > 0 ? c.discountPrice : c.standardPrice || c.price || 0)
      const img = c.bannerImage || c.heroImage || `${baseUrl}/logo.png`
      const currency = c.currency || "OMR"
      return {
        id: `course_${c.id}`,
        retailer_id: `course_${c.id}`,
        title: c.name || c.title || "Professional Course",
        description: (c.subtitle || c.description || c.title || "Training Course").replace(/<[^>]*>?/gm, "").slice(0, 300),
        availability: "in stock",
        condition: "new",
        price: `${priceNum.toFixed(3)} ${currency}`,
        currency,
        link: `${baseUrl}/training/${c.slug || c.id}`,
        image_link: img,
        brand: "Training Academy",
        category: c.category || "Professional Training",
      }
    })

  const catalogFeed = [
    ...courseItems,
    ...menuItems.map((item) => ({
      id: `item_${item.id}`,
      retailer_id: `dish_${item.id}`,
      title: item.name,
      description: item.description || `${item.category?.name || "Gourmet"} dish`,
      availability: item.isAvailable ? "in stock" : "out of stock",
      condition: "new",
      price: `${item.price.toFixed(3)} OMR`,
      currency: "OMR",
      link: `${baseUrl}/shop`,
      image_link: item.imageUrl || `${baseUrl}/logo.png`,
      brand: "Restaurant",
      category: item.category?.name || "Gourmet",
    })),
    ...tours.map((tour) => {
      const mediaArr = Array.isArray(tour.media) ? (tour.media as any[]) : []
      const tourImg = (tour as any).imageUrl || mediaArr[0]?.url || `${baseUrl}/logo.png`
      return {
        id: `tour_${tour.id}`,
        retailer_id: `tour_${tour.id}`,
        title: tour.name,
        description: tour.description || `Tour package in ${tour.city}`,
        availability: "in stock",
        condition: "new",
        price: `${tour.basePrice.toFixed(3)} OMR`,
        currency: "OMR",
        link: `${baseUrl}/shop`,
        image_link: tourImg,
        brand: "Tours & Travel",
        category: "Tours",
      }
    }),
    ...wcProducts.map((p) => {
      const priceNum = parseFloat(p.price || p.regular_price || "0")
      const img = p.images?.[0]?.src || `${baseUrl}/logo.png`
      const cat = p.categories?.[0]?.name || "Retail"
      return {
        id: `wc_${p.id}`,
        retailer_id: `wc_${p.id}`,
        title: p.name,
        description: (p.short_description || p.description || p.name).replace(/<[^>]*>?/gm, "").slice(0, 300),
        availability: p.stock_status === "outofstock" ? "out of stock" : "in stock",
        condition: "new",
        price: `${priceNum.toFixed(3)} OMR`,
        currency: "OMR",
        link: p.permalink || `${baseUrl}/shop`,
        image_link: img,
        brand: "Store Product",
        category: cat,
      }
    }),
  ]

  return NextResponse.json({
    success: true,
    totalItems: catalogFeed.length,
    coursesCount: courseItems.length,
    menuItemsCount: menuItems.length,
    toursCount: tours.length,
    wooCommerceCount: wcProducts.length,
    feed: catalogFeed,
  })
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json(
      { error: "403 – Access Denied: Workspace context required to sync catalog." },
      { status: 401 },
    )
  }

  const tenantId = tenant.tenantId
  const body = await request.json().catch(() => ({}))
  const catalogId = body.catalogId || process.env.META_CATALOG_ID

  if (!catalogId) {
    return NextResponse.json({ error: "Missing Meta catalogId parameter" }, { status: 400 })
  }

  const config = await getWhatsAppConfig()

  if (!config.accessToken) {
    return NextResponse.json({ error: "WhatsApp Access Token not configured" }, { status: 400 })
  }

  const [menuItems, tours, wcCache, courses] = await Promise.all([
    db.menuItem.findMany({
      where: { tenantId },
      include: { category: true },
    }),
    db.tour.findMany({
      where: { tenantId, status: "ACTIVE" },
    }),
    db.systemSetting.findFirst({
      where: { tenantId, key: "WOOCOMMERCE_PRODUCTS_CACHE" },
    }),
    getTenantCourses(tenantId).catch(() => []),
  ])

  let wcProducts: any[] = []
  if (wcCache?.value) {
    try {
      const parsed = JSON.parse(wcCache.value)
      if (Array.isArray(parsed.products)) {
        wcProducts = parsed.products
      }
    } catch {}
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.fizmoh.cloud"

  const courseRequests = courses
    .filter((c: any) => c.status === "PUBLISHED" || !c.status)
    .map((c: any) => {
      const priceNum = Number(c.discountPrice && c.discountPrice > 0 ? c.discountPrice : c.standardPrice || c.price || 0)
      const img = c.bannerImage || c.heroImage || `${baseUrl}/logo.png`
      const currency = c.currency || "OMR"
      return {
        method: "UPDATE",
        retailer_id: `course_${c.id}`,
        data: {
          title: c.name || c.title || "Professional Course",
          description: (c.subtitle || c.description || c.title || "Training Course").replace(/<[^>]*>?/gm, "").slice(0, 300),
          availability: "in stock",
          price: Math.round(priceNum * 100),
          currency,
          link: `${baseUrl}/training/${c.slug || c.id}`,
          image_url: img,
          brand: "Training Academy",
          category: c.category || "Professional Training",
        },
      }
    })

  const requests = [
    ...courseRequests,
    ...menuItems.map((item) => ({
      method: "UPDATE",
      retailer_id: `dish_${item.id}`,
      data: {
        title: item.name,
        description: item.description || `${item.category?.name || "Gourmet"} dish`,
        availability: item.isAvailable ? "in stock" : "out of stock",
        price: Math.round(item.price * 100), // cents / baisa
        currency: "OMR",
        link: `${baseUrl}/shop`,
        image_url: item.imageUrl || `${baseUrl}/logo.png`,
        brand: "Restaurant",
        category: item.category?.name || "Gourmet",
      },
    })),
    ...tours.map((tour) => {
      const mediaArr = Array.isArray(tour.media) ? (tour.media as any[]) : []
      const tourImg = (tour as any).imageUrl || mediaArr[0]?.url || `${baseUrl}/logo.png`
      return {
        method: "UPDATE",
        retailer_id: `tour_${tour.id}`,
        data: {
          title: tour.name,
          description: tour.description || `Tour in ${tour.city}`,
          availability: "in stock",
          price: Math.round(tour.basePrice * 100),
          currency: "OMR",
          link: `${baseUrl}/shop`,
          image_url: tourImg,
          brand: "Tours & Travel",
          category: "Tours",
        },
      }
    }),
    ...wcProducts.map((p) => {
      const priceNum = parseFloat(p.price || p.regular_price || "0")
      const img = p.images?.[0]?.src || `${baseUrl}/logo.png`
      const cat = p.categories?.[0]?.name || "Retail"
      return {
        method: "UPDATE",
        retailer_id: `wc_${p.id}`,
        data: {
          title: p.name,
          description: (p.short_description || p.description || p.name).replace(/<[^>]*>?/gm, "").slice(0, 300),
          availability: p.stock_status === "outofstock" ? "out of stock" : "in stock",
          price: Math.round(priceNum * 100),
          currency: "OMR",
          link: p.permalink || `${baseUrl}/shop`,
          image_url: img,
          brand: "Store Product",
          category: cat,
        },
      }
    }),
  ]

  // Submit batch to Meta Graph API
  try {
    const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${catalogId}/items_batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        item_type: "PRODUCT_ITEM",
        requests,
      }),
    })

    const metaResult = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { error: metaResult.error?.message || "Failed to sync catalog batch with Meta" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      catalogId,
      syncedCount: requests.length,
      coursesCount: courseRequests.length,
      menuItemsCount: menuItems.length,
      toursCount: tours.length,
      wooCommerceCount: wcProducts.length,
      metaHandle: metaResult.handles || metaResult.id,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Meta Batch sync error" }, { status: 500 })
  }
})
