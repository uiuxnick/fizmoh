import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { generateDesignCopy } from "@/lib/qr-design-ai"

/** AI-suggested headline/subtitle/CTA for a QR code's printed design. */
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
  if (!prompt) return NextResponse.json({ error: "Describe the design you want, e.g. 'a premium restaurant review QR stand'" }, { status: 400 })

  try {
    const copy = await generateDesignCopy(prompt, tenantRow?.name || "")
    return NextResponse.json(copy)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI is unavailable right now" }, { status: 502 })
  }
}))
