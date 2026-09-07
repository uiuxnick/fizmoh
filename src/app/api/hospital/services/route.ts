import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { db, raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { resolveHospTenantId } from "@/lib/hospital"
import { currentTenant } from "@/lib/tenant"

const DEFAULT_THERAPIES = [
  { id: "th_chemo_std", name: "Chemotherapy Infusion Protocol", category: "Chemotherapy", durationMins: 240, wardType: "Normal & Special Wards", price: 65, currency: "OMR", description: "Standard intravenous chemotherapy infusion with oncology nursing monitoring." },
  { id: "th_immuno", name: "Immunotherapy & Targeted Infusion", category: "Immunotherapy", durationMins: 180, wardType: "Special Ward", price: 95, currency: "OMR", description: "Monoclonal antibody and targeted biological therapy." },
  { id: "th_doc_consult", name: "Medical Oncologist Consultation", category: "Consultation", durationMins: 30, wardType: "Outpatient Clinic", price: 20, currency: "OMR", description: "Comprehensive oncological evaluation, staging review, and treatment planning." },
  { id: "th_blood_trans", name: "Blood Transfusion & Supportive Care", category: "Supportive Care", durationMins: 180, wardType: "Normal Ward", price: 45, currency: "OMR", description: "PRBC and platelet transfusion with cross-match and post-infusion monitoring." },
  { id: "th_pain_palliative", name: "Pain Management & Palliative Oncology", category: "Palliative", durationMins: 45, wardType: "Day Care / Clinic", price: 25, currency: "OMR", description: "Specialized cancer pain relief protocols and symptom management." },
  { id: "th_nutrition", name: "Oncology Diet & Nutrition Counseling", category: "Wellness", durationMins: 30, wardType: "Consultation Suite", price: 15, currency: "OMR", description: "Personalized dietary plans to counteract chemotherapy side effects and maintain strength." },
]

export const GET = withErrors(async (request: NextRequest) => {
  const tenantId = await resolveHospTenantId(request)
  const depts = await db.hospDepartment.findMany({
    where: { tenantId },
    include: { doctors: { select: { id: true, name: true, specialization: true } } },
  })
  const stored = await raw.systemSetting.findUnique({ where: { tenantId_key: { tenantId, key: "hospital_therapies" } } })
  let therapies = DEFAULT_THERAPIES
  if (stored?.value) {
    try {
      const parsed = JSON.parse(stored.value)
      if (Array.isArray(parsed)) therapies = parsed
    } catch { /* keep safe defaults when stored settings are malformed */ }
  }
  return NextResponse.json({
    therapies,
    departments: depts,
  })
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  if (tenant.role && !["OWNER", "SUPER_ADMIN", "MANAGER"].includes(tenant.role)) {
    return NextResponse.json({ error: "Only hospital administrators can manage therapies" }, { status: 403 })
  }
  const body = await request.json().catch(() => ({}))
  const therapy = {
    id: `th_${crypto.randomUUID()}`,
    name: String(body.name || "").trim().slice(0, 160),
    category: String(body.category || "Chemotherapy").slice(0, 80),
    durationMins: Math.min(1440, Math.max(5, Number(body.durationMins) || 120)),
    wardType: String(body.wardType || "Normal Ward").slice(0, 120),
    price: Math.max(0, Number(body.price) || 0),
    currency: "OMR",
    description: String(body.description || "").slice(0, 2000),
  }
  if (!therapy.name) return NextResponse.json({ error: "Therapy name is required" }, { status: 400 })
  const existing = await raw.systemSetting.findUnique({ where: { tenantId_key: { tenantId: tenant.tenantId, key: "hospital_therapies" } } })
  let therapies: typeof DEFAULT_THERAPIES = [...DEFAULT_THERAPIES]
  if (existing?.value) {
    try { const parsed = JSON.parse(existing.value); if (Array.isArray(parsed)) therapies = parsed } catch { /* reset malformed setting to defaults */ }
  }
  therapies.push(therapy)
  await raw.systemSetting.upsert({
    where: { tenantId_key: { tenantId: tenant.tenantId, key: "hospital_therapies" } },
    update: { value: JSON.stringify(therapies), type: "JSON", category: "HOSPITAL" },
    create: { tenantId: tenant.tenantId, key: "hospital_therapies", value: JSON.stringify(therapies), type: "JSON", category: "HOSPITAL" },
  })
  return NextResponse.json({ ok: true, therapy }, { status: 201 })
})
