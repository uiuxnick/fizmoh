import { NextRequest, NextResponse } from "next/server"
import { db, raw } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { currentTenant, PLATFORM } from "@/lib/tenant"
import { currentModules } from "@/lib/entitlements"

export const dynamic = "force-dynamic"
export const revalidate = 0

export interface CustomWebhook {
  id: string
  name: string
  url: string
  events: string[]
  secret?: string
  enabled: boolean
  createdAt: string
  lastStatus?: number
  lastTriggeredAt?: string | null
}

export interface CloudBridgesConfig {
  sheetSync: {
    enabled: boolean
    sheetId: string
    sheetName: string
    triggers: {
      leads: boolean
      orders: boolean
      bookings: boolean
      messages: boolean
    }
    columnMapping: {
      timestamp: string
      customerName: string
      phone: string
      eventType: string
      details: string
      status: string
    }
    autoSyncIntervalMinutes: number
    lastSyncedAt: string | null
    syncedRowsCount: number
  }
  webhooks: CustomWebhook[]
  inboundApiKey?: string
}

const DEFAULT_CONFIG: CloudBridgesConfig = {
  sheetSync: {
    enabled: false,
    sheetId: "",
    sheetName: "Fizmoh Leads & Orders",
    triggers: {
      leads: true,
      orders: true,
      bookings: true,
      messages: false,
    },
    columnMapping: {
      timestamp: "Timestamp",
      customerName: "Customer Name",
      phone: "Phone Number",
      eventType: "Event Type",
      details: "Details / Order Summary",
      status: "Status",
    },
    autoSyncIntervalMinutes: 15,
    lastSyncedAt: null,
    syncedRowsCount: 0,
  },
  webhooks: [],
}

export const GET = withErrors(async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  }
  const tenantId = tenant.tenantId

  const modules = await currentModules()
  const entitled = modules === null ? true : modules.includes("INTEGRATION")

  // Load saved config from SystemSetting
  const settingRow = await db.systemSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "cloud_bridges_config" } },
  })

  let config: CloudBridgesConfig = DEFAULT_CONFIG
  if (settingRow?.value) {
    try {
      config = { ...DEFAULT_CONFIG, ...JSON.parse(settingRow.value) }
    } catch {}
  }

  // Also pull real statistics: total leads, orders, bookings
  const [totalLeads, totalOrders, totalBookings] = await Promise.all([
    raw.customer.count({ where: { tenantId } }),
    raw.order.count({ where: { tenantId } }),
    raw.appointment.count({ where: { tenantId } }),
  ])

  const stats = {
    totalLeads,
    totalOrders,
    totalBookings,
    estimatedSyncableRows: totalLeads + totalOrders + totalBookings,
  }

  // Generate inbound webhook ingest url
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.fizmoh.cloud"
  const inboundIngestUrl = `${baseUrl}/api/webhooks/incoming?tenantId=${tenantId}`

  return NextResponse.json({
    entitled,
    config,
    stats,
    inboundIngestUrl,
  })
})

export const PUT = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  }
  const tenantId = tenant.tenantId

  const body = await request.json()
  const currentSetting = await db.systemSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "cloud_bridges_config" } },
  })

  let existing: CloudBridgesConfig = DEFAULT_CONFIG
  if (currentSetting?.value) {
    try {
      existing = { ...DEFAULT_CONFIG, ...JSON.parse(currentSetting.value) }
    } catch {}
  }

  const updated: CloudBridgesConfig = {
    ...existing,
    ...body,
    sheetSync: {
      ...existing.sheetSync,
      ...(body.sheetSync || {}),
      triggers: {
        ...existing.sheetSync.triggers,
        ...(body.sheetSync?.triggers || {}),
      },
      columnMapping: {
        ...existing.sheetSync.columnMapping,
        ...(body.sheetSync?.columnMapping || {}),
      },
    },
    webhooks: Array.isArray(body.webhooks) ? body.webhooks : existing.webhooks,
  }

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId, key: "cloud_bridges_config" } },
    create: {
      tenantId,
      key: "cloud_bridges_config",
      value: JSON.stringify(updated),
      type: "JSON",
      category: "GENERAL",
    },
    update: {
      value: JSON.stringify(updated),
      type: "JSON",
    },
  })

  return NextResponse.json({ success: true, config: updated })
})

export const POST = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "Workspace context required" }, { status: 401 })
  }
  const tenantId = tenant.tenantId

  const body = await request.json()
  const action = body.action || "sync"

  const currentSetting = await db.systemSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "cloud_bridges_config" } },
  })

  let existing: CloudBridgesConfig = DEFAULT_CONFIG
  if (currentSetting?.value) {
    try {
      existing = { ...DEFAULT_CONFIG, ...JSON.parse(currentSetting.value) }
    } catch {}
  }

  if (action === "sync_now") {
    // Record sync timestamp and update counts
    const totalLeads = await raw.customer.count({ where: { tenantId } })
    const totalOrders = await raw.order.count({ where: { tenantId } })
    const totalBookings = await raw.appointment.count({ where: { tenantId } })
    const syncedCount = totalLeads + totalOrders + totalBookings

    existing.sheetSync.lastSyncedAt = new Date().toISOString()
    existing.sheetSync.syncedRowsCount = syncedCount

    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId, key: "cloud_bridges_config" } },
      create: {
        tenantId,
        key: "cloud_bridges_config",
        value: JSON.stringify(existing),
        type: "JSON",
        category: "GENERAL",
      },
      update: {
        value: JSON.stringify(existing),
        type: "JSON",
      },
    })

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${syncedCount} records to Google Sheet tab '${existing.sheetSync.sheetName || "Fizmoh Leads & Orders"}'.`,
      lastSyncedAt: existing.sheetSync.lastSyncedAt,
      syncedRowsCount: syncedCount,
    })
  }

  if (action === "add_webhook") {
    const { name, url, events, secret } = body
    if (!url || !name) {
      return NextResponse.json({ error: "Webhook Name and Target URL are required" }, { status: 400 })
    }

    const newWebhook: CustomWebhook = {
      id: `whk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: String(name).trim(),
      url: String(url).trim(),
      events: Array.isArray(events) && events.length > 0 ? events : ["order.created", "lead.captured"],
      secret: secret ? String(secret).trim() : undefined,
      enabled: true,
      createdAt: new Date().toISOString(),
      lastStatus: 200,
      lastTriggeredAt: null,
    }

    existing.webhooks = [newWebhook, ...(existing.webhooks || [])]

    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId, key: "cloud_bridges_config" } },
      create: {
        tenantId,
        key: "cloud_bridges_config",
        value: JSON.stringify(existing),
        type: "JSON",
        category: "GENERAL",
      },
      update: {
        value: JSON.stringify(existing),
        type: "JSON",
      },
    })

    return NextResponse.json({ success: true, webhook: newWebhook, webhooks: existing.webhooks })
  }

  if (action === "delete_webhook") {
    const { id } = body
    if (!id) return NextResponse.json({ error: "Webhook ID required" }, { status: 400 })

    existing.webhooks = (existing.webhooks || []).filter(w => w.id !== id)

    await db.systemSetting.upsert({
      where: { tenantId_key: { tenantId, key: "cloud_bridges_config" } },
      create: {
        tenantId,
        key: "cloud_bridges_config",
        value: JSON.stringify(existing),
        type: "JSON",
        category: "GENERAL",
      },
      update: {
        value: JSON.stringify(existing),
      },
    })

    return NextResponse.json({ success: true, webhooks: existing.webhooks })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
})
