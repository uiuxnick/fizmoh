import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"

export async function GET(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.lists.read")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const lists = await db.emailList.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { subscribers: true } },
    },
  })

  return NextResponse.json({ lists })
}

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.lists.manage")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const body = await request.json().catch(() => ({}))
  const { name, description, optInMode = "SINGLE" } = body

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "List name is required" }, { status: 400 })
  }

  const list = await db.emailList.create({
    data: {
      tenantId,
      name: name.trim(),
      description: description || null,
      optInMode,
    },
  })

  return NextResponse.json({ list })
}
