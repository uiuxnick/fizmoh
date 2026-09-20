import { describe, expect, it } from "bun:test"
import { validateFlow } from "@/lib/flow-validate"
import { parseExternalFlow } from "@/lib/flow-importer"
import { validateAnswer, triggerMatches, type FlowNode, type FlowContext } from "@/lib/botflow-engine"

describe("BotFlow Comprehensive Engine & Validator Audit", () => {
  describe("validateFlow", () => {
    it("catches empty flows", () => {
      const issues = validateFlow([], [])
      expect(issues.some(i => i.level === "error")).toBe(true)
    })

    it("detects missing labels on condition branches", () => {
      const nodes = [
        { id: "1", type: "TRIGGER", data: { keyword: "hi" } },
        { id: "2", type: "CONDITION", data: { field: "gender", op: "equals", value: "male" } },
        { id: "3", type: "MESSAGE", data: { text: "Male coach" } },
        { id: "4", type: "MESSAGE", data: { text: "Female coach" } },
      ]
      const edges = [
        { id: "e1", source: "1", target: "2" },
        { id: "e2", source: "2", target: "3", label: "" },
        { id: "e3", source: "2", target: "4", label: "" },
      ]
      const issues = validateFlow(nodes, edges)
      expect(issues.some(i => i.message.includes("Both branches must be labelled yes and no"))).toBe(true)
    })

    it("enforces WhatsApp button limits (max 3)", () => {
      const nodes = [
        { id: "1", type: "TRIGGER", data: { keyword: "menu" } },
        {
          id: "2",
          type: "BUTTONS",
          data: {
            text: "Pick one",
            buttons: [
              { id: "b1", title: "One" },
              { id: "b2", title: "Two" },
              { id: "b3", title: "Three" },
              { id: "b4", title: "Four" },
            ],
          },
        },
        { id: "3", type: "END", data: {} },
      ]
      const edges = [
        { id: "e1", source: "1", target: "2" },
        { id: "e2", source: "2", target: "3" },
      ]
      const issues = validateFlow(nodes, edges)
      expect(issues.some(i => i.message.includes("at most 3 buttons"))).toBe(true)
    })

    it("enforces WhatsApp list limits (max 10 rows)", () => {
      const rows = Array.from({ length: 12 }, (_, i) => ({ id: `row_${i}`, title: `Item ${i}` }))
      const nodes = [
        { id: "1", type: "TRIGGER", data: { keyword: "list" } },
        { id: "2", type: "LIST", data: { text: "Pick item", rows } },
        { id: "3", type: "END", data: {} },
      ]
      const edges = [
        { id: "e1", source: "1", target: "2" },
        { id: "e2", source: "2", target: "3" },
      ]
      const issues = validateFlow(nodes, edges)
      expect(issues.some(i => i.message.includes("at most 10 items"))).toBe(true)
    })
  })

  describe("Flow Importer & AI Opportunity Detection", () => {
    it("parses xitFB@0.0.1 format and builds valid nodes and edges", () => {
      const sampleXitFB = {
        id: "xitFB@0.0.1",
        name: "Horse Riding Training",
        nodes: {
          "1": {
            id: 1,
            name: "Start Bot Flow",
            data: { botName: "Horse Riding", keyword: "خيل" },
            outputs: { referenceOutput: { connections: [{ node: 2 }] } }
          },
          "2": {
            id: 2,
            name: "Interactive",
            data: { textMessage: "Welcome to Horse Riding Training! Fee is 70 OMR. Call +96891234567 for info." },
            outputs: { interactiveOutputButton: { connections: [{ node: 3 }] } }
          },
          "3": {
            id: 3,
            name: "Button",
            data: { buttonText: "Book Now" },
            outputs: { buttonOutput: { connections: [] } }
          }
        }
      }

      const result = parseExternalFlow(sampleXitFB)
      expect(result.nodes.length).toBeGreaterThan(0)
      expect(result.format).toBe("xitFB")
      
      // Check detected opportunities
      const suggestions = result.suggestions
      expect(suggestions.some(s => s.category === "PAYMENT")).toBe(true)
      expect(suggestions.some(s => s.category === "CTA_URL")).toBe(true)
      expect(suggestions.some(s => s.category === "TOUR" || s.category === "APPOINTMENT")).toBe(true)
    })

    it("parses native FizMoh format directly", () => {
      const nativeFlow = {
        name: "Native Test Flow",
        nodes: [
          { id: "n1", type: "TRIGGER", data: { keyword: "start" } },
          { id: "n2", type: "MESSAGE", data: { text: "Hello!" } },
          { id: "n3", type: "END", data: {} }
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2" },
          { id: "e2", source: "n2", target: "n3" }
        ]
      }
      const result = parseExternalFlow(nativeFlow)
      expect(result.format).toBe("fizmoh")
      expect(result.nodes.length).toBe(3)
      expect(result.edges.length).toBe(2)
    })
  })

  describe("validateAnswer in Bot Engine", () => {
    it("validates text, email, phone, number, date correctly", () => {
      const textNode: FlowNode = { id: "1", type: "QUESTION", data: { inputType: "text" } }
      expect(validateAnswer(textNode, "Hello").ok).toBe(true)
      expect(validateAnswer(textNode, "   ").ok).toBe(false)

      const emailNode: FlowNode = { id: "2", type: "QUESTION", data: { inputType: "email" } }
      expect(validateAnswer(emailNode, "john@example.com").ok).toBe(true)
      expect(validateAnswer(emailNode, "not-an-email").ok).toBe(false)

      const phoneNode: FlowNode = { id: "3", type: "QUESTION", data: { inputType: "phone" } }
      expect(validateAnswer(phoneNode, "+96891234567").ok).toBe(true)
      expect(validateAnswer(phoneNode, "abc").ok).toBe(false)

      const numberNode: FlowNode = { id: "4", type: "QUESTION", data: { inputType: "number" } }
      expect(validateAnswer(numberNode, "42").ok).toBe(true)
      expect(validateAnswer(numberNode, "forty-two").ok).toBe(false)

      const dateNode: FlowNode = { id: "5", type: "QUESTION", data: { inputType: "date" } }
      expect(validateAnswer(dateNode, "2026-09-01").ok).toBe(true)
      expect(validateAnswer(dateNode, "tomorrow afternoon").ok).toBe(false)
    })

    it("validates select options and button IDs", () => {
      const options = ["Morning (9 AM)", "Evening (5 PM)"]
      const selectNode: FlowNode = { id: "6", type: "QUESTION", data: { inputType: "select", options } }

      expect(validateAnswer(selectNode, "1").ok).toBe(true)
      expect(validateAnswer(selectNode, "Morning").ok).toBe(true)
      expect(validateAnswer(selectNode, "Midnight").ok).toBe(false)
      
      // Button index ID resolution
      const res0 = validateAnswer(selectNode, "opt_0")
      expect(res0.ok).toBe(true)
      if (res0.ok) expect(res0.value).toBe("Morning (9 AM)")

      const res1 = validateAnswer(selectNode, "opt_1")
      expect(res1.ok).toBe(true)
      if (res1.ok) expect(res1.value).toBe("Evening (5 PM)")
    })
  })

  describe("triggerMatches Dynamic Routing", () => {
    it("matches ALWAYS trigger", () => {
      const flow = { trigger: "ALWAYS", triggerConfig: {} }
      const ctx: FlowContext = { tenantId: "t1", conversationId: "c1", customerId: "u1", customerPhone: "+96891234567", message: "any message" }
      expect(triggerMatches(flow, ctx)).toBe(true)
    })

    it("matches KEYWORD triggers accurately", () => {
      const flow = { trigger: "KEYWORD", triggerConfig: { keywords: ["marketing", "services"], matchType: "contains" } }
      const ctx1: FlowContext = { tenantId: "t1", conversationId: "c1", customerId: "u1", customerPhone: "+96891234567", message: "Tell me about your marketing" }
      const ctx2: FlowContext = { tenantId: "t1", conversationId: "c1", customerId: "u1", customerPhone: "+96891234567", message: "Hello there" }
      expect(triggerMatches(flow, ctx1)).toBe(true)
      expect(triggerMatches(flow, ctx2)).toBe(false)
    })

    it("matches INTENT triggers dynamically", () => {
      const flow = { trigger: "INTENT", triggerConfig: { intents: ["BOOKING", "AVAILABILITY"] } }
      const ctx1: FlowContext = { tenantId: "t1", conversationId: "c1", customerId: "u1", customerPhone: "+96891234567", message: "I want to book", intent: "BOOKING" }
      const ctx2: FlowContext = { tenantId: "t1", conversationId: "c1", customerId: "u1", customerPhone: "+96891234567", message: "Hello", intent: "GREETING" }
      expect(triggerMatches(flow, ctx1)).toBe(true)
      expect(triggerMatches(flow, ctx2)).toBe(false)
    })
  })
})
