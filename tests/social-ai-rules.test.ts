import { expect, test, describe } from "bun:test"
import { detectSocialEscalation, canAutoSendReply, looksUnclear } from "../src/lib/social/social-ai"

describe("social escalation detection", () => {
  test("catches refund, legal, safety, abuse and payment mentions", () => {
    expect(detectSocialEscalation("I want a refund").escalate).toBe(true)
    expect(detectSocialEscalation("my lawyer will call you").escalate).toBe(true)
    expect(detectSocialEscalation("I was injured at your shop").escalate).toBe(true)
    expect(detectSocialEscalation("this is a scam").escalate).toBe(true)
    expect(detectSocialEscalation("my card was charged twice").escalate).toBe(true)
  })

  test("a genuinely ordinary question never escalates", () => {
    const r = detectSocialEscalation("What time do you open on Fridays?")
    expect(r.escalate).toBe(false)
  })

  test("empty text never escalates on its own", () => {
    expect(detectSocialEscalation(null).escalate).toBe(false)
    expect(detectSocialEscalation("").escalate).toBe(false)
  })

  test("a tenant's own extra keyword escalates", () => {
    const r = detectSocialEscalation("can I get a free upgrade", ["free upgrade"])
    expect(r.escalate).toBe(true)
    expect(r.matchedCategory).toBe("custom")
  })

  test("matching is case-insensitive", () => {
    expect(detectSocialEscalation("I WILL SUE YOU").escalate).toBe(true)
  })
})

describe("looksUnclear", () => {
  test("a stray character or emoji-only message is unclear", () => {
    expect(looksUnclear("👍")).toBe(true)
    expect(looksUnclear("k")).toBe(true)
  })
  test("a real question is not", () => {
    expect(looksUnclear("What are your opening hours?")).toBe(false)
  })
})

describe("automatic-send gate — human-handoff safety", () => {
  const base = { mode: "AUTOMATIC", fullyAutomaticConfirmedByOwner: true, requireApproval: false }

  test("only sends automatically when every condition holds", () => {
    expect(canAutoSendReply(base, false)).toBe(true)
  })

  test("an escalation (forceDraft) overrides everything, even a fully-confirmed automatic setup", () => {
    expect(canAutoSendReply(base, true)).toBe(false)
  })

  test("MANUAL_APPROVAL and DRAFT_ONLY never auto-send regardless of the owner-confirmation flag", () => {
    expect(canAutoSendReply({ ...base, mode: "MANUAL_APPROVAL" }, false)).toBe(false)
    expect(canAutoSendReply({ ...base, mode: "DRAFT_ONLY" }, false)).toBe(false)
  })

  test("AUTOMATIC mode without the owner's explicit confirmation never auto-sends", () => {
    expect(canAutoSendReply({ ...base, fullyAutomaticConfirmedByOwner: false }, false)).toBe(false)
  })

  test("requireApproval overrides a confirmed AUTOMATIC setup", () => {
    expect(canAutoSendReply({ ...base, requireApproval: true }, false)).toBe(false)
  })
})
