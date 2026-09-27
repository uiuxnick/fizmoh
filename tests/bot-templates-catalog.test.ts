import { describe, it, expect } from "bun:test"
import { BOT_TEMPLATES } from "@/lib/bot-templates"

describe("BOT_TEMPLATES Catalog & Schema Integrity", () => {
  it("contains at least 44 high-value templates", () => {
    expect(BOT_TEMPLATES.length).toBeGreaterThanOrEqual(44)
  })

  it("ensures every template has unique IDs and valid required fields", () => {
    const ids = new Set<string>()
    for (const t of BOT_TEMPLATES) {
      expect(t.id).toBeDefined()
      expect(t.id.trim().length).toBeGreaterThan(0)
      expect(ids.has(t.id)).toBe(false)
      ids.add(t.id)

      expect(t.name).toBeDefined()
      expect(t.name.trim().length).toBeGreaterThan(0)
      expect(t.category).toBeDefined()
      expect(t.category.trim().length).toBeGreaterThan(0)
      expect(t.description).toBeDefined()
      expect(t.description.trim().length).toBeGreaterThan(0)
    }
  })

  it("ensures every template has a trigger node and valid connected graph", () => {
    for (const t of BOT_TEMPLATES) {
      expect(t.nodes.length).toBeGreaterThan(0)
      const triggerNode = t.nodes.find((n) => n.type === "TRIGGER")
      expect(triggerNode).toBeDefined()

      const nodeIds = new Set(t.nodes.map((n) => n.id))

      // Every edge source and target must exist in the node set
      for (const edge of t.edges) {
        expect(nodeIds.has(edge.source)).toBe(true)
        expect(nodeIds.has(edge.target)).toBe(true)
      }
    }
  })

  it("includes all 8 new Wati/Interakt enterprise bot flow templates", () => {
    const expectedWatiIds = [
      "wati_abandoned_cart_recovery",
      "wati_cod_order_verification",
      "wati_google_reviews_booster",
      "wati_lead_magnet_delivery",
      "wati_after_hours_auto_reply",
      "wati_vip_loyalty_rewards",
      "wati_event_webinar_registration",
      "wati_multi_branch_locator",
    ]

    for (const expectedId of expectedWatiIds) {
      const template = BOT_TEMPLATES.find((t) => t.id === expectedId)
      expect(template).toBeDefined()
      expect(template?.nodes.length).toBeGreaterThanOrEqual(4)
      expect(template?.edges.length).toBeGreaterThanOrEqual(3)
    }
  })

  it("covers major commercial categories (E-Commerce, CRM & AI, Appointments, Healthcare, Dining, Tours)", () => {
    const categories = new Set(BOT_TEMPLATES.map((t) => t.category))
    expect(categories.has("E-Commerce")).toBe(true)
    expect(categories.has("CRM & AI")).toBe(true)
    expect(categories.has("Appointments")).toBe(true)
    expect(categories.has("Healthcare")).toBe(true)
    expect(categories.has("Dining & Hospitality")).toBe(true)
    expect(categories.has("Tours & Travel")).toBe(true)
  })
})
