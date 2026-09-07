import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { vCardItemSchema } from "@/lib/digital-vcard/validation"

export const PUT = withErrors(withModule("DIGITAL_VCARD", async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "No active tenant selected" }, { status: 400 })
  }

  const params = await context?.params
  const id = params?.id
  if (!id) {
    return NextResponse.json({ error: "Item ID is required" }, { status: 400 })
  }

  const existing = await (db as any).businessVCardItem.findFirst({
    where: { id, tenantId: tenant.tenantId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Service or product item not found" }, { status: 404 })
  }

  const body = await request.json()
  const parseResult = vCardItemSchema.partial().safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    )
  }

  const updated = await (db as any).businessVCardItem.update({
    where: { id },
    data: parseResult.data,
  })

  return NextResponse.json({ success: true, item: updated })
}))

export const DELETE = withErrors(withModule("DIGITAL_VCARD", async (
  _request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "No active tenant selected" }, { status: 400 })
  }

  const params = await context?.params
  const id = params?.id
  if (!id) {
    return NextResponse.json({ error: "Item ID is required" }, { status: 400 })
  }

  const existing = await (db as any).businessVCardItem.findFirst({
    where: { id, tenantId: tenant.tenantId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  await (db as any).businessVCardItem.delete({
    where: { id },
  })

  return NextResponse.json({ success: true, message: "Item deleted successfully" })
}))
