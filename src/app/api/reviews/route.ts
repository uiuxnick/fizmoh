import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"
import { sessionFromRequest } from "@/lib/auth"

/**
 * Reviews API
 * Per BRD §6.1: "reviews/ratings"
 * Per BRD §7: "Reviews & ratings with photo upload"
 */

export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 400 })
  const { searchParams } = new URL(request.url)
  const tourId = searchParams.get("tourId")
  const orderId = searchParams.get("orderId")

  const where: any = { tenantId: tenant.tenantId, isPublished: true }
  if (tourId) where.tourId = tourId
  if (orderId) where.orderId = orderId

  const reviews = await db.review.findMany({
    where,
    include: { customer: true, tour: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ reviews })
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  const session = await sessionFromRequest(request)
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  const { customerId, tourId, orderId, rating, title, comment, photos } = body
  const numericRating = Number(rating)
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return NextResponse.json({ error: "Rating must be an integer from 1 to 5" }, { status: 400 })
  }
  if (session?.kind !== "staff" && session?.kind !== "customer") {
    return NextResponse.json({ error: "Sign in to submit a review" }, { status: 401 })
  }
  if (session.kind === "customer" && session.customerId !== customerId) {
    return NextResponse.json({ error: "You can only review your own booking" }, { status: 403 })
  }

  const customer = await db.customer.findFirst({ where: { id: String(customerId || ""), tenantId: tenant.tenantId } })
  const tour = await db.tour.findFirst({ where: { id: String(tourId || ""), tenantId: tenant.tenantId } })
  if (!customer || !tour) return NextResponse.json({ error: "Customer or tour not found" }, { status: 404 })
  if (orderId) {
    const order = await db.order.findFirst({ where: { id: String(orderId), tenantId: tenant.tenantId, customerId: customer.id, tourId: tour.id } })
    if (!order) return NextResponse.json({ error: "Review must be linked to your booking" }, { status: 400 })
  }

  const review = await db.review.create({
    data: {
      tenantId: tenant.tenantId,
      customerId: customer.id,
      tourId: tour.id,
      orderId: orderId || null,
      rating: numericRating,
      title: title ? String(title).slice(0, 200) : null,
      comment: comment ? String(comment).slice(0, 5000) : null,
      photos: photos ? JSON.stringify(photos) : undefined,
      isPublished: true,
    },
  })

  // Update tour rating
  const allReviews = await db.review.findMany({ where: { tenantId: tenant.tenantId, tourId: tour.id, isPublished: true } })
  const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
  await db.tour.update({
    where: { id: tour.id },
    data: { rating: parseFloat(avgRating.toFixed(1)), reviewCount: allReviews.length },
  })

  // Award loyalty points for review
  await db.customer.update({
    where: { id: customer.id },
    data: { loyaltyPoints: { increment: 50 } },
  })

  return NextResponse.json({ review }, { status: 201 })
})
