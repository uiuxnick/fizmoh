import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { vCardGalleryItemSchema } from "@/lib/digital-vcard/validation"

export const GET = withErrors(withModule("DIGITAL_VCARD", async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "No active tenant selected" }, { status: 400 })
  }

  const card = await (db as any).businessVCard.findFirst({
    where: { tenantId: tenant.tenantId },
    select: { id: true },
  })

  if (!card) {
    return NextResponse.json({ gallery: [] })
  }

  const gallery = await (db as any).businessVCardGalleryItem.findMany({
    where: { cardId: card.id, tenantId: tenant.tenantId },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json({ gallery })
}))

export const POST = withErrors(withModule("DIGITAL_VCARD", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "No active tenant selected" }, { status: 400 })
  }

  const card = await (db as any).businessVCard.findFirst({
    where: { tenantId: tenant.tenantId },
    select: { id: true },
  })

  if (!card) {
    return NextResponse.json({ error: "Please configure your business card first." }, { status: 400 })
  }

  const body = await request.json()
  const parseResult = vCardGalleryItemSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    )
  }

  const existingCount = await (db as any).businessVCardGalleryItem.count({
    where: { cardId: card.id, tenantId: tenant.tenantId },
  })

  const item = await (db as any).businessVCardGalleryItem.create({
    data: {
      ...parseResult.data,
      cardId: card.id,
      tenantId: tenant.tenantId,
      sortOrder: parseResult.data.sortOrder ?? existingCount,
    },
  })

  return NextResponse.json({ success: true, item }, { status: 201 })
}))

export const DELETE = withErrors(withModule("DIGITAL_VCARD", async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "No active tenant selected" }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Gallery item ID is required" }, { status: 400 })
  }

  const existing = await (db as any).businessVCardGalleryItem.findFirst({
    where: { id, tenantId: tenant.tenantId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Gallery item not found" }, { status: 404 })
  }

  await (db as any).businessVCardGalleryItem.delete({
    where: { id },
  })

  return NextResponse.json({ success: true, message: "Gallery item deleted successfully" })
}))
