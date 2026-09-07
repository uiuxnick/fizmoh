import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (typeof body.type === "string") {
    data.type = body.type.trim().toUpperCase() === "PHONE" ? "PHONE" : "BANK"
  }
  for (const field of ["bankName", "accountName", "accountNumber", "iban", "branch", "swiftCode", "currency"]) {
    if (body[field] === undefined) continue
    data[field] = body[field] ? String(body[field]).trim().slice(0, 200) : null
  }
  if (body.isActive !== undefined) data.isActive = body.isActive === true
  if (body.isDefault === true) {
    // Only one account can be the default the checkout offers first.
    await db.bankAccount.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
    data.isDefault = true
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const account = await db.bankAccount.update({ where: { id }, data })
  return NextResponse.json({ account })
})

export const DELETE = withErrors(async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  // Payments reference the account customers were told to pay into. Removing
  // it would leave those records pointing at nothing, so deactivating is the
  // right move — it disappears from checkout while the history stays intact.
  const account = await db.bankAccount.findUnique({ where: { id } })
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })

  await db.bankAccount.update({ where: { id }, data: { isActive: false, isDefault: false } })
  return NextResponse.json({ success: true, deactivated: true })
})
