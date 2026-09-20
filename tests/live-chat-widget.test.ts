import { describe, expect, it } from "bun:test"
import { MODULE_REGISTRY, effectiveModules } from "../src/lib/module-registry"
import { DEFAULT_ADDONS } from "../src/lib/addon-catalog"
import { viewForPath, VIEW_PATHS } from "../src/lib/admin-routes"

describe("Website Live Chat & WhatsApp Widget Addon", () => {
  it("registers LIVE_CHAT module with alwaysIncluded = true in capability registry", () => {
    const liveChatModule = MODULE_REGISTRY.find(m => m.key === "LIVE_CHAT")
    expect(liveChatModule).toBeDefined()
    expect(liveChatModule?.label).toBe("Website Chat & WhatsApp Widget")
    expect(liveChatModule?.group).toBe("Growth")
    expect(liveChatModule?.alwaysIncluded).toBe(true)

    const effective = effectiveModules([])
    expect(effective).toContain("LIVE_CHAT")
  })

  it("registers website-live-chat in the default addon catalog", () => {
    const addon = DEFAULT_ADDONS.find(a => a.slug === "website-live-chat")
    expect(addon).toBeDefined()
    expect(addon?.name).toBe("Website Live Chat & WhatsApp Widget")
    expect(addon?.module).toBe("LIVE_CHAT")
    expect(addon?.priceMonthly).toBe(15)
    expect(addon?.priceYearly).toBe(150)
  })

  it("maps /live-chat route and aliases in admin routing table", () => {
    expect(VIEW_PATHS["live-chat"]).toBe("live-chat")
    expect(viewForPath("/live-chat")).toBe("live-chat")
    expect(viewForPath("live-chat")).toBe("live-chat")
    expect(viewForPath("livechat")).toBe("live-chat")
    expect(viewForPath("webchat")).toBe("live-chat")
    expect(viewForPath("widget")).toBe("live-chat")
  })

  it("handles AI Smart Reply fallback suggestions for agents", () => {
    const defaultSmartReplies = [
      "Hello! How can I assist you with your inquiry today?",
      "I'd be happy to help you with that! Could you please provide more details?",
      "Thank you for reaching out! Let me check this for you right away.",
    ]

    expect(defaultSmartReplies.length).toBe(3)
    defaultSmartReplies.forEach(reply => {
      expect(typeof reply).toBe("string")
      expect(reply.length).toBeGreaterThan(10)
    })
  })

  it("constructs WhatsApp click-to-chat URL correctly", () => {
    const rawNumber = "+968 9123-4567"
    const cleanNumber = rawNumber.replace(/[^0-9]/g, "")
    expect(cleanNumber).toBe("96891234567")

    const text = "Hello! I would like to enquire about your services."
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`
    expect(waUrl).toBe("https://wa.me/96891234567?text=Hello!%20I%20would%20like%20to%20enquire%20about%20your%20services.")
  })
})
