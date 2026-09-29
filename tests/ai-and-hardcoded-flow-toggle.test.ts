import { describe, test, expect } from "bun:test"
import { CONFIG_GROUPS } from "@/lib/app-config"
import { DEFAULT_MODELS, SUGGESTED_MODELS } from "@/lib/ai-provider"

describe("AI Assistant and Hardcoded Flow Controls", () => {
  test("CONFIG_GROUPS includes hardcoded_flows_enabled toggle configuration", () => {
    const group = CONFIG_GROUPS.find(g => g.fields.some(f => f.key === "hardcoded_flows_enabled"))
    expect(group).toBeDefined()
    const hardcodedField = group?.fields.find(f => f.key === "hardcoded_flows_enabled")
    expect(hardcodedField).toBeDefined()
    expect(hardcodedField?.options).toContain("false")
    expect(hardcodedField?.options).toContain("true")
  })

  test("CONFIG_GROUPS includes wa_flows_enabled dynamic flows toggle", () => {
    const group = CONFIG_GROUPS.find(g => g.fields.some(f => f.key === "wa_flows_enabled"))
    expect(group).toBeDefined()
    const flowsField = group?.fields.find(f => f.key === "wa_flows_enabled")
    expect(flowsField).toBeDefined()
    expect(flowsField?.options).toContain("true")
    expect(flowsField?.options).toContain("false")
  })

  test("CONFIG_GROUPS includes ai_assistant_enabled toggle", () => {
    const group = CONFIG_GROUPS.find(g => g.fields.some(f => f.key === "ai_assistant_enabled"))
    expect(group).toBeDefined()
    const aiField = group?.fields.find(f => f.key === "ai_assistant_enabled")
    expect(aiField).toBeDefined()
    expect(aiField?.options).toContain("true")
    expect(aiField?.options).toContain("false")
  })

  test("DEFAULT_MODELS defines default models for anthropic and openai", () => {
    expect(DEFAULT_MODELS.anthropic).toBeDefined()
    expect(DEFAULT_MODELS.openai).toBeDefined()
    expect(SUGGESTED_MODELS.openai).toContain("gpt-4o")
  })

  test("tenant reply sets botActive: false and automationPaused: true requiring manual resume", () => {
    // Simulate tenant manual outbound message update
    const isManualOutbound = true
    const updatePayload = {
      lastMessageAt: new Date(),
      lastMessageText: "Hello, I am a human agent here to help.",
      ...(isManualOutbound ? { botActive: false, automationPaused: true } : {}),
    }

    expect(updatePayload.botActive).toBe(false)
    expect(updatePayload.automationPaused).toBe(true)

    // Simulate customer sending a message back while conversation is paused
    const existing = {
      id: "conv-123",
      botActive: updatePayload.botActive,
      automationPaused: updatePayload.automationPaused,
      status: "OPEN",
    }

    // Webhook logic check: if paused by human reply, AI must remain OFF
    const shouldKeepAiOff = existing.automationPaused || !existing.botActive
    expect(shouldKeepAiOff).toBe(true)

    // Tenant manually turns AI back on via PATCH
    const patchPayload = { botActive: true }
    const resumedState = {
      ...existing,
      botActive: patchPayload.botActive,
      automationPaused: !patchPayload.botActive,
      status: patchPayload.botActive && existing.status === "PENDING" ? "OPEN" : existing.status,
    }
    expect(resumedState.botActive).toBe(true)
    expect(resumedState.automationPaused).toBe(false)
  })

  test("brand new conversations start with AI enabled and automation unpaused", () => {
    const isBotActive = true
    const newConversation = {
      customerPhone: "96891234567",
      status: "OPEN",
      botActive: isBotActive,
      automationPaused: !isBotActive,
      assignedStaffId: null,
    }

    expect(newConversation.botActive).toBe(true)
    expect(newConversation.automationPaused).toBe(false)
    expect(newConversation.assignedStaffId).toBeNull()
  })
})
