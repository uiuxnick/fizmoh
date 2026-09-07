import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { sessionFromRequest } from "@/lib/auth"
import { currentTenant, PLATFORM } from "@/lib/tenant-context"
import { raw } from "@/lib/db"
import { generateApiKey } from "@/lib/api-keys"

export const GET = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  }

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const rows = await raw.systemSetting.findMany({
    where: {
      tenantId,
      key: { startsWith: "api_key_" },
    },
  })

  const keys = rows.map(r => {
    try {
      const parsed = JSON.parse(r.value)
      return {
        id: r.key,
        name: parsed.name,
        prefix: parsed.prefix,
        createdAt: parsed.createdAt,
      }
    } catch {
      return null
    }
  }).filter(Boolean)

  return NextResponse.json({ keys })
})

export const POST = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const name = body?.name?.trim() || "REST API Key"

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const { rawKey, prefix, keyHash } = generateApiKey()
  const keyId = `api_key_${Date.now()}`

  const record = {
    name,
    prefix,
    keyHash,
    createdAt: new Date().toISOString(),
  }

  await raw.systemSetting.upsert({
    where: { tenantId_key: { tenantId, key: keyId } },
    update: { value: JSON.stringify(record) },
    create: { tenantId, key: keyId, value: JSON.stringify(record) },
  })

  return NextResponse.json({
    apiKey: {
      id: keyId,
      name,
      prefix,
      rawKey, // Returned ONCE upon creation
      createdAt: record.createdAt,
    },
  })
})

export const DELETE = withErrors(async (request: NextRequest) => {
  const session = await sessionFromRequest(request)
  if (session?.kind !== "staff") {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 })
  }

  const tenantId = currentTenant()?.tenantId || PLATFORM
  const { searchParams } = new URL(request.url)
  const keyId = searchParams.get("id")
  if (!keyId || !keyId.startsWith("api_key_")) {
    return NextResponse.json({ error: "Invalid Key ID" }, { status: 400 })
  }

  await raw.systemSetting.deleteMany({
    where: { tenantId, key: keyId },
  })

  return NextResponse.json({ success: true, deleted: keyId })
})
