import { describe, expect, test } from "bun:test"
import { supportLead, supportReference, signSupportSession, verifySupportSession } from "../src/lib/platform-support"

describe("platform support visitor boundary", () => {
  test("requires name and international phone before starting chat", () => {
    expect(supportLead.safeParse({ name: "", phone: "+96898314456" }).success).toBe(false)
    expect(supportLead.safeParse({ name: "Visitor", phone: "98314456" }).success).toBe(false)
    expect(supportLead.parse({ name: " Visitor ", phone: "+968 9831 4456" }).phone).toBe("+96898314456")
    expect(supportLead.safeParse({ name: "Visitor", phone: "+96898314456", mode: "ticket" }).success).toBe(false)
  })
  test("references do not depend on a racy table count", () => {
    expect(new Set(Array.from({ length: 1000 }, supportReference)).size).toBe(1000)
  })
  test("signed visitor access cannot be changed to another ticket", async () => {
    const old = process.env.JWT_SECRET
    process.env.JWT_SECRET = "support-test-only-secret-at-least-32-characters"
    try {
      const token = await signSupportSession("ticket-a", "visitor:a")
      expect(await verifySupportSession(token)).toEqual({ ticketId: "ticket-a", visitorId: "visitor:a" })
      const parts = token.split("."); parts[1] = Buffer.from(JSON.stringify({ ticketId: "ticket-b", visitorId: "visitor:a" })).toString("base64url")
      expect(await verifySupportSession(parts.join("."))).toBeNull()
      expect(await verifySupportSession("ticket-a")).toBeNull()
    } finally { if (old === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = old }
  })
})
