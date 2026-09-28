import { NextRequest, NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { sessionFromRequest } from "@/lib/auth"
import { currentModules } from "@/lib/entitlements"

export const dynamic = "force-dynamic"
export const revalidate = 0

export interface AgencyBranding {
  agencyName: string
  logoUrl: string
  faviconUrl: string
  primaryColor: string
  portalTitle: string
  supportEmail: string
  supportPhone: string
  customDomain: string
  marginPercentage: number
  footerText: string
  hideFizmohBranding: boolean
}

const DEFAULT_AGENCY_BRANDING: AgencyBranding = {
  agencyName: "My Agency",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#4f46e5",
  portalTitle: "Client Marketing & AI Portal",
  supportEmail: "",
  supportPhone: "",
  customDomain: "",
  marginPercentage: 35,
  footerText: "Powered by Agency Cloud Engine",
  hideFizmohBranding: true,
}

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  }
  const tenantId = tenant.tenantId

  const modules = await currentModules()
  const entitled = modules === null ? true : modules.includes("WHITE_LABEL")

  // Load agency branding from systemSetting
  const settingRow = await db.systemSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "agency_whitelabel_config" } },
  })

  let branding: AgencyBranding = DEFAULT_AGENCY_BRANDING
  if (settingRow?.value) {
    try {
      branding = { ...DEFAULT_AGENCY_BRANDING, ...JSON.parse(settingRow.value) }
    } catch {}
  }

  // Find all sub-workspaces where this staff member is a member, or linked via agency_parent
  let subWorkspaces: any[] = []
  if (session?.staffId) {
    const memberships = await raw.tenantMember.findMany({
      where: { staffId: session.staffId },
      include: {
        tenant: {
          include: {
            subscriptions: {
              include: { plan: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { invitedAt: "asc" },
    })

    subWorkspaces = memberships.map(m => {
      const sub = m.tenant.subscriptions[0]
      return {
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        status: m.tenant.status,
        customDomain: m.tenant.customDomain,
        role: m.role,
        planName: sub?.plan?.name || "Standard",
        planSlug: sub?.plan?.slug || "starter",
        memberCount: m.tenant._count.members,
        createdAt: m.tenant.createdAt,
        isCurrent: m.tenant.id === tenantId,
      }
    })
  }

  // Summary statistics
  const totalSubAccounts = subWorkspaces.length
  const activeSubAccounts = subWorkspaces.filter(w => w.status === "ACTIVE").length

  return NextResponse.json({
    entitled,
    branding,
    subWorkspaces,
    stats: {
      totalSubAccounts,
      activeSubAccounts,
      targetCname: "app.fizmoh.cloud",
    },
  })
})

export const PUT = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  }
  const tenantId = tenant.tenantId

  const body = await request.json()
  const currentSetting = await db.systemSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "agency_whitelabel_config" } },
  })

  let existing: AgencyBranding = DEFAULT_AGENCY_BRANDING
  if (currentSetting?.value) {
    try {
      existing = { ...DEFAULT_AGENCY_BRANDING, ...JSON.parse(currentSetting.value) }
    } catch {}
  }

  const updated: AgencyBranding = {
    ...existing,
    ...body,
    agencyName: String(body.agencyName ?? existing.agencyName).trim(),
    portalTitle: String(body.portalTitle ?? existing.portalTitle).trim(),
    customDomain: String(body.customDomain ?? existing.customDomain).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
  }

  // If agency set a custom domain, also check or link to the agency tenant's custom domain
  if (updated.customDomain && updated.customDomain !== existing.customDomain) {
    const inUse = await raw.tenant.findFirst({
      where: { customDomain: updated.customDomain, id: { not: tenantId } },
    })
    if (inUse) {
      return NextResponse.json({ error: `Domain '${updated.customDomain}' is already in use by another workspace.` }, { status: 400 })
    }
  }

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId, key: "agency_whitelabel_config" } },
    create: {
      tenantId,
      key: "agency_whitelabel_config",
      value: JSON.stringify(updated),
      type: "JSON",
      category: "GENERAL",
    },
    update: {
      value: JSON.stringify(updated),
      type: "JSON",
    },
  })

  return NextResponse.json({ success: true, branding: updated })
})

export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  const tenant = currentTenant()
  if (!tenant?.tenantId || !session?.staffId) {
    return NextResponse.json({ error: "Authentication and workspace required" }, { status: 401 })
  }
  const agencyTenantId = tenant.tenantId

  const body = await request.json()
  const clientName = String(body.clientName || "").trim()
  const rawSlug = String(body.slug || clientName).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  const adminEmail = String(body.adminEmail || "").trim().toLowerCase()
  const adminName = String(body.adminName || clientName).trim()
  const password = String(body.password || "").trim()
  const planSlug = String(body.planSlug || "growth").trim()

  if (!clientName || !rawSlug || !adminEmail) {
    return NextResponse.json({ error: "Client business name, workspace slug, and client admin email are required." }, { status: 400 })
  }

  if (password && password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  }

  // Check slug uniqueness
  const existingTenant = await raw.tenant.findUnique({ where: { slug: rawSlug } })
  if (existingTenant) {
    return NextResponse.json({ error: `Workspace address '${rawSlug}.fizmoh.cloud' is already taken. Please choose another.` }, { status: 409 })
  }

  // Check email
  const existingStaff = await raw.staff.findUnique({ where: { email: adminEmail } })
  if (existingStaff) {
    return NextResponse.json({ error: `An account with email '${adminEmail}' already exists.` }, { status: 409 })
  }

  const { hash } = await import("bcryptjs")
  const defaultPassword = password || `Client@${Math.floor(100000 + Math.random() * 900000)}`
  const passwordHash = await hash(defaultPassword, 12)

  // Find plan
  const plan = (await raw.plan.findUnique({ where: { slug: planSlug } }))
    ?? (await raw.plan.findFirst({ where: { slug: "growth" } }))
    ?? (await raw.plan.findFirst({ orderBy: { sortOrder: "asc" } }))

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + (plan?.trialDays || 30))

  // Create child workspace in transaction
  const created = await raw.$transaction(async tx => {
    const newTenant = await tx.tenant.create({
      data: {
        slug: rawSlug,
        name: clientName,
        status: "ACTIVE",
        trialEndsAt,
      },
    })

    // Create client admin staff
    const clientStaff = await tx.staff.create({
      data: {
        tenantId: newTenant.id,
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    })

    // Link client admin as OWNER of new workspace
    await tx.tenantMember.create({
      data: {
        tenantId: newTenant.id,
        staffId: clientStaff.id,
        role: "OWNER",
      },
    })

    // ALSO link the current agency staff member as OWNER/ADMIN so they have master agency access
    if (session.staffId && session.staffId !== clientStaff.id) {
      await tx.tenantMember.create({
        data: {
          tenantId: newTenant.id,
          staffId: session.staffId,
          role: "SUPER_ADMIN",
        },
      })
    }

    // Attach initial subscription
    if (plan) {
      await tx.subscription.create({
        data: {
          tenantId: newTenant.id,
          planId: plan.id,
          status: "ACTIVE",
          period: "MONTHLY",
          currentPeriodEnd: trialEndsAt,
          moduleSnapshot: plan.modules || [],
          limitSnapshot: plan.limits || {},
        },
      })
    }

    // Record parent agency link
    await tx.systemSetting.create({
      data: {
        tenantId: newTenant.id,
        key: "agency_parent_tenant_id",
        value: agencyTenantId,
        type: "STRING",
        category: "GENERAL",
      },
    })

    return {
      id: newTenant.id,
      name: newTenant.name,
      slug: newTenant.slug,
      adminEmail,
      temporaryPassword: defaultPassword,
    }
  })

  return NextResponse.json({
    success: true,
    message: `Client workspace '${created.name}' created successfully!`,
    workspace: created,
  })
})
