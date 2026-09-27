import { NextResponse } from "next/server"
import { currentTenant } from "@/lib/tenant-context"
import { db } from "@/lib/db"

const SETTING_KEY = "website_builder_json"

export const dynamic = "force-dynamic"

// GET — load saved builder elements for this tenant
export async function GET() {
  try {
    const ctx = currentTenant()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const setting = await db.systemSetting.findUnique({
      where: { tenantId_key: { tenantId: ctx.tenantId, key: SETTING_KEY } },
    })

    const elements = setting?.value ? JSON.parse(setting.value) : []
    return NextResponse.json({ elements })
  } catch {
    return NextResponse.json({ elements: [] })
  }
}

// POST — save builder elements
export async function POST(req: Request) {
  try {
    const ctx = currentTenant()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const elements = body.elements ?? []

    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId: ctx.tenantId, key: SETTING_KEY } },
      create: { tenantId: ctx.tenantId, key: SETTING_KEY, value: JSON.stringify(elements), type: "JSON", category: "GENERAL" },
      update: { value: JSON.stringify(elements) },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[website-builder] save error", err)
    return NextResponse.json({ error: "Save failed" }, { status: 500 })
  }
}
