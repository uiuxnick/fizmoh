import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { vCardItemSchema } from "@/lib/digital-vcard/validation"

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
    return NextResponse.json({ items: [] })
  }

  const items = await (db as any).businessVCardItem.findMany({
    where: { cardId: card.id, tenantId: tenant.tenantId },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json({ items })
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
  const parseResult = vCardItemSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    )
  }

  const existingCount = await (db as any).businessVCardItem.count({
    where: { cardId: card.id, tenantId: tenant.tenantId },
  })

  const item = await (db as any).businessVCardItem.create({
    data: {
      ...parseResult.data,
      cardId: card.id,
      tenantId: tenant.tenantId,
      sortOrder: parseResult.data.sortOrder ?? existingCount,
    },
  })

  return NextResponse.json({ success: true, item }, { status: 201 })
}))
