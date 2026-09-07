import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { ensureTableToken } from "@/lib/restaurant"

export const GET = withErrors(withModule("RESTAURANT", async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format") || "json" // json, png, svg

  const table = await raw.restaurantTable.findFirst({
    where: { id, tenantId },
    include: { branch: true },
  })
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 })

  const token = await ensureTableToken(table.id, tenantId)
  const qrTargetUrl = `https://app.fizmoh.cloud/r/${token}`

  if (format === "png") {
    const pngBuffer = await QRCode.toBuffer(qrTargetUrl, {
      type: "png",
      width: 600,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
    return new NextResponse(pngBuffer as any, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="table-${table.number}-qr.png"`,
      },
    })
  }

  if (format === "svg") {
    const svgString = await QRCode.toString(qrTargetUrl, {
      type: "svg",
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
    return new NextResponse(svgString, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `inline; filename="table-${table.number}-qr.svg"`,
      },
    })
  }

  const qrDataUrl = await QRCode.toDataURL(qrTargetUrl, {
    width: 400,
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" },
  })

  return NextResponse.json({
    tableId: table.id,
    tableNumber: table.number,
    roomNumber: table.roomNumber,
    type: table.type,
    token,
    url: qrTargetUrl,
    qrDataUrl,
    branch: table.branch ? { id: table.branch.id, name: table.branch.name, slug: table.branch.slug } : null,
  })
}))
