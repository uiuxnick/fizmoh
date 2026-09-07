import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { requirePlatformAdmin } from "@/app/api/platform/tenants/route"
import { z } from "zod"

const updateSchema = z.object({
  status: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export const PATCH = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })
  }

  const { id } = await context.params
  const body = await request.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 })
  }

  const lead = await raw.lead.findUnique({ where: { id } })
  if (!lead || lead.tenantId !== null) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const updated = await raw.lead.update({
    where: { id },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    },
  })

  return NextResponse.json({ ok: true, lead: updated })
})

export const DELETE = withErrors(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const admin = await requirePlatformAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Not a platform administrator" }, { status: 403 })
  }

  const { id } = await context.params
  const lead = await raw.lead.findUnique({ where: { id } })
  if (!lead || lead.tenantId !== null) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  await raw.lead.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
