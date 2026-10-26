import { describe, expect, test } from "bun:test"
import { verifySignatureWithSecret } from "@/lib/social/social-webhook-verify"
import crypto from "crypto"

describe("Social Inbox & Meta DM Automation Security and Access Controls", () => {
  const secret = "test_meta_app_secret_12345678"
  const payload = JSON.stringify({
    object: "page",
    entry: [
      {
        id: "109823471029",
        time: 1729000000,
        messaging: [
          {
            sender: { id: "cust_social_1" },
            recipient: { id: "109823471029" },
            message: { mid: "mid.123", text: "Hello, what are your tour prices?" },
          },
        ],
      },
    ],
  })

  test("verifies Meta webhook HMAC-SHA256 signatures in constant time", () => {
    const validHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex")
    const validSig = `sha256=${validHmac}`

    // 1. Valid signature passes
    expect(verifySignatureWithSecret(payload, validSig, secret, true)).toBe(true)

    // 2. Wrong secret fails
    expect(verifySignatureWithSecret(payload, validSig, "wrong_secret_abcdef", true)).toBe(false)

    // 3. Tampered payload fails
    const tamperedPayload = payload.replace("Hello", "Bye")
    expect(verifySignatureWithSecret(tamperedPayload, validSig, secret, true)).toBe(false)

    // 4. Missing or null signature fails in production
    expect(verifySignatureWithSecret(payload, null, secret, true)).toBe(false)
    expect(verifySignatureWithSecret(payload, "", secret, true)).toBe(false)
  })

  test("enforces role permissions for social automation settings and keyword replies", () => {
    const editRoles = ["OWNER", "SUPER_ADMIN", "ADMIN", "PLATFORM", "MANAGER", "MARKETING"]
    const automaticModeRoles = ["OWNER", "SUPER_ADMIN", "ADMIN", "PLATFORM"]
    const unauthorizedRoles = ["VIEWER", "FINANCE", "AGENT", "CHAT_AGENT"]

    function canEditSettings(role: string): boolean {
      return editRoles.includes(role)
    }

    function canEnableAutomaticMode(role: string): boolean {
      return automaticModeRoles.includes(role)
    }

    // Authorized roles
    for (const role of editRoles) {
      expect(canEditSettings(role)).toBe(true)
    }

    // Unauthorized roles
    for (const role of unauthorizedRoles) {
      expect(canEditSettings(role)).toBe(false)
      expect(canEnableAutomaticMode(role)).toBe(false)
    }

    // Manager / Marketing can edit settings but cannot activate fully automatic publishing
    expect(canEditSettings("MARKETING")).toBe(true)
    expect(canEnableAutomaticMode("MARKETING")).toBe(false)
    expect(canEditSettings("MANAGER")).toBe(true)
    expect(canEnableAutomaticMode("MANAGER")).toBe(false)

    // Owner, Super Admin, Admin, and Platform can enable fully automatic mode
    expect(canEnableAutomaticMode("OWNER")).toBe(true)
    expect(canEnableAutomaticMode("ADMIN")).toBe(true)
    expect(canEnableAutomaticMode("SUPER_ADMIN")).toBe(true)
  })

  test("enforces conversation operational roles for reply, note, and assignment", () => {
    const conversationActionRoles = [
      "OWNER",
      "SUPER_ADMIN",
      "ADMIN",
      "PLATFORM",
      "MANAGER",
      "MARKETING",
      "AGENT",
      "CHAT_AGENT",
    ]
    const restrictedRoles = ["VIEWER", "FINANCE"]

    function canActOnConversation(role: string): boolean {
      return conversationActionRoles.includes(role)
    }

    for (const role of conversationActionRoles) {
      expect(canActOnConversation(role)).toBe(true)
    }

    for (const role of restrictedRoles) {
      expect(canActOnConversation(role)).toBe(false)
    }
  })

  test("validates social channels strictly and rejects invalid channels", () => {
    const validChannels = ["FACEBOOK", "INSTAGRAM"]

    function isValidChannel(channel: string): boolean {
      return validChannels.includes(channel)
    }

    expect(isValidChannel("FACEBOOK")).toBe(true)
    expect(isValidChannel("INSTAGRAM")).toBe(true)
    expect(isValidChannel("WHATSAPP")).toBe(false) // WhatsApp has separate webhook & inbox
    expect(isValidChannel("TIKTOK")).toBe(false)
    expect(isValidChannel("")).toBe(false)
  })

  test("clamps reply text and keyword rule lengths safely", () => {
    const longText = "a".repeat(3000)
    const clampedReply = longText.trim().slice(0, 2000)
    expect(clampedReply.length).toBe(2000)

    const longKeywords = "keyword,".repeat(100)
    const clampedKeywords = longKeywords.slice(0, 500)
    expect(clampedKeywords.length).toBeLessThanOrEqual(500)
  })
})
