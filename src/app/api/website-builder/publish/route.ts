import { NextResponse } from "next/server"
import { currentTenant } from "@/lib/tenant-context"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const DRAFT_KEY = "website_builder_json"
const PUBLISHED_KEY = "website_published_json"
const PUBLISHED_AT_KEY = "website_published_at"

// POST — publish the draft to live
export async function POST() {
  try {
    const ctx = currentTenant()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Load current draft
    const draft = await db.systemSetting.findUnique({
      where: { tenantId_key: { tenantId: ctx.tenantId, key: DRAFT_KEY } },
    })

    if (!draft) {
      return NextResponse.json({ error: "No draft to publish" }, { status: 400 })
    }

    // Write to published key
    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId: ctx.tenantId, key: PUBLISHED_KEY } },
      create: { tenantId: ctx.tenantId, key: PUBLISHED_KEY, value: draft.value, type: "JSON", category: "GENERAL" },
      update: { value: draft.value },
    })

    // Timestamp
    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId: ctx.tenantId, key: PUBLISHED_AT_KEY } },
      create: { tenantId: ctx.tenantId, key: PUBLISHED_AT_KEY, value: new Date().toISOString(), type: "STRING", category: "GENERAL" },
      update: { value: new Date().toISOString() },
    })

    return NextResponse.json({ ok: true, publishedAt: new Date().toISOString() })
  } catch (err) {
    console.error("[website-builder/publish] error", err)
    return NextResponse.json({ error: "Publish failed" }, { status: 500 })
  }
}

// GET — check publish status
export async function GET() {
  try {
    const ctx = currentTenant()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [pub, ts] = await Promise.all([
      db.systemSetting.findUnique({ where: { tenantId_key: { tenantId: ctx.tenantId, key: PUBLISHED_KEY } } }),
      db.systemSetting.findUnique({ where: { tenantId_key: { tenantId: ctx.tenantId, key: PUBLISHED_AT_KEY } } }),
    ])

    return NextResponse.json({
      published: !!pub,
      publishedAt: ts?.value ?? null,
      elements: pub?.value ? JSON.parse(pub.value) : [],
    })
  } catch {
    return NextResponse.json({ published: false, publishedAt: null, elements: [] })
  }
}
