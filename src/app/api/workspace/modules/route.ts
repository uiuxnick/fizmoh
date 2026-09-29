import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { currentTenant } from "@/lib/tenant"
import { MODULE_REGISTRY, type Module } from "@/lib/module-registry"
import {
  getTenantEntitledModules,
  getTenantDisabledModules,
  setTenantModuleEnabled,
  modulesFor,
} from "@/lib/entitlements"

export const dynamic = "force-dynamic"

export const GET = withErrors(async () => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "No active workspace" }, { status: 401 })
  }

  const [entitled, disabled, active] = await Promise.all([
    getTenantEntitledModules(tenant.tenantId),
    getTenantDisabledModules(tenant.tenantId),
    modulesFor(tenant.tenantId),
  ])

  const modules = MODULE_REGISTRY.map((m) => {
    const isEntitled = entitled.includes(m.key as Module)
    const isDisabled = disabled.includes(m.key)
    const isEnabled = isEntitled && !isDisabled

    return {
      key: m.key,
      label: m.label,
      description: m.description,
      group: m.group,
      alwaysIncluded: m.alwaysIncluded,
      entitled: isEntitled,
      enabled: isEnabled,
      disabled: isDisabled,
    }
  })

  return NextResponse.json({
    modules,
    activeCount: active.length,
    entitledCount: entitled.length,
    disabledCount: disabled.length,
  })
})

export const PATCH = withErrors(async (request: NextRequest) => {
  const tenant = currentTenant()
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: "No active workspace" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { module: moduleKey, enabled } = body

  if (!moduleKey || typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "Provide module (string) and enabled (boolean)" },
      { status: 400 },
    )
  }

  const result = await setTenantModuleEnabled(tenant.tenantId, moduleKey, enabled)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 402 })
  }

  return NextResponse.json({
    success: true,
    module: moduleKey,
    enabled,
    disabledModules: result.disabledModules,
    activeModules: result.activeModules,
  })
})
