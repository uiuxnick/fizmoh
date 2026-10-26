import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { defaultCanvasDesign, type CanvasDesign, PAPER_SIZES } from "@/lib/qr-canvas-design"
import { currentTenant } from "@/lib/tenant"

const EDIT_ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "MARKETING", "PLATFORM"]
const MAX_DESIGN_BYTES = 8 * 1024 * 1024 // generous — a design can carry a few embedded logo images

/** Loads the saved canvas design, or a sane default if nobody has customised one yet. */
export const GET = withErrors(withModule("DIGITAL_QR", async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const qrCode = await db.qrCode.findUnique({ where: { id }, select: { design: true, label: true, token: true } })
  if (!qrCode) return NextResponse.json({ error: "No such QR code" }, { status: 404 })

  const design = (qrCode.design as CanvasDesign | null) || defaultCanvasDesign()
  return NextResponse.json({ design, label: qrCode.label, token: qrCode.token })
}))

function isValidDesign(value: unknown): value is CanvasDesign {
  if (!value || typeof value !== "object") return false
  const d = value as Record<string, unknown>
  if (!(typeof d.paperSize === "string" && d.paperSize in PAPER_SIZES)) return false
  if (!Array.isArray(d.layers)) return false
  return d.layers.length <= 60 // a design this size has stopped being a print sign
}

/** Saves the canvas design as-is — the editor is the source of truth, this just persists it. */
export const PUT = withErrors(withModule("DIGITAL_QR", async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const tenant = currentTenant()
  if (tenant?.role && !EDIT_ROLES.includes(tenant.role)) {
    return NextResponse.json({ error: "Only marketing or workspace administrators can save QR designs" }, { status: 403 })
  }
  const { id } = await params
  const qrCode = await db.qrCode.findUnique({ where: { id }, select: { id: true } })
  if (!qrCode) return NextResponse.json({ error: "No such QR code" }, { status: 404 })

  const raw = await request.text()
  if (raw.length > MAX_DESIGN_BYTES) return NextResponse.json({ error: "Design is too large to save" }, { status: 413 })

  const body = JSON.parse(raw || "{}")
  const design = body?.design
  if (!isValidDesign(design)) return NextResponse.json({ error: "Malformed design" }, { status: 400 })

  await db.qrCode.update({ where: { id }, data: { design } })
  return NextResponse.json({ ok: true })
}))
