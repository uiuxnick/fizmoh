import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { listTemplates, isWhatsAppConfigured } from "@/lib/whatsapp"
import { withErrors } from "@/lib/api-handler"

/**
 * Sync approved templates from Meta Business Manager into the platform.
 * Per BRD §6.5.2: "Sync approved templates automatically from Meta Business
 * Manager into the platform (and vice versa)."
 *
 * Also refreshes the status of templates we submitted — Meta approves or
 * rejects asynchronously and never calls us back, so without this a submitted
 * template sits at PENDING forever.
 */

function componentText(components: any[], type: string): string | null {
  const c = components?.find(x => x.type === type)
  return c?.text ?? null
}

export const POST = withErrors(async (_request: NextRequest) => {
  if (!(await isWhatsAppConfigured())) {
    return NextResponse.json({ error: "WhatsApp is not configured" }, { status: 400 })
  }

  const result = await listTemplates()
  if (!result.success || !result.templates) {
    return NextResponse.json({ error: result.error || "Failed to list templates" }, { status: 502 })
  }

  let created = 0
  let updated = 0

  for (const meta of result.templates) {
    const components = meta.components || []
    const header = components.find((c: any) => c.type === "HEADER")
    const buttons = components.find((c: any) => c.type === "BUTTONS")

    const data = {
      name: meta.name,
      channel: "WHATSAPP",
      type: header?.format && header.format !== "TEXT" ? "MEDIA" : buttons ? "INTERACTIVE" : "TEXT",
      category: meta.category || "UTILITY",
      language: meta.language || "en_US",
      status: meta.status || "PENDING", // APPROVED | PENDING | REJECTED
      headerType: header?.format || "NONE",
      headerContent: header?.text ?? null,
      bodyContent: componentText(components, "BODY") || "",
      footerContent: componentText(components, "FOOTER"),
      // Json column: undefined leaves it untouched. `null` is rejected by
      // Prisma on Postgres unless wrapped in DbNull.
      buttons: buttons?.buttons ? JSON.stringify(buttons.buttons) : undefined,
      metaTemplateId: meta.id ?? null,
      rejectionReason: meta.rejected_reason ?? null,
    }

    const existing = await db.template.findFirst({
      where: { name: meta.name, language: data.language, channel: "WHATSAPP" },
    })

    if (existing) {
      await db.template.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await db.template.create({ data })
      created++
    }
  }

  return NextResponse.json({
    synced: result.templates.length,
    created,
    updated,
  })
})
