import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { PLATFORM } from "@/lib/tenant"
import { currentTenant } from "@/lib/tenant-context"

import { KEY, NOTIFICATION_TYPES, getNotificationPrefs } from "@/lib/notification-preferences"

export const GET = withErrors(async () => {
  const prefs = await getNotificationPrefs()
  const types = Object.entries(NOTIFICATION_TYPES).map(([key, meta]) => ({
    key, ...meta, enabled: prefs[key] !== false,
  }))
  return NextResponse.json({ types })
})

export const PUT = withErrors(async (request: NextRequest) => {
  const tenantId = currentTenant()?.tenantId ?? PLATFORM
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const current = await getNotificationPrefs(tenantId)
  const next = { ...current }
  for (const [key, value] of Object.entries(body)) {
    if (key in NOTIFICATION_TYPES) next[key] = value === true
  }

  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId, key: KEY } },
    update: { value: JSON.stringify(next), type: "JSON", category: "NOTIFICATIONS" },
    create: { tenantId, key: KEY, value: JSON.stringify(next), type: "JSON", category: "NOTIFICATIONS" },
  })

  return NextResponse.json({ preferences: next })
})
