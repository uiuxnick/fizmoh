import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { checkRateLimit, requestIp } from "@/lib/rate-limit"

/**
 * A business signing itself up.
 *
 * Creates the workspace, the person who owns it, and a trial — in one
 * transaction, because a workspace with no owner is unreachable and an owner
 * with no workspace has nowhere to land. Either both exist or neither does.
 *
 * No payment is asked for. A trial that requires a card is a trial nobody
 * starts, and the platform can already suspend a workspace that never pays.
 */

const RESERVED = new Set([
  "app", "www", "api", "admin", "localhost", "fizmoh", "mail", "smtp", "ftp",
  "dashboard", "billing", "support", "help", "status", "docs", "blog", "cdn",
  "static", "assets", "auth", "login", "signup", "test", "staging", "dev",
])

const schema = z.object({
  business: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(6).max(20).optional(),
  password: z.string().min(8).max(200),
  /** Optional: what they want to be called at fizmoh.cloud. */
  slug: z.string().trim().toLowerCase().optional(),
  planSlug: z.string().trim().optional(),
})

export const POST = withErrors(async (request: NextRequest) => {
  // Sign-up is the one endpoint an unknown person is meant to reach, which
  // makes it the one worth limiting hardest.
  const rate = checkRateLimit(`signup:${requestIp(request.headers)}`, 5, 60 * 60 * 1000)
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many sign-ups from here. Try again later." }, { status: 429 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the form: a business name, your name, a valid email and a password of at least 8 characters." },
      { status: 400 },
    )
  }
  const input = parsed.data

  const existing = await db.staff.findUnique({ where: { email: input.email } })
  if (existing) {
    return NextResponse.json(
      { error: "That email already has an account. Sign in instead." },
      { status: 409 },
    )
  }

  const slug = await freeSlug(input.slug || input.business)
  if (!slug) {
    return NextResponse.json(
      { error: "That workspace address is taken. Try another." },
      { status: 409 },
    )
  }

  const plan =
    (input.planSlug ? await db.plan.findUnique({ where: { slug: input.planSlug } }) : null) ??
    (await db.plan.findFirst({ where: { isPublic: true }, orderBy: { sortOrder: "asc" } }))

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + (plan?.trialDays ?? 14))

  const passwordHash = await bcrypt.hash(input.password, 12)

  const { tenant, staff } = await db.$transaction(async tx => {
    const tenant = await tx.tenant.create({
      data: { slug, name: input.business, status: "ACTIVE", trialEndsAt },
    })

    const staff = await tx.staff.create({
      data: {
        tenantId: tenant.id,
        email: input.email,
        name: input.name,
        phone: input.phone || null,
        passwordHash,
        // The first person in is the one who can add everyone else.
        role: "SUPER_ADMIN",
      },
    })

    await tx.tenantMember.create({
      data: { tenantId: tenant.id, staffId: staff.id, role: "OWNER" },
    })

    if (plan) {
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: "TRIALING",
          period: "MONTHLY",
          // The trial is the first period. When it ends the sweep treats it
          // like any other unpaid period rather than as a special case.
          currentPeriodEnd: trialEndsAt,
        },
      })
    }

    return { tenant, staff }
  })

  return NextResponse.json({
    workspace: { slug: tenant.slug, name: tenant.name },
    // Every business signs in at the same address. Which workspace they land
    // in is decided by who they are, not by what they typed — no wildcard DNS
    // to provision, no certificate per customer, and a new workspace works the
    // moment it exists.
    url: "https://app.fizmoh.cloud",
    trialEndsAt,
    plan: plan?.slug ?? null,
    email: staff.email,
  }, { status: 201 })
})

/**
 * A usable subdomain derived from what they typed.
 *
 * Tries the obvious one, then numbers it. Returning null rather than inventing
 * something unrecognisable: a business that asked for "acme" should not
 * silently become "acme-7f3a9c".
 */
async function freeSlug(source: string): Promise<string | null> {
  const base = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  if (base.length < 2 || RESERVED.has(base)) return null

  for (const candidate of [base, ...[2, 3, 4, 5].map(n => `${base}-${n}`)]) {
    const taken = await db.tenant.findUnique({ where: { slug: candidate } })
    if (!taken) return candidate
  }
  return null
}
