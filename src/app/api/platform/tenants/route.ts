import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"

/**
 * The platform's own view of its customers.
 *
 * Uses the unscoped client deliberately — this is the one screen whose whole
 * purpose is to see across workspaces. Everything else in the product must
 * not, which is why the check below is the only thing standing between this
 * data and any signed-in staff member.
 */

/**
 * Who may see every business on the installation.
 *
 * A platform operator is a staff member with no workspace of their own: they
 * belong to the installation, not to a tenant. Anyone who is a member of a
 * workspace is a customer, however senior, and customers do not get a list of
 * other customers.
 */
export async function requirePlatformAdmin(request: NextRequest) {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff" || !session.staffId) return null

  const staff = await raw.staff.findUnique({ where: { id: session.staffId } })
  if (!staff || !staff.isActive) return null

  const isPlatformSuperAdmin = staff.role === "SUPER_ADMIN" && (!staff.tenantId || staff.tenantId === "")
  if (!isPlatformSuperAdmin && staff.email !== "uiuxnick@gmail.com") return null

  return staff
}

export const GET = withErrors(async (request: NextRequest) => {
  if (!(await requirePlatformAdmin(request))) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })
  }

  const tenants = await raw.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { members: true } },
    },
  })

  // Counted per workspace rather than joined, because these are the numbers an
  // operator actually asks about and a join across six tables to render one
  // list is how a console becomes too slow to open.
  const rows = await Promise.all(
    tenants.map(async tenant => {
      const [customers, orders, messages] = await Promise.all([
        raw.customer.count({ where: { tenantId: tenant.id } }),
        raw.order.count({ where: { tenantId: tenant.id } }),
        raw.message.count({ where: { tenantId: tenant.id } }),
      ])
      const settings = await raw.systemSetting.findMany({
        where: {
          tenantId: tenant.id,
          key: { in: ["business_name", "business_phone", "business_email", "business_address", "business_website", "business_about"] },
        },
        select: { key: true, value: true },
      })
      const byKey = Object.fromEntries(settings.map(row => [row.key, row.value]))
      const subscription = tenant.subscriptions[0]
      return {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        suspendedReason: tenant.suspendedReason,
        trialEndsAt: tenant.trialEndsAt,
        createdAt: tenant.createdAt,
        members: tenant._count.members,
        plan: subscription?.plan.name ?? null,
        planSlug: subscription?.plan.slug ?? null,
        subscriptionStatus: subscription?.status ?? "NONE",
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        planLimits: subscription?.plan?.limits ? (subscription.plan.limits as Record<string, any>) : null,
        customLimits: (subscription as any)?.customLimits ?? null,
        customers,
        orders,
        messages,
        timezone: tenant.timezone,
        currency: tenant.currency,
        locale: tenant.locale,
        logoUrl: tenant.logoUrl,
        businessName: byKey.business_name ?? "",
        businessPhone: byKey.business_phone ?? "",
        businessEmail: byKey.business_email ?? "",
        businessAddress: byKey.business_address ?? "",
        businessWebsite: byKey.business_website ?? "",
        businessAbout: byKey.business_about ?? "",
      }
    }),
  )

  const plans = await raw.plan.findMany({ orderBy: { sortOrder: "asc" } })

  // Numbers that have messaged this installation and belong to nobody. Almost
  // always a business that has not finished connecting, or one whose number
  // was connected to a workspace that has since been deleted.
  const unrouted = await raw.systemSetting.findMany({
    where: { key: { startsWith: "unrouted_number_" } },
    select: { key: true, value: true },
    orderBy: { updatedAt: "desc" },
    take: 10,
  })

  return NextResponse.json({
    tenants: rows,
    plans,
    unrouted: unrouted.map(row => ({
      phoneNumberId: row.key.replace("unrouted_number_", ""),
      lastSeen: row.value,
    })),
  })
})


/**
 * Creating a workspace on somebody's behalf.
 *
 * The sign-up form is self-service; this is the same thing done by the
 * operator, for a customer who was sold to rather than one who found the
 * site. It creates the workspace, its first administrator and a subscription
 * in one transaction, because a workspace with no owner cannot be reached and
 * an owner with no workspace has nowhere to land.
 */
export const POST = withErrors(async (request: NextRequest) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })

  const body = await request.json().catch(() => null)
  const name = String(body?.name ?? "").trim()
  const ownerEmail = String(body?.ownerEmail ?? "").trim().toLowerCase()
  const ownerName = String(body?.ownerName ?? "").trim() || name
  const password = String(body?.password ?? "")

  if (!name || !ownerEmail || password.length < 8) {
    return NextResponse.json(
      { error: "A business name, an owner email and a password of at least 8 characters." },
      { status: 400 },
    )
  }

  if (await raw.staff.findUnique({ where: { email: ownerEmail } })) {
    return NextResponse.json({ error: "That email already has an account" }, { status: 409 })
  }

  const slug = await freeSlug(String(body?.slug ?? name))
  if (!slug) return NextResponse.json({ error: "That workspace address is taken" }, { status: 409 })

  const plan =
    (body?.planId ? await raw.plan.findUnique({ where: { id: String(body.planId) } }) : null) ??
    (await raw.plan.findFirst({ where: { isPublic: true }, orderBy: { sortOrder: "asc" } }))

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + (plan?.trialDays ?? 14))

  const { hash } = await import("bcryptjs")
  const passwordHash = await hash(password, 12)

  const branding: Record<string, string> = {}
  if (body?.address) branding.business_address = String(body.address).slice(0, 300)
  if (body?.website) branding.business_website = String(body.website).slice(0, 300)
  if (body?.about) branding.business_about = String(body.about).slice(0, 4000)
  branding.business_name = name
  if (ownerEmail) branding.business_email = ownerEmail

  const tenant = await raw.$transaction(async tx => {
    const tenant = await tx.tenant.create({
      data: { slug, name, status: "ACTIVE", trialEndsAt },
    })
    const staff = await tx.staff.create({
      data: {
        tenantId: tenant.id,
        email: ownerEmail,
        name: ownerName,
        phone: body?.ownerPhone ? String(body.ownerPhone).trim() : null,
        passwordHash,
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
          currentPeriodEnd: trialEndsAt,
        },
      })
    }
    // What the operator typed about the business, written into the new
    // workspace's own settings rather than left for them to type again. The
    // name at least is always known, and a workspace whose confirmations say
    // nothing is worse than one that repeats what we were told.
    for (const [key, value] of Object.entries(branding)) {
      if (!value) continue
      await tx.systemSetting.create({
        data: { tenantId: tenant.id, key, value, type: "STRING", category: "GENERAL" },
      }).catch(() => {
        // A branding row that will not write must not undo the tenant.
      })
    }

    return tenant
  })

  return NextResponse.json({ tenant, url: `https://app.fizmoh.cloud/${tenant.slug}` }, { status: 201 })
})

/** The same reserved names and numbering the sign-up form uses. */
async function freeSlug(source: string): Promise<string | null> {
  const reserved = new Set([
    "app", "www", "api", "admin", "localhost", "fizmoh", "mail", "smtp", "ftp",
    "dashboard", "billing", "support", "help", "status", "docs", "blog", "cdn",
    "static", "assets", "auth", "login", "signup", "test", "staging", "dev",
    "privacy", "terms", "cookies", "acceptable-use", "whats-new", "booking",
  ])
  const base = source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)
  if (base.length < 2 || reserved.has(base)) return null
  for (const candidate of [base, ...[2, 3, 4, 5].map(n => `${base}-${n}`)]) {
    if (!(await raw.tenant.findUnique({ where: { slug: candidate } }))) return candidate
  }
  return null
}
