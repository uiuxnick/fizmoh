import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { generateDesignBackground, type ImageOrientation } from "@/lib/qr-design-image-ai"

const ORIENTATION_FOR: Record<string, ImageOrientation> = {
  "a4": "portrait", "a5": "portrait", "table-tent": "portrait",
  "business-card": "landscape", "sticker": "square",
}

/** A full AI-generated background image for the canvas editor — never the QR itself. */
export const POST = withErrors(withModule("DIGITAL_QR", async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  const qrCode = await db.qrCode.findUnique({ where: { id } })
  if (!qrCode) return NextResponse.json({ error: "No such QR code" }, { status: 404 })

  const tenant = currentTenant()
  const tenantRow = tenant?.tenantId ? await db.tenant.findUnique({ where: { id: tenant.tenantId }, select: { name: true } }) : null

  const body = await request.json().catch(() => ({}))
  const prompt = String(body?.prompt || "").trim()
  const paperSize = String(body?.paperSize || "table-tent")
  if (!prompt) return NextResponse.json({ error: "Describe the image you want" }, { status: 400 })

  try {
    const dataUrl = await generateDesignBackground(prompt, tenantRow?.name || "", ORIENTATION_FOR[paperSize] || "portrait")
    return NextResponse.json({ dataUrl })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Image generation failed" }, { status: 502 })
  }
}))
