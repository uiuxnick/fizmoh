import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { raw } from "@/lib/db"
import { tenantOf, withTenant } from "@/lib/tenant"
import { scanFingerprint, qrRateLimited } from "@/lib/qr-review"
import { withinLimit } from "@/lib/entitlements"

/**
 * A QR code has just been scanned.
 *
 * Public and anonymous by design — a customer standing at a table has no
 * account and none should be required. The token in the URL is the only
 * credential: it identifies exactly one QrCode row, and that row's own
 * tenantId is what scopes everything created from here on, the same pattern
 * public booking/payment routes already use (tenantOf + withTenant) so a
 * customer can never end up looking at, or writing into, another business's
 * data.
 */
export const POST = withErrors(async (request: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
  const limited = qrRateLimited(request.headers, "scan")
  if (limited) return limited

  const { token } = await params

  const qr = await raw.qrCode.findUnique({
    where: { token },
    include: { campaign: true },
  })
  if (!qr || !qr.isActive) return NextResponse.json({ error: "This QR code is not active" }, { status: 404 })
  if (qr.campaign.status !== "ACTIVE") {
    return NextResponse.json({ error: "This review campaign is not currently active" }, { status: 404 })
  }

  const tenant = await tenantOf(qr.tenantId)
  if (!tenant) return NextResponse.json({ error: "No such workspace" }, { status: 404 })

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const userAgent = request.headers.get("user-agent") || ""
  const fingerprint = scanFingerprint(ip, userAgent, qr.id)

  const result = await withTenant(tenant, async () => {
    const { db } = await import("@/lib/db")

    // A free-tier scan cap, enforced the same way every other plan ceiling in
    // the app is (src/lib/entitlements.ts) — a plan with no limit set is
    // unlimited, so this is a no-op until the platform actually configures
    // one. The QR stays reachable either way; only the review flow beyond it
    // is gated, so a business over its cap gets told to upgrade rather than
    // its customers seeing a broken code.
    const room = await withinLimit("qrScansPerMonth")
    if (!room.ok) return { limitReached: true as const, used: room.used, cap: room.cap }

    const seenBefore = await db.qrScan.findFirst({ where: { qrCodeId: qr.id, fingerprint } })
    await db.qrScan.create({
      data: { tenantId: tenant.tenantId, qrCodeId: qr.id, fingerprint, isUnique: !seenBefore, userAgent: userAgent.slice(0, 300) },
    })

    const session = await db.reviewSession.create({
      data: { tenantId: tenant.tenantId, campaignId: qr.campaignId, qrCodeId: qr.id, status: "STARTED" },
    })

    const tenantRow = await db.tenant.findUnique({ where: { id: qr.tenantId }, select: { name: true, logoUrl: true } })

    return { limitReached: false as const, session, campaign: qr.campaign, qrLabel: qr.label, business: tenantRow }
  })

  if (result.limitReached) {
    return NextResponse.json(
      { error: "This business has reached its monthly review scan limit. Please try again next month." },
      { status: 402 },
    )
  }

  return NextResponse.json({
    sessionId: result.session.id,
    business: { name: result.business?.name || "", logoUrl: result.business?.logoUrl || null },
    campaign: {
      name: result.campaign.name,
      language: result.campaign.language,
      // Advisory, not a gate: every rating can post to Google (see
      // /sessions/[id]/confirm). This only tells the client when to also
      // offer the private-feedback option alongside it.
      ratingThreshold: result.campaign.ratingThreshold,
    },
    qrLabel: result.qrLabel,
  })
})
