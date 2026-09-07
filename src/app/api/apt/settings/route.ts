import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"

export const GET = withErrors(async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let settings = await db.aptSettings.findUnique({
    where: { tenantId: tenant.tenantId },
  })

  if (!settings) {
    settings = await db.aptSettings.create({
      data: { tenantId: tenant.tenantId },
    })
  }

  return NextResponse.json({ settings })
})

export const PUT = withErrors(async (req: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  const settings = await db.aptSettings.upsert({
    where: { tenantId: tenant.tenantId },
    create: { tenantId: tenant.tenantId, ...body },
    update: body,
  })

  return NextResponse.json({ settings })
})
