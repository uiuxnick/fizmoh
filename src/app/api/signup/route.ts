import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { checkSharedRateLimit as checkRateLimit, requestIp } from "@/lib/rate-limit"

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
  business: z.string().trim().min(2, "Business name must be at least 2 characters").max(80),
  name: z.string().trim().min(2, "Your name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Please provide a valid email address"),
  phone: z.string().trim().min(7, "Please provide a valid WhatsApp phone number").max(20),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  /** Optional: what they want to be called at fizmoh.cloud. */
  slug: z.string().trim().toLowerCase().optional(),
  planSlug: z.string().trim().min(1, "Please choose a subscription plan to continue."),
})

export const POST = withErrors(async (request: NextRequest) => {
  // Sign-up is the one endpoint an unknown person is meant to reach, which
  // makes it the one worth limiting hardest.
  const rate = await checkRateLimit(`signup:${requestIp(request.headers)}`, 5, 60 * 60 * 1000)
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many sign-ups from here. Try again later." }, { status: 429 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message
    return NextResponse.json(
      { error: issue || "Check the form: a business name, your name, a valid email, a WhatsApp phone number, choose a plan, and a password of at least 8 characters." },
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
    (await db.plan.findFirst({ where: { slug: input.planSlug, isPublic: true } })) ??
    (await db.plan.findUnique({ where: { slug: input.planSlug } }))

  if (!plan) {
    return NextResponse.json(
      { error: "The selected plan is not valid. Please choose a plan from the list." },
      { status: 400 },
    )
  }

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + (plan.trialDays ?? 14))

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
        phone: input.phone,
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

  // Alert platform operator of new workspace signup
  try {
    const { sendEmail } = await import("@/lib/notifications")
    const alertRecipient = process.env.ADMIN_ALERT_EMAIL || "rajgumgi@gmail.com"
    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: "Asia/Muscat",
    }).format(new Date())

    const cleanPhone = input.phone.replace(/[^0-9]/g, "")
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null

    sendEmail({
      to: alertRecipient,
      subject: `🎉 New Tenant Signup: ${tenant.name} (${input.phone})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #00E785; padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #1D1D1D; font-size: 22px; font-weight: 800;">New Business Account Created!</h1>
            <p style="margin: 4px 0 0 0; color: #1D1D1D; font-size: 14px; font-weight: 600;">Fizmoh Platform Signup Alert</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px; color: #334155; margin-top: 0;">A new tenant has just registered on <strong>app.fizmoh.cloud</strong>:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 140px;">Workspace Name</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${tenant.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Workspace URL</td>
                <td style="padding: 10px 0; color: #0f172a;"><a href="https://app.fizmoh.cloud/${tenant.slug}" style="color: #00B96A; font-weight: 600; text-decoration: none;">app.fizmoh.cloud/${tenant.slug}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Admin Name</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${staff.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Email Address</td>
                <td style="padding: 10px 0; color: #0f172a;"><a href="mailto:${staff.email}" style="color: #0284c7; text-decoration: none;">${staff.email}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">WhatsApp Phone</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${input.phone} ${waLink ? `&nbsp;(<a href="${waLink}" style="color: #059669; text-decoration: underline;">Chat on WhatsApp &rarr;</a>)` : ""}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Selected Plan</td>
                <td style="padding: 10px 0; color: #00B96A; font-weight: 700;">${plan.name} (${plan.slug}) &middot; ${(plan.priceMonthly / 1000).toFixed(0)} OMR/mo (Trial ends ${trialEndsAt.toLocaleDateString("en-GB")})</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Registered At</td>
                <td style="padding: 10px 0; color: #0f172a;">${formattedDate} (Oman Time)</td>
              </tr>
            </table>

            <div style="margin-top: 28px; text-align: center;">
              <a href="https://app.fizmoh.cloud/platform/workspaces" style="display: inline-block; background: #1D1D1D; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none;">
                Open Platform Console &rarr;
              </a>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
            Fizmoh Cloud Notification System · Generated automatically for Platform Operators
          </div>
        </div>
      `,
      text: `New Tenant Signup!\n\nWorkspace: ${tenant.name} (app.fizmoh.cloud/${tenant.slug})\nAdmin: ${staff.name}\nEmail: ${staff.email}\nPhone: ${input.phone}\nPlan: ${plan.name} (${plan.slug}) — ${(plan.priceMonthly / 1000).toFixed(0)} OMR/mo\nRegistered: ${formattedDate} (Muscat)\n\nManage in console: https://app.fizmoh.cloud/platform/workspaces`,
    }).catch(err => {
      console.error("[Signup Alert] Failed to send operator email:", err)
    })
  } catch (err) {
    console.error("[Signup Alert] Setup error:", err)
  }

  return NextResponse.json({
    workspace: {
      slug: tenant.slug,
      name: tenant.name,
      plan: {
        slug: plan.slug,
        name: plan.name,
      },
    },
    url: "https://app.fizmoh.cloud",
    trialEndsAt,
    plan: plan.slug,
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
