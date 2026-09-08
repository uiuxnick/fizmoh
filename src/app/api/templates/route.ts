import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"
import { ensureDefaultOrderTemplates } from "@/lib/default-templates"

export const GET = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (tenant?.tenantId) {
    await ensureDefaultOrderTemplates(tenant.tenantId)
  }

  const { searchParams } = new URL(request.url)
  const channel = searchParams.get("channel")

  const where: any = {}
  if (channel) where.channel = channel

  const templates = await db.template.findMany({
    where,
    include: { _count: { select: { campaigns: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ templates })
})

export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json()
  const template = await db.template.create({
    data: {
      channel: body.channel,
      name: body.name,
      category: body.category,
      language: body.language || "en_US",
      type: body.type || "TEXT",
      headerType: body.headerType || null,
      headerContent: body.headerContent || null,
      bodyContent: body.bodyContent,
      footerContent: body.footerContent || null,
      buttons: body.buttons ? JSON.stringify(body.buttons) : undefined,
      cards: body.cards ? JSON.stringify(body.cards) : undefined,
      variables: body.variables ? JSON.stringify(body.variables) : undefined,
      emailSubject: body.emailSubject || null,
      emailHtml: body.emailHtml || null,
      status: body.status || "DRAFT",
    },
  })
  return NextResponse.json({ template }, { status: 201 })
})
