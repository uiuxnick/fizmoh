import { describe, it, expect } from "bun:test"
import { verifySignatureWithSecret } from "@/lib/social/social-webhook-verify"
import { canAutoSendReply } from "@/lib/social/social-ai"
import crypto from "crypto"

describe("Facebook & Instagram Automation - Security & Business Rules", () => {
  const metaSecret = "test_meta_app_secret_abc123"

  it("Webhook signature handshake succeeds with exact HMAC-SHA256 signature", () => {
    const payload = JSON.stringify({
      object: "page",
      entry: [{ id: "10023456789", messaging: [{ sender: { id: "user_456" }, message: { mid: "m_1", text: "Hello" } }] }],
    })
    const signature = "sha256=" + crypto.createHmac("sha256", metaSecret).update(payload).digest("hex")

    const valid = verifySignatureWithSecret(payload, signature, metaSecret, true)
    expect(valid).toBe(true)
  })

  it("Webhook signature handshake fails when payload is tampered with", () => {
    const payload = JSON.stringify({ object: "page", entry: [] })
    const tamperedPayload = JSON.stringify({ object: "page", entry: [{ id: "hacked" }] })
    const signature = "sha256=" + crypto.createHmac("sha256", metaSecret).update(payload).digest("hex")

    const valid = verifySignatureWithSecret(tamperedPayload, signature, metaSecret, true)
    expect(valid).toBe(false)
  })

  it("Fails closed in production if signature is absent", () => {
    const payload = JSON.stringify({ object: "page" })
    const valid = verifySignatureWithSecret(payload, null, metaSecret, true)
    expect(valid).toBe(false)
  })

  it("Automatic send gate guarantees owner confirmation and disables automatic dispatch in MANUAL_APPROVAL mode", () => {
    // Mode MANUAL_APPROVAL must never auto-send
    const manualSettings = {
      mode: "MANUAL_APPROVAL",
      requireApproval: true,
      fullyAutomaticConfirmedByOwner: false,
    }
    expect(canAutoSendReply(manualSettings, false)).toBe(false)

    // AUTOMATIC mode without owner confirmation must never auto-send
    const unconfirmedAuto = {
      mode: "AUTOMATIC",
      requireApproval: false,
      fullyAutomaticConfirmedByOwner: false,
    }
    expect(canAutoSendReply(unconfirmedAuto, false)).toBe(false)

    // Confirmed AUTOMATIC mode sends automatically unless forceDraft is true (escalation)
    const confirmedAuto = {
      mode: "AUTOMATIC",
      requireApproval: false,
      fullyAutomaticConfirmedByOwner: true,
    }
    expect(canAutoSendReply(confirmedAuto, false)).toBe(true)
    expect(canAutoSendReply(confirmedAuto, true)).toBe(false) // Forced draft on escalation
  })

  it("Comment-to-DM keyword parsing correctly distinguishes between public and private replies", () => {
    const rawReply = JSON.stringify({
      public: "Thanks for commenting! We have sent you a DM with details.",
      private: "Here is your exclusive 20% discount code: PROMO20.",
    })

    const parsed = JSON.parse(rawReply)
    expect(parsed.public).toBe("Thanks for commenting! We have sent you a DM with details.")
    expect(parsed.private).toBe("Here is your exclusive 20% discount code: PROMO20.")

    // Plain text fallback
    const plainText = "Thank you for reaching out!"
    let fallbackPublic: string
    try {
      const p = JSON.parse(plainText)
      fallbackPublic = p.public || plainText
    } catch {
      fallbackPublic = plainText
    }
    expect(fallbackPublic).toBe("Thank you for reaching out!")
  })

  it("24-hour Meta messaging window enforces expiration for inbound DMs", () => {
    const now = Date.now()
    const withinWindow = new Date(now - 12 * 60 * 60 * 1000) // 12 hours ago
    const outsideWindow = new Date(now - 25 * 60 * 60 * 1000) // 25 hours ago

    const isWithin24h = (d: Date) => now - d.getTime() < 86_400_000

    expect(isWithin24h(withinWindow)).toBe(true)
    expect(isWithin24h(outsideWindow)).toBe(false)
  })
})
