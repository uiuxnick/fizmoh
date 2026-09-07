import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { withErrors } from "@/lib/api-handler"
import { withinLimit, limitReached } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"

const ROLES = ["SUPER_ADMIN", "MANAGER", "FINANCE", "CHAT_AGENT", "GUIDE", "MARKETING"]

/** Matches the cost used for the existing administrator account. */
const BCRYPT_ROUNDS = 12

export const GET = withErrors(async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can view staff" }, { status: 403 })
  }
  const staff = await db.staff.findMany({
    // passwordHash is deliberately not selected — it has no business leaving
    // the server, and this endpoint feeds a browser screen.
    select: {
      id: true, email: true, name: true, phone: true, role: true,
      isActive: true, createdAt: true,
      _count: {
        select: {
          ordersVerified: true,
          conversationsOwned: true,
          orders: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ staff })
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only workspace administrators can create staff" }, { status: 403 })
  }
  // A plan buys a number of people. Checked before the invitation, not after.
  const room = await withinLimit("staff")
  if (!room.ok) return limitReached("staff", room.used, room.cap)

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const email = String(body.email || "").trim().toLowerCase()
  const name = String(body.name || "").trim()
  const password = String(body.password || "")

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 })
  }
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  if (password.length < 10) {
    return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 })
  }
  // A workspace administrator may create operational roles, but cannot mint a
  // new owner or platform administrator through a client-controlled payload.
  const requestedRole = ROLES.includes(body.role) ? body.role : "CHAT_AGENT"
  const role = requestedRole === "SUPER_ADMIN" && tenant.role !== "SUPER_ADMIN" ? "MANAGER" : requestedRole

  // This previously stored the literal string `$2a$10$demo.<email>`, which is
  // not a bcrypt hash. Every account created through this endpoint was
  // therefore impossible to log in to, because compare() can never match it.
  const passwordHash = await hash(password, BCRYPT_ROUNDS)

  try {
    const staff = await db.staff.create({
      data: {
        email,
        name,
        phone: body.phone ? String(body.phone).trim() : null,
        passwordHash,
        role,
        workingHours: body.workingHours ? JSON.stringify(body.workingHours) : null,
      },
      select: { id: true, email: true, name: true, phone: true, role: true, isActive: true, createdAt: true },
    })
    return NextResponse.json({ staff }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A staff member with that email already exists" }, { status: 409 })
    }
    throw error
  }
})
