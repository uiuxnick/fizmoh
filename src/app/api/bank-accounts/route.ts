import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"

/**
 * Bank accounts for customer transfers.
 *
 * GET is public because the checkout has to show the customer where to send
 * money, so it returns only accounts that are currently active — an inactive
 * or closed account should never be published.
 */
export const GET = withErrors(async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 400 })
  const accounts = await db.bankAccount.findMany({
    where: { tenantId: tenant.tenantId, isActive: true },
    orderBy: { isDefault: "desc" },
  })
  return NextResponse.json({ accounts })
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER", "FINANCE"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only finance or workspace administrators can manage bank accounts" }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  // Whitelisted rather than passing the body straight to Prisma, which would
  // let a caller set `id`, `createdAt` or any future column.
  /*
   * A phone transfer is the same destination in a different shape.
   *
   * It has a name and a number and nothing else — no bank, no IBAN, no SWIFT,
   * no branch. Requiring a bank name for one would force the operator to
   * invent something that then gets shown to a customer as fact, so the
   * required fields follow the type.
   */
  const type = String(body.type || "BANK").trim().toUpperCase() === "PHONE" ? "PHONE" : "BANK"
  const bankName = String(body.bankName || "").trim()
  const accountName = String(body.accountName || "").trim()
  const accountNumber = String(body.accountNumber || "").trim()

  if (type === "PHONE") {
    if (!accountName || !accountNumber) {
      return NextResponse.json({ error: "Name and phone number are required" }, { status: 400 })
    }
  } else if (!bankName || !accountName || !accountNumber) {
    return NextResponse.json({ error: "Bank name, account name and account number are required" }, { status: 400 })
  }

  const data = {
    type,
    // Kept non-empty because the column is NOT NULL, but never shown for a
    // phone row — the flow renders those from the name and number alone.
    bankName: (type === "PHONE" ? bankName || "Phone transfer" : bankName).slice(0, 200),
    accountName: accountName.slice(0, 200),
    accountNumber: accountNumber.slice(0, 100),
    iban: type === "BANK" && body.iban ? String(body.iban).trim().slice(0, 60) : null,
    branch: type === "BANK" && body.branch ? String(body.branch).slice(0, 200) : null,
    swiftCode: type === "BANK" && body.swiftCode ? String(body.swiftCode).trim().slice(0, 20) : null,
    currency: body.currency ? String(body.currency).slice(0, 5) : "OMR",
    isActive: body.isActive !== false,
    isDefault: body.isDefault === true,
  }

  if (data.isDefault) {
    await db.bankAccount.updateMany({ where: { tenantId: tenant.tenantId, isDefault: true }, data: { isDefault: false } })
  }

  const account = await db.bankAccount.create({ data: { ...data, tenantId: tenant.tenantId } })
  return NextResponse.json({ account }, { status: 201 })
})
