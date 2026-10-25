import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { getTenantEntitledModules } from "@/lib/entitlements"

function corsHeaders(origin: string | null = "*") {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-Fizmoh-Workspace, X-API-Key",
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  })
}

/**
 * Universal Inbound Ingestion Webhook for HubSpot, Zoho CRM, Zapier, Make, and Salesforce.
 * Pre-configured in Cloud & Sheet Bridges (/dashboard/cloud-bridges).
 */
export const POST = withErrors(async (request: NextRequest) => {
  const origin = request.headers.get("origin")
  const { searchParams } = new URL(request.url)
  const queryTenantId = searchParams.get("tenantId")
  const queryWorkspace = searchParams.get("workspace")
  const headerWorkspace = request.headers.get("x-fizmoh-workspace")

  let tenant: { id: string; slug: string; name: string } | null = null

  if (queryTenantId) {
    tenant = await db.tenant.findUnique({
      where: { id: queryTenantId },
      select: { id: true, slug: true, name: true },
    })
  } else if (queryWorkspace || headerWorkspace) {
    const slug = (queryWorkspace || headerWorkspace || "").trim().toLowerCase()
    tenant = await db.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    })
  }

  if (!tenant) {
    return NextResponse.json(
      { error: "Workspace context not found. Provide a valid ?tenantId=... or ?workspace=..." },
      { status: 404, headers: corsHeaders(origin) },
    )
  }

  const tenantId = tenant.id

  // Verify workspace entitlement for INTEGRATION or CRM
  const entitledModules = await getTenantEntitledModules(tenantId)
  if (!entitledModules.includes("INTEGRATION" as any) && !entitledModules.includes("CRM" as any)) {
    return NextResponse.json(
      { error: "Workspace is not entitled to Cloud Bridges or CRM integration", code: "MODULE_NOT_ENTITLED" },
      { status: 403, headers: corsHeaders(origin) },
    )
  }

  // Check optional inbound API key if configured
  const bridgeSetting = await db.systemSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "cloud_bridges_config" } },
  })

  if (bridgeSetting?.value) {
    try {
      const parsedConfig = JSON.parse(bridgeSetting.value)
      if (parsedConfig.inboundApiKey) {
        const authHeader = request.headers.get("authorization") || ""
        const apiKeyHeader = request.headers.get("x-api-key") || ""
        const providedKey = authHeader.replace(/^Bearer\s+/i, "") || apiKeyHeader
        if (providedKey !== parsedConfig.inboundApiKey) {
          return NextResponse.json({ error: "Invalid inbound API key" }, { status: 401, headers: corsHeaders(origin) })
        }
      }
    } catch {}
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders(origin) })
  }

  // Parse fields across standard Fizmoh format, HubSpot, Zoho, and Zapier schemas
  let rawName =
    body.name ||
    body.customerName ||
    body.Full_Name ||
    (body.First_Name ? `${body.First_Name} ${body.Last_Name || ""}`.trim() : null) ||
    body.properties?.firstname?.value ||
    (body.properties?.firstname ? `${body.properties.firstname} ${body.properties.lastname || ""}`.trim() : null) ||
    "Inbound Lead"

  let rawPhone =
    body.phone ||
    body.customerPhone ||
    body.mobile ||
    body.Phone ||
    body.Mobile ||
    body.properties?.phone?.value ||
    body.properties?.phone ||
    ""

  let rawEmail =
    body.email ||
    body.Email ||
    body.properties?.email?.value ||
    body.properties?.email ||
    null

  let rawSource =
    body.source ||
    body.Lead_Source ||
    body.lead_source ||
    body.properties?.hs_lead_status?.value ||
    "External CRM Bridge"

  let rawNotes =
    body.notes ||
    body.Description ||
    body.description ||
    body.message ||
    null

  let rawTags: string[] = []
  if (Array.isArray(body.tags)) {
    rawTags = body.tags.map(String)
  } else if (typeof body.tags === "string") {
    rawTags = body.tags.split(",").map((s: string) => s.trim()).filter(Boolean)
  }
  if (!rawTags.includes("crm-sync")) {
    rawTags.push("crm-sync")
  }

  const cleanPhone = String(rawPhone).trim()
  if (!cleanPhone) {
    return NextResponse.json(
      { error: "Phone number is required for CRM contact ingestion" },
      { status: 400, headers: corsHeaders(origin) },
    )
  }

  const cleanEmail = rawEmail ? String(rawEmail).trim().toLowerCase() : null
  const cleanName = String(rawName).trim()

  // Find or create customer scoped to tenant
  let customer = await db.customer.findFirst({
    where: {
      tenantId,
      OR: [
        { phone: cleanPhone },
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
      ],
    },
  })

  let isNew = false

  if (!customer) {
    isNew = true
    customer = await db.customer.create({
      data: {
        tenantId,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        source: String(rawSource).slice(0, 80),
        tags: rawTags,
        stage: body.stage || "LEAD",
        notes: rawNotes,
        lastContactAt: new Date(),
      },
    })
  } else {
    // Merge updates
    const existingTags = Array.isArray(customer.tags) ? (customer.tags as string[]) : []
    const mergedTags = Array.from(new Set([...existingTags, ...rawTags]))

    customer = await db.customer.update({
      where: { id: customer.id },
      data: {
        name: cleanName && cleanName !== "Inbound Lead" ? cleanName : customer.name,
        email: cleanEmail || customer.email,
        tags: mergedTags,
        stage: body.stage || customer.stage,
        notes: rawNotes ? (customer.notes ? `${customer.notes}\n${rawNotes}` : rawNotes) : customer.notes,
        lastContactAt: new Date(),
      },
    })
  }

  // Create lead record if not already existing
  await db.lead.create({
    data: {
      tenantId,
      customerId: customer.id,
      flowName: "CRM_INBOUND_INGESTION",
      answers: JSON.stringify({
        ...body,
        source: rawSource,
        ingestedAt: new Date().toISOString(),
      }),
      status: "NEW",
      notes: rawNotes ? `[Source: ${rawSource}] ${rawNotes}` : `[Source: ${rawSource}]`,
    },
  }).catch(err => console.error("Failed to record inbound lead:", err))

  // Dispatch real-time staff notification alert
  const { notifyStaff } = await import("@/lib/realtime")

  await notifyStaff({
    tenantId,
    type: "crm_lead_ingested",
    title: isNew ? "New CRM Lead Ingested" : "CRM Contact Updated",
    message: `${cleanName} (${cleanPhone}) received via ${rawSource}`,
    data: {
      customerId: customer.id,
      name: cleanName,
      phone: cleanPhone,
      source: rawSource,
      isNew,
      url: `/dashboard/crm`,
    },
  }).catch(err => console.error("Failed to notify staff of CRM lead ingestion:", err))

  return NextResponse.json(
    {
      success: true,
      action: isNew ? "created" : "updated",
      customerId: customer.id,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        stage: customer.stage,
        tags: customer.tags,
      },
    },
    { status: isNew ? 201 : 200, headers: corsHeaders(origin) },
  )
})
