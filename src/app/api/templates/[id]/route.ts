import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

export const GET = withErrors(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const template = await db.template.findUnique({ where: { id } })
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 })
  return NextResponse.json({ template })
})

export const PUT = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = await request.json()

  const existing = await db.template.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 })

  // An approved template is immutable at Meta — editing one here would leave
  // the platform and Meta disagreeing about what the template says.
  if (existing.status === "APPROVED" && existing.metaTemplateId) {
    return NextResponse.json(
      { error: "Approved templates cannot be edited. Create a new version instead." },
      { status: 409 },
    )
  }

  const template = await db.template.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      category: body.category ?? existing.category,
      language: body.language ?? existing.language,
      type: body.type ?? existing.type,
      headerType: body.headerType ?? existing.headerType,
      headerContent: body.headerContent ?? existing.headerContent,
      bodyContent: body.bodyContent ?? existing.bodyContent,
      footerContent: body.footerContent ?? existing.footerContent,
      buttons: body.buttons ? JSON.stringify(body.buttons) : undefined,
      cards: body.cards ? JSON.stringify(body.cards) : undefined,
      variables: body.variables ? JSON.stringify(body.variables) : undefined,
      // Any content edit invalidates a prior review outcome.
      status: "DRAFT",
      rejectionReason: null,
      version: { increment: 1 },
    },
  })
  return NextResponse.json({ template })
})

export const DELETE = withErrors(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const usedBy = await db.campaign.count({ where: { templateId: id } })
  if (usedBy > 0) {
    return NextResponse.json(
      { error: `Template is used by ${usedBy} campaign(s)` },
      { status: 409 },
    )
  }
  await db.template.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
})
