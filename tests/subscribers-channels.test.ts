import { describe, expect, it } from "bun:test"
import {
  resolveSubscriberChannel,
  formatDisplayIdentifier,
  isSubscriberOptedIn,
  getChannelMeta,
} from "../src/lib/subscribers"

describe("Subscriber Channel Differentiation", () => {
  it("resolves channel from explicit channel attribute", () => {
    expect(resolveSubscriberChannel({ channel: "WHATSAPP", phone: "+96891234567" })).toBe("WHATSAPP")
    expect(resolveSubscriberChannel({ channel: "FACEBOOK", phone: "social:facebook:12345" })).toBe("FACEBOOK")
    expect(resolveSubscriberChannel({ channel: "INSTAGRAM", phone: "social:instagram:67890" })).toBe("INSTAGRAM")
  })

  it("resolves channel from synthetic phone prefix when channel is unset", () => {
    expect(resolveSubscriberChannel({ phone: "social:instagram:user123" })).toBe("INSTAGRAM")
    expect(resolveSubscriberChannel({ phone: "social:facebook:987654" })).toBe("FACEBOOK")
    expect(resolveSubscriberChannel({ phone: "social:messenger:987654" })).toBe("FACEBOOK")
    expect(resolveSubscriberChannel({ phone: "+96898821965" })).toBe("WHATSAPP")
  })

  it("formats display identifier cleanly without exposing synthetic phone strings", () => {
    // Instagram handle formatting
    const ig1 = formatDisplayIdentifier({
      channel: "INSTAGRAM",
      phone: "social:instagram:112233",
      socialUsername: "travel_oman",
      name: "Travel Oman",
    })
    expect(ig1.displayIdentifier).toBe("@travel_oman")

    const ig2 = formatDisplayIdentifier({
      channel: "INSTAGRAM",
      phone: "social:instagram:salma_art",
    })
    expect(ig2.displayIdentifier).toBe("@salma_art")

    // Facebook name/PSID formatting
    const fb1 = formatDisplayIdentifier({
      channel: "FACEBOOK",
      phone: "social:facebook:998877",
      socialUsername: "Salim Al-Harthy",
    })
    expect(fb1.displayIdentifier).toBe("Salim Al-Harthy")

    const fb2 = formatDisplayIdentifier({
      channel: "FACEBOOK",
      phone: "social:facebook:9988776655",
    })
    expect(fb2.displayIdentifier).toBe("Facebook #776655")

    // WhatsApp phone formatting
    const wa = formatDisplayIdentifier({
      channel: "WHATSAPP",
      phone: "+96891234567",
      name: "Ahmed",
    })
    expect(wa.displayIdentifier).toBe("+96891234567")
  })

  it("evaluates channel-specific opt-in status accurately", () => {
    // WhatsApp requires whatsappOptIn === true
    expect(isSubscriberOptedIn({ channel: "WHATSAPP", whatsappOptIn: true })).toBe(true)
    expect(isSubscriberOptedIn({ channel: "WHATSAPP", whatsappOptIn: false })).toBe(false)

    // Instagram uses instagramOptIn (defaults to true if undefined)
    expect(isSubscriberOptedIn({ channel: "INSTAGRAM", instagramOptIn: true })).toBe(true)
    expect(isSubscriberOptedIn({ channel: "INSTAGRAM", instagramOptIn: false })).toBe(false)
    expect(isSubscriberOptedIn({ channel: "INSTAGRAM" })).toBe(true)

    // Facebook uses facebookOptIn (defaults to true if undefined)
    expect(isSubscriberOptedIn({ channel: "FACEBOOK", facebookOptIn: true })).toBe(true)
    expect(isSubscriberOptedIn({ channel: "FACEBOOK", facebookOptIn: false })).toBe(false)
    expect(isSubscriberOptedIn({ channel: "FACEBOOK" })).toBe(true)
  })

  it("provides correct branding metadata for all channels", () => {
    const waMeta = getChannelMeta("WHATSAPP")
    expect(waMeta.label).toBe("WhatsApp")
    expect(waMeta.placeholder).toContain("+968")

    const fbMeta = getChannelMeta("FACEBOOK")
    expect(fbMeta.label).toBe("Facebook")
    expect(fbMeta.accentColor).toBe("text-blue-600")

    const igMeta = getChannelMeta("INSTAGRAM")
    expect(igMeta.label).toBe("Instagram")
    expect(igMeta.placeholder).toContain("@")

    const allMeta = getChannelMeta("ALL")
    expect(allMeta.label).toBe("All Channels")
  })
})
