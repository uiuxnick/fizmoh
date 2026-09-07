import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { PLATFORM } from "@/lib/tenant"

/**
 * Content Management API
 * Per BRD §6.8: "Content Management: banners, blog/SEO pages, FAQs shown on the website and reusable as WhatsApp quick answers"
 *
 * Uses SystemSetting model with category "CONTENT" to store content items
 */

export const GET = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") // BANNER, FAQ, BLOG, PAGE

  const where: any = { category: "CONTENT" }
  const settings = await db.systemSetting.findMany({ where, orderBy: { key: "asc" } })

  let items = settings.map(s => {
    let value: any = s.value
    try { value = JSON.parse(s.value) } catch {}
    return { id: s.id, key: s.key, type: s.type, value, updatedAt: s.updatedAt }
  })

  if (type) {
    items = items.filter(i => i.value?.type === type || i.key.startsWith(type + "_"))
  }

  return NextResponse.json({ items })
})

export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json()
  const { key, type, value } = body // type: BANNER, FAQ, BLOG, PAGE

  const data = JSON.stringify({ type, ...value })
  const setting = await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: PLATFORM, key } },
    update: { value: data, type: "JSON", category: "CONTENT" },
    create: { key, value: data, type: "JSON", category: "CONTENT" },
  })

  return NextResponse.json({ setting }, { status: 201 })
})

export const DELETE = withErrors(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 })

  await db.systemSetting.deleteMany({ where: { key } }).catch(() => {})
  return NextResponse.json({ success: true })
})
