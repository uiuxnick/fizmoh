import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"

export async function GET(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.templates.read")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")

  const where: any = {
    OR: [{ tenantId }, { isSystem: true }],
  }
  if (category) where.category = category

  const templates = await db.emailTemplate.findMany({
    where,
    orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json({ templates })
}

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.templates.create")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const body = await request.json().catch(() => ({}))

  const { name, description, category = "NEWSLETTER", designJson, htmlContent, plainText, isRtl } = body
  if (!name || !htmlContent) {
    return NextResponse.json({ error: "Template name and HTML content are required" }, { status: 400 })
  }

  const template = await db.emailTemplate.create({
    data: {
      tenantId,
      name,
      description: description || null,
      category,
      designJson: designJson || null,
      htmlContent,
      plainText: plainText || null,
      isRtl: Boolean(isRtl),
      isSystem: false,
    },
  })

  return NextResponse.json({ template })
}
