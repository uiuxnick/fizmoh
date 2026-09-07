import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { createSecureToken } from "@/lib/restaurant"

export const GET = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ tables: [] })

  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get("branchId")
  const type = searchParams.get("type")

  const tables = await raw.restaurantTable.findMany({
    where: {
      tenantId,
      ...(branchId ? { branchId } : {}),
      ...(type ? { type } : {}),
    },
    include: {
      branch: { select: { id: true, name: true, slug: true } },
      orders: {
        where: {
          status: { in: ["PENDING", "ACCEPTED", "PREPARING", "READY"] },
        },
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          publicToken: true,
          status: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
        },
      },
      waiterRequests: {
        where: { status: "PENDING" },
        take: 3,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ number: "asc" }],
  })

  // Ensure every table has a secure QR token
  const tablesWithTokens = await Promise.all(
    tables.map(async (t) => {
      if (!t.token) {
        const token = createSecureToken("tab")
        await raw.restaurantTable.update({
          where: { id: t.id },
          data: { token },
        }).catch(() => {})
        return { ...t, token }
      }
      return t
    })
  )

  return NextResponse.json({ tables: tablesWithTokens })
}))

export const POST = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()
  const { number, name, capacity, section, area, type, roomNumber, branchId } = body

  if (!number) return NextResponse.json({ error: "Table or room number is required" }, { status: 400 })

  const token = createSecureToken("tab")

  const table = await raw.restaurantTable.create({
    data: {
      tenantId,
      branchId: branchId || undefined,
      number: String(number).trim(),
      name: name ? String(name).trim() : null,
      capacity: Number(capacity) || 4,
      section: section || "MAIN",
      area: area || "INDOOR",
      type: type || "TABLE",
      roomNumber: roomNumber ? String(roomNumber).trim() : null,
      token,
      status: "AVAILABLE",
    },
  })

  return NextResponse.json({ table }, { status: 201 })
}))

export const PUT = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const body = await req.json()
  const { id, status, capacity, section, area, type, roomNumber, branchId, name } = body

  if (!id) return NextResponse.json({ error: "Table ID required" }, { status: 400 })

  await raw.restaurantTable.updateMany({
    where: { id, tenantId },
    data: {
      ...(status ? { status } : {}),
      ...(capacity ? { capacity: Number(capacity) } : {}),
      ...(section ? { section } : {}),
      ...(area ? { area } : {}),
      ...(type ? { type } : {}),
      ...(roomNumber !== undefined ? { roomNumber: roomNumber ? String(roomNumber).trim() : null } : {}),
      ...(branchId !== undefined ? { branchId: branchId || null } : {}),
      ...(name !== undefined ? { name: name ? String(name).trim() : null } : {}),
    },
  })

  return NextResponse.json({ updated: true })
}))

export const DELETE = withErrors(withModule("RESTAURANT", async (req: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "Table ID required" }, { status: 400 })

  await raw.restaurantTable.deleteMany({
    where: { id, tenantId },
  })

  return NextResponse.json({ deleted: true })
}))
