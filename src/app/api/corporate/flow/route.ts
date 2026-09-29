import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { currentTenant } from "@/lib/tenant"
import { BOT_TEMPLATES } from "@/lib/bot-templates"

export const GET = withErrors(withModule("CORPORATE", async () => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId

  const existingFlow = await db.botFlow.findFirst({
    where: {
      name: { contains: "EMADI" },
      ...(tenantId ? { tenantId } : {}),
    },
  })

  return NextResponse.json({
    installed: !!existingFlow,
    flow: existingFlow ? {
      id: existingFlow.id,
      name: existingFlow.name,
      isActive: existingFlow.isActive,
      trigger: existingFlow.trigger,
      updatedAt: existingFlow.updatedAt,
    } : null,
  })
}))

export const POST = withErrors(withModule("CORPORATE", async (request: NextRequest) => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId

  const template = BOT_TEMPLATES.find(t => t.id === "emadi_corporate_architectural_flow")
  if (!template) {
    return NextResponse.json({ error: "EMADI flow template not found" }, { status: 404 })
  }

  // Check if already created for this tenant
  const existing = await db.botFlow.findFirst({
    where: {
      name: { contains: "EMADI" },
      ...(tenantId ? { tenantId } : {}),
    },
  })

  let flow
  if (existing) {
    flow = await db.botFlow.update({
      where: { id: existing.id },
      data: {
        name: template.name,
        description: template.description,
        trigger: template.trigger || "KEYWORD",
        triggerConfig: template.triggerConfig as any,
        nodes: template.nodes as any,
        edges: template.edges as any,
        publishedNodes: template.nodes as any,
        publishedEdges: template.edges as any,
        isActive: true,
        priority: 95,
      },
    })
  } else {
    flow = await db.botFlow.create({
      data: {
        tenantId: tenantId || null,
        name: template.name,
        description: template.description,
        trigger: template.trigger || "KEYWORD",
        triggerConfig: template.triggerConfig as any,
        nodes: template.nodes as any,
        edges: template.edges as any,
        publishedNodes: template.nodes as any,
        publishedEdges: template.edges as any,
        isActive: true,
        priority: 95,
      },
    })
  }

  return NextResponse.json({
    success: true,
    message: "EMADI 10-Step Architectural Flow deployed and activated successfully.",
    flowId: flow.id,
  })
}))
