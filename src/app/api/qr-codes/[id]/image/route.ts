import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import QRCode from "qrcode"

/**
 * Just the QR code, as a plain PNG — for viewing or a quick download, without
 * going through the full print-design flow. Same encoding as the design
 * generator (errorCorrectionLevel H): whichever surface a customer scans
 * from, it is the same reliable code.
 */
export const GET = withErrors(withModule("DIGITAL_QR", async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const qrCode = await db.qrCode.findUnique({ where: { id } })
  if (!qrCode) return NextResponse.json({ error: "No such QR code" }, { status: 404 })

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin
  const reviewUrl = `${base}/r/${qrCode.token}`

  const png = await QRCode.toBuffer(reviewUrl, { errorCorrectionLevel: "H", margin: 2, width: 600 })

  return new NextResponse(Buffer.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="qr-${qrCode.label.replace(/[^a-z0-9]+/gi, "-")}.png"`,
      "Cache-Control": "no-store",
    },
  })
}))
