import { describe, test, expect } from "bun:test"
import { normalizeFlowGraph } from "../src/lib/flow-normalizer"
import { validateFlow } from "../src/lib/flow-validate"
import { triggerMatches } from "../src/lib/botflow-engine"
import { withSocialFlowDelivery, sendInteractiveMessage, sendWhatsApp } from "../src/lib/flow-delivery"

describe("automation regressions", () => {
  test("social flow choices use the selected adapter and external recipient", async () => {
    const sent: any[] = []
    const adapter: any = { sendText: async (...args: any[]) => { sent.push(args); return { ok: true } } }
    await withSocialFlowDelivery({ adapter, token: "test-token", recipient: "ig-recipient" }, async () => {
      await sendInteractiveMessage({ to: "social:instagram:123", body: "Choose", buttons: [{ id: "a", title: "Prices" }, { id: "b", title: "Team" }] })
    })
    expect(sent).toEqual([["test-token", "ig-recipient", "Choose\n1. Prices\n2. Team\nReply with the number or choice."]])
  })
  test("concurrent social transports cannot share tenant tokens or recipients", async () => {
    const calls: string[][] = []
    const adapter: any = { sendText: async (...args: string[]) => { calls.push(args); return { ok: true } } }
    await Promise.all(["one", "two"].map(id => withSocialFlowDelivery({ adapter, token: id, recipient: id }, async () => { await Promise.resolve(); await sendWhatsApp({ to: "unused", body: id }) })))
    expect(calls.every(call => call[0] === call[1] && call[1] === call[2])).toBe(true)
    expect(calls).toHaveLength(2)
  })
  test("legacy flows remain WhatsApp-only", () => {
    const flow = { trigger: "KEYWORD", triggerConfig: { keywords: ["hello"] } }
    const ctx = { tenantId: "t", conversationId: "c", customerId: "u", customerPhone: "123", message: "hello" }
    expect(triggerMatches(flow, ctx)).toBe(true)
    expect(triggerMatches(flow, { ...ctx, channel: "INSTAGRAM" })).toBe(false)
    expect(triggerMatches({ ...flow, triggerConfig: { ...flow.triggerConfig, channels: ["INSTAGRAM", "FACEBOOK"] } }, { ...ctx, channel: "FACEBOOK" })).toBe(true)
  })
  test("numeric and imported list labels cannot crash slice operations", () => {
    const graph = normalizeFlowGraph([{ id: "l", type: "LIST", data: { text: 42, rows: [{ id: 1, title: 23, description: 99 }] } }], [])
    const list = graph.nodes.find(n => n.id === "l")!
    expect(list.data.text).toBe("42")
    expect(list.data.rows[0].title.slice(0, 24)).toBe("23")
    expect(list.data.rows[0].description.slice(0, 72)).toBe("99")
  })
  test("missing targets survive normalization and prevent publication", () => {
    const issues = validateFlow([{ id: "t", type: "TRIGGER" }], [{ source: "t", target: "missing" }])
    expect(issues.some(i => i.level === "error" && i.message.includes("missing"))).toBe(true)
  })
  test("duplicate node IDs and self loops prevent publication", () => {
    const issues = validateFlow([{ id: "t", type: "TRIGGER" }, { id: "t", type: "END" }], [{ source: "t", target: "t" }])
    expect(issues.some(i => i.message.includes("unique ID"))).toBe(true)
    expect(issues.some(i => i.message.includes("itself"))).toBe(true)
  })
})

describe("social bot release checks", () => {
  test("paused transport sends nothing", async () => {
    let calls = 0
    const adapter: any = { sendText: async () => { calls++; return { ok: true } } }
    await expect(withSocialFlowDelivery({ adapter, token: "test", recipient: "test", beforeSend: async () => { throw new Error("Paused") } }, () => sendWhatsApp({ to: "test", body: "test" }))).rejects.toThrow("Paused")
    expect(calls).toBe(0)
  })
  test("knowledge template validates for both social channels", async () => {
    const { BOT_TEMPLATES } = await import("../src/lib/bot-templates")
    const template = BOT_TEMPLATES.find(t => t.id === "social_knowledge_concierge")!
    expect(template.triggerConfig.channels).toEqual(["FACEBOOK", "INSTAGRAM"])
    expect(validateFlow(template.nodes, template.edges).filter(i => i.level === "error")).toEqual([])
  })
  test("schedule requires explicit valid time and bounded recipients", async () => {
    const { validateSchedule } = await import("../src/lib/flow-schedule-config")
    expect(validateSchedule("SCHEDULE", {})).not.toBeNull()
    const config = { scheduledAt: "2026-09-10T10:00:00Z", conversationIds: ["c"], channels: ["WHATSAPP"] }
    expect(validateSchedule("SCHEDULE", config)).toBeNull()
    expect(validateSchedule("SCHEDULE", { ...config, channels: ["INSTAGRAM"] })).not.toBeNull()
    expect(validateSchedule("SCHEDULE", { ...config, conversationIds: Array(101).fill("c") })).not.toBeNull()
  })
})

test("requests for a person escalate before welcome messages or AI", async () => {
  const { detectSocialEscalation } = await import("../src/lib/social/social-ai")
  expect(detectSocialEscalation("I want to speak to a person.").escalate).toBe(true)
  expect(detectSocialEscalation("أريد التحدث إلى موظف").escalate).toBe(true)
})
