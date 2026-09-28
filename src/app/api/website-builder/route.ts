import { NextResponse } from "next/server"
import { currentTenant } from "@/lib/tenant-context"
import { db } from "@/lib/db"
import { normalizeWebsiteData } from "@/lib/website-builder-types"

const SETTING_KEY = "website_builder_json"

export const dynamic = "force-dynamic"

// GET — load saved builder elements and multi-page data for this tenant
export async function GET() {
  try {
    const ctx = currentTenant()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const setting = await db.systemSetting.findUnique({
      where: { tenantId_key: { tenantId: ctx.tenantId, key: SETTING_KEY } },
    })

    const raw = setting?.value ? JSON.parse(setting.value) : null
    const normalized = normalizeWebsiteData(raw)

    return NextResponse.json({
      elements: normalized.elements,
      pages: normalized.pages,
      activePageSlug: normalized.activePageSlug,
    })
  } catch {
    const fallback = normalizeWebsiteData(null)
    return NextResponse.json({
      elements: fallback.elements,
      pages: fallback.pages,
      activePageSlug: fallback.activePageSlug,
    })
  }
}

// POST — save builder elements or multi-page data
export async function POST(req: Request) {
  try {
    const ctx = currentTenant()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const normalized = normalizeWebsiteData(body)

    const payloadToSave = {
      pages: normalized.pages,
      activePageSlug: normalized.activePageSlug,
      elements: normalized.elements,
    }

    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId: ctx.tenantId, key: SETTING_KEY } },
      create: {
        tenantId: ctx.tenantId,
        key: SETTING_KEY,
        value: JSON.stringify(payloadToSave),
        type: "JSON",
        category: "GENERAL",
      },
      update: { value: JSON.stringify(payloadToSave) },
    })

    return NextResponse.json({
      ok: true,
      pages: normalized.pages,
      elements: normalized.elements,
      activePageSlug: normalized.activePageSlug,
    })
  } catch (err) {
    console.error("[website-builder] save error", err)
    return NextResponse.json({ error: "Save failed" }, { status: 500 })
  }
}
