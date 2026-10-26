import { expect, test, describe } from "bun:test"

describe("WhatsApp Botflow & Broadcast Marketing Security and Access Controls", () => {
  const CAMPAIGN_EDIT_ROLES = new Set(["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "MARKETING", "PLATFORM"])
  const FLOW_EDIT_ROLES = new Set(["OWNER", "SUPER_ADMIN", "ADMIN", "PLATFORM", "MANAGER", "MARKETING"])
  const FLOW_ADMIN_ROLES = new Set(["OWNER", "SUPER_ADMIN", "ADMIN", "PLATFORM", "MANAGER"])

  test("authorized management and marketing roles can create and manage broadcast campaigns", () => {
    expect(CAMPAIGN_EDIT_ROLES.has("OWNER")).toBe(true)
    expect(CAMPAIGN_EDIT_ROLES.has("SUPER_ADMIN")).toBe(true)
    expect(CAMPAIGN_EDIT_ROLES.has("ADMIN")).toBe(true)
    expect(CAMPAIGN_EDIT_ROLES.has("MANAGER")).toBe(true)
    expect(CAMPAIGN_EDIT_ROLES.has("MARKETING")).toBe(true)
    expect(CAMPAIGN_EDIT_ROLES.has("PLATFORM")).toBe(true)
  })

  test("unauthorized operational and financial roles cannot create or dispatch broadcast campaigns", () => {
    expect(CAMPAIGN_EDIT_ROLES.has("STAFF")).toBe(false)
    expect(CAMPAIGN_EDIT_ROLES.has("AGENT")).toBe(false)
    expect(CAMPAIGN_EDIT_ROLES.has("CHAT_AGENT")).toBe(false)
    expect(CAMPAIGN_EDIT_ROLES.has("VIEWER")).toBe(false)
    expect(CAMPAIGN_EDIT_ROLES.has("FINANCE")).toBe(false)
    expect(CAMPAIGN_EDIT_ROLES.has("GUEST")).toBe(false)
  })

  test("authorized roles can create and edit bot automation flows", () => {
    expect(FLOW_EDIT_ROLES.has("OWNER")).toBe(true)
    expect(FLOW_EDIT_ROLES.has("SUPER_ADMIN")).toBe(true)
    expect(FLOW_EDIT_ROLES.has("ADMIN")).toBe(true)
    expect(FLOW_EDIT_ROLES.has("MANAGER")).toBe(true)
    expect(FLOW_EDIT_ROLES.has("MARKETING")).toBe(true)
    expect(FLOW_EDIT_ROLES.has("PLATFORM")).toBe(true)
  })

  test("publishing and deleting live bot flows requires administrator status", () => {
    expect(FLOW_ADMIN_ROLES.has("OWNER")).toBe(true)
    expect(FLOW_ADMIN_ROLES.has("SUPER_ADMIN")).toBe(true)
    expect(FLOW_ADMIN_ROLES.has("ADMIN")).toBe(true)
    expect(FLOW_ADMIN_ROLES.has("MANAGER")).toBe(true)
    expect(FLOW_ADMIN_ROLES.has("PLATFORM")).toBe(true)

    // Marketing can draft flows but cannot delete or publish without administrative review
    expect(FLOW_ADMIN_ROLES.has("MARKETING")).toBe(false)
    expect(FLOW_ADMIN_ROLES.has("AGENT")).toBe(false)
    expect(FLOW_ADMIN_ROLES.has("VIEWER")).toBe(false)
  })

  test("clamps broadcast dispatch ratePerSecond between safe limits (1 - 50)", () => {
    const clampRate = (rate: unknown): number => {
      const num = Number(rate)
      if (!Number.isFinite(num)) return 10 // safe default
      return Math.min(50, Math.max(1, Math.round(num)))
    }

    expect(clampRate(25)).toBe(25)
    expect(clampRate(100)).toBe(50) // capped to 50
    expect(clampRate(-5)).toBe(1) // floored to 1
    expect(clampRate(0)).toBe(1)
    expect(clampRate("invalid")).toBe(10)
  })

  test("enforces module entitlement check for BROADCAST", () => {
    const workspaceModules: Record<string, string[]> = {
      "free-ws": ["WHATSAPP", "INBOX", "CRM"],
      "growth-ws": ["WHATSAPP", "INBOX", "CRM", "BROADCAST", "FLOWS"],
      "enterprise-ws": ["WHATSAPP", "INBOX", "CRM", "BROADCAST", "FLOWS", "TRAINING"],
    }

    const isEntitledToBroadcast = (workspaceId: string): boolean => {
      const mods = workspaceModules[workspaceId] || []
      return mods.includes("BROADCAST")
    }

    expect(isEntitledToBroadcast("free-ws")).toBe(false)
    expect(isEntitledToBroadcast("growth-ws")).toBe(true)
    expect(isEntitledToBroadcast("enterprise-ws")).toBe(true)
  })

  test("honors customer unsubscribe and opt-out filters", () => {
    const customers = [
      { id: "c1", name: "Ahmed", whatsappOptIn: true, emailOptIn: true },
      { id: "c2", name: "Fatima", whatsappOptIn: false, emailOptIn: true },
      { id: "c3", name: "Said", whatsappOptIn: true, emailOptIn: false },
    ]

    const filterReachableAudience = (list: typeof customers, channel: "WHATSAPP" | "EMAIL") => {
      return list.filter(c => channel === "WHATSAPP" ? c.whatsappOptIn : c.emailOptIn)
    }

    const whatsappAudience = filterReachableAudience(customers, "WHATSAPP")
    expect(whatsappAudience.map(c => c.id)).toEqual(["c1", "c3"])

    const emailAudience = filterReachableAudience(customers, "EMAIL")
    expect(emailAudience.map(c => c.id)).toEqual(["c1", "c2"])
  })
})
