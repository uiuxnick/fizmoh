import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { renderCanvasDesignPDF, PAPER_SIZES, type CanvasDesign } from "@/lib/qr-canvas-design"

/**
 * Renders whatever design is currently on screen — not necessarily saved yet —
 * so "Export PDF" always matches what the editor shows.
 */
export const POST = withErrors(withModule("DIGITAL_QR", async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const qrCode = await db.qrCode.findUnique({ where: { id } })
  if (!qrCode) return NextResponse.json({ error: "No such QR code" }, { status: 404 })

  const body = await request.json().catch(() => null)
  const design = body?.design as CanvasDesign | undefined
  if (!design || !(design.paperSize in PAPER_SIZES) || !Array.isArray(design.layers)) {
    return NextResponse.json({ error: "Malformed design" }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin
  const reviewUrl = `${base}/r/${qrCode.token}`

  const bytes = await renderCanvasDesignPDF({ design, reviewUrl })
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="qr-${qrCode.label.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}))
