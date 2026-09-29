import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

export const PATCH = withErrors(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const body = await request.json()
  const response = await db.cannedResponse.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.shortcut !== undefined && { shortcut: body.shortcut || null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  })
  return NextResponse.json({ response })
})

export const DELETE = withErrors(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  // Soft-delete: mark inactive rather than hard delete to preserve audit trail
  await db.cannedResponse.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
})
