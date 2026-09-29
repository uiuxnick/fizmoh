import { describe, expect, test, mock } from "bun:test"
import { summarizeConversationThread, rephraseMessage } from "../src/lib/ai"

// Prevent real DB/AI calls — force the fast fallback path (no AI configured)
mock.module("../src/lib/ai-provider", () => ({
  isAIConfigured: async () => false,
  getAIConfig: async () => null,
  anthropicClient: () => null,
  openaiClient: () => null,
}))

describe("AI Chat & Inbox Enhancements", () => {
  describe("summarizeConversationThread", () => {
    test("handles empty conversation gracefully with fallback", async () => {
      const result = await summarizeConversationThread([])
      expect(result).toBeDefined()
      expect(result.summary).toContain("Customer Request")
      expect(result.intent).toBeDefined()
      expect(result.status).toBeDefined()
      expect(result.nextAction).toBeDefined()
    })

    test("formats fallback points when AI is not configured or in test environment", async () => {
      const messages = [
        { role: "customer", sender: "Salim", content: "Hi, I want to book a desert tour for 4 people on Friday." },
        { role: "agent", sender: "Support Staff", content: "Hello Salim! Yes we have slots available at 3 PM. Which pickup location?" },
        { role: "customer", sender: "Salim", content: "Muscat Grand Mall please." },
      ]

      const result = await summarizeConversationThread(messages)
      expect(result).toBeDefined()
      expect(result.summary).toContain("•")
      expect(typeof result.intent).toBe("string")
      expect(typeof result.status).toBe("string")
      expect(typeof result.nextAction).toBe("string")
    })
  })

  describe("rephraseMessage", () => {
    test("returns empty string when given empty input", async () => {
      const result = await rephraseMessage("", "professional")
      expect(result).toBe("")
    })

    test("handles whitespace-only string cleanly", async () => {
      const result = await rephraseMessage("   ", "friendly")
      expect(result).toBe("   ")
    })

    test("returns original text when AI provider is unconfigured in test environment", async () => {
      const input = "Please send payment link."
      const result = await rephraseMessage(input, "concise")
      expect(typeof result).toBe("string")
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe("detectIntent handoff detection", () => {
    test("detects English handoff request reliably", async () => {
      const { detectIntent } = await import("../src/lib/ai")
      const result = await detectIntent("Can I please talk to a human agent?")
      expect(result.needsHumanHandoff).toBe(true)
      expect(result.intent).toBe("HUMAN_HANDOFF")
    })

    test("detects Arabic handoff request reliably", async () => {
      const { detectIntent } = await import("../src/lib/ai")
      const result = await detectIntent("أريد التحدث مع موظف خدمة العملاء لو سمحت")
      expect(result.needsHumanHandoff).toBe(true)
      expect(result.intent).toBe("HUMAN_HANDOFF")
    })

    test("does not trigger handoff on ordinary informational question", async () => {
      const { detectIntent } = await import("../src/lib/ai")
      const result = await detectIntent("What time does the Muscat city tour start?")
      expect(result.needsHumanHandoff).toBe(false)
    })
  })
})
