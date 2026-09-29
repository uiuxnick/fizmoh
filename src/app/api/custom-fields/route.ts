import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant"

export interface CustomFieldDefinition {
  key: string
  label: string
  type: "text" | "number" | "date" | "select" | "boolean"
  options?: string[]
  description?: string
  required?: boolean
}

const DEFAULT_STARTER_FIELDS: CustomFieldDefinition[] = [
  { key: "city", label: "City / Location", type: "text" },
  { key: "company", label: "Company Name", type: "text" },
  { key: "vip_tier", label: "VIP Tier", type: "select", options: ["Standard", "Silver", "Gold", "VIP Platinum"] },
  { key: "lead_budget", label: "Estimated Budget", type: "number" },
]

export const GET = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const setting = await db.systemSetting.findFirst({
    where: { key: "crm_custom_fields", tenantId },
  })

  let fields: CustomFieldDefinition[] = []
  if (setting?.value) {
    try {
      fields = JSON.parse(setting.value)
    } catch {
      fields = []
    }
  }

  if (fields.length === 0) {
    fields = DEFAULT_STARTER_FIELDS
  }

  return NextResponse.json({ fields })
})

export const POST = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { field } = body
  if (!field || !field.key || !field.label) {
    return NextResponse.json({ error: "Field key and label are required" }, { status: 400 })
  }

  const cleanKey = String(field.key).toLowerCase().trim().replace(/[^a-z0-9_]/g, "_")
  const newField: CustomFieldDefinition = {
    key: cleanKey,
    label: String(field.label).trim(),
    type: ["text", "number", "date", "select", "boolean"].includes(field.type) ? field.type : "text",
    options: Array.isArray(field.options) ? field.options.map(String).filter(Boolean) : [],
    description: field.description ? String(field.description).trim() : "",
    required: !!field.required,
  }

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const setting = await db.systemSetting.findFirst({
    where: { key: "crm_custom_fields", tenantId },
  })

  let currentFields: CustomFieldDefinition[] = []
  if (setting?.value) {
    try {
      currentFields = JSON.parse(setting.value)
    } catch {}
  }
  if (currentFields.length === 0) {
    currentFields = [...DEFAULT_STARTER_FIELDS]
  }

  const idx = currentFields.findIndex(f => f.key === cleanKey)
  if (idx >= 0) currentFields[idx] = newField
  else currentFields.push(newField)

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId, key: "crm_custom_fields" } },
    update: { value: JSON.stringify(currentFields), category: "CRM", type: "JSON" },
    create: { tenantId, key: "crm_custom_fields", value: JSON.stringify(currentFields), category: "CRM", type: "JSON" },
  })

  return NextResponse.json({ success: true, fields: currentFields, created: newField })
})

export const DELETE = withErrors(async (req: NextRequest) => {
  const session = await sessionFromRequest(req)
  if (!session || session.kind !== "staff") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const key = searchParams.get("key")
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 })

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const setting = await db.systemSetting.findFirst({
    where: { key: "crm_custom_fields", tenantId },
  })

  let currentFields: CustomFieldDefinition[] = []
  if (setting?.value) {
    try {
      currentFields = JSON.parse(setting.value)
    } catch {}
  }
  if (currentFields.length === 0) {
    currentFields = [...DEFAULT_STARTER_FIELDS]
  }

  currentFields = currentFields.filter(f => f.key !== key)

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId, key: "crm_custom_fields" } },
    update: { value: JSON.stringify(currentFields) },
    create: { tenantId, key: "crm_custom_fields", value: JSON.stringify(currentFields), category: "CRM", type: "JSON" },
  })

  return NextResponse.json({ success: true, fields: currentFields })
})
