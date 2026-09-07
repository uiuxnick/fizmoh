import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "MANAGER", "MARKETING"]

/** Every QR placement under a campaign, with its own real scan/session counts. */
export const GET = withErrors(withModule("DIGITAL_QR", async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const codes = await db.qrCode.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { scans: true, sessions: true } },
    },
  })

  const withStats = await Promise.all(codes.map(async c => {
    const [uniqueScans, googleClicks, aiSelected] = await Promise.all([
      db.qrScan.count({ where: { qrCodeId: c.id, isUnique: true } }),
      db.reviewSession.count({ where: { qrCodeId: c.id, googleStatus: "CTA_CLICKED" } }),
      db.reviewSuggestion.count({ where: { session: { qrCodeId: c.id }, isSelected: true } }),
    ])
    return {
      id: c.id, label: c.label, token: c.token, isActive: c.isActive, createdAt: c.createdAt,
      scans: c._count.scans, uniqueScans, reviewSessions: c._count.sessions, googleClicks, aiSelected,
      conversion: c._count.scans > 0 ? Math.round((googleClicks / c._count.scans) * 1000) / 10 : 0,
    }
  }))

  return NextResponse.json({ qrCodes: withStats })
}))

export const POST = withErrors(withModule("DIGITAL_QR", async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can create QR codes" }, { status: 403 })
  }
  const { id } = await params
  const campaign = await db.qrCampaign.findUnique({ where: { id } })
  if (!campaign) return NextResponse.json({ error: "No such campaign" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const label = String(body?.label || "").trim()
  if (!label) return NextResponse.json({ error: "A label is required, e.g. 'Table 01' or 'Main Entrance'" }, { status: 400 })

  // Unguessable — this token is the entire access control for the public
  // customer-facing page (see /api/qr/[token]/scan). 24 random bytes, url-safe.
  const token = randomBytes(18).toString("base64url")

  const qrCode = await db.qrCode.create({
    data: { tenantId: tenant.tenantId, campaignId: id, label: label.slice(0, 120), token },
  })
  return NextResponse.json({ qrCode, reviewUrl: `/r/${qrCode.token}` }, { status: 201 })
}))
