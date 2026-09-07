import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { buildTourData, slugify } from "@/lib/tour-fields"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { sessionFromRequest } from "@/lib/auth"

export const GET = withErrors(withModule("TOURS", async (request: NextRequest) => {
  /*
   * A public catalogue has to name its shop.
   *
   * This route is reachable without a session so a storefront can list what a
   * business sells. With no workspace in scope the scoped client does not
   * narrow the query, so an anonymous request returned every tenant's
   * catalogue in one response — 14 tours and 1,176 slots across two unrelated
   * businesses, including their pricing. The workspace comes from the host,
   * the ?workspace= parameter, or the caller's session; without one there is
   * no catalogue to show.
   */
  if (!currentTenant()?.tenantId) {
    return NextResponse.json({ tours: [] })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const city = searchParams.get("city")
  const search = searchParams.get("search")
  const featured = searchParams.get("featured")
  const status = searchParams.get("status")
  if (status === "all" && (await sessionFromRequest(request))?.kind !== "staff") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const where: any = {}
  // Default behavior (customer-facing): only ACTIVE tours
  // When status=all OR status is a specific value: filter accordingly (admin mode)
  if (status && status !== "all") {
    where.status = status
  } else if (!status) {
    where.status = "ACTIVE"
  }
  // status === "all" => no filter (returns everything)

  if (category && category !== "all") where.category = category
  if (city && city !== "all") where.city = city
  if (featured === "true") where.featured = true
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { city: { contains: search } },
    ]
  }

  const tours = await db.tour.findMany({
    where,
    include: { addOns: true },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json({ tours })
}))

export const POST = withErrors(withModule("TOURS", async (request: NextRequest) => {
  if ((await sessionFromRequest(request))?.kind !== "staff") return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const { addOns } = body
  const built = buildTourData(body)
  if (built.error) return NextResponse.json({ error: built.error }, { status: 400 })
  const data = built.data!

  for (const required of ["name", "description", "category", "city"]) {
    if (!data[required]) return NextResponse.json({ error: `${required} is required` }, { status: 400 })
  }
  if (data.basePrice === undefined) return NextResponse.json({ error: "basePrice is required" }, { status: 400 })
  if (data.durationHours === undefined) data.durationHours = 1

  // The slug is part of the public tour URL. Derive it from the name when the
  // form leaves it blank, and append a counter rather than failing on the
  // unique constraint — two "Desert Safari" tours is an ordinary thing to want.
  const base = slugify(String(data.slug || data.name))
  let slug = base
  for (let n = 2; await db.tour.findFirst({ where: { slug } }); n++) slug = `${base}-${n}`
  data.slug = slug

  // Empty JSON columns still need their string form, since everything that
  // reads them calls JSON.parse.
  for (const field of ["media", "itinerary", "inclusions", "exclusions", "whatToBring", "pricingTiers"]) {
    if (data[field] === undefined) data[field] = "[]"
  }

  if (Array.isArray(addOns) && addOns.length > 0) {
    data.addOns = {
      create: addOns.slice(0, 30).map((a: Record<string, unknown>) => ({
        name: String(a.name || "").slice(0, 200),
        price: Number(a.price) || 0,
        type: a.type === "PER_PAX" ? "PER_PAX" : "FLAT",
        isActive: a.isActive !== false,
      })),
    }
  }

  const tour = await db.tour.create({
    data: data as unknown as Prisma.TourCreateInput,
    include: { addOns: true },
  })
  return NextResponse.json({ tour }, { status: 201 })
}))
