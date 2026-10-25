import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"

export async function GET(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.subscribers.read")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const tags = await db.emailTag.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { subscribers: true } },
    },
  })

  return NextResponse.json({ tags })
}

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.subscribers.create")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const body = await request.json().catch(() => ({}))
  const { name, color = "#10b981" } = body

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Tag name is required" }, { status: 400 })
  }

  const tag = await db.emailTag.upsert({
    where: { tenantId_name: { tenantId, name: name.trim() } },
    create: { tenantId, name: name.trim(), color },
    update: { color },
  })

  return NextResponse.json({ tag })
}
