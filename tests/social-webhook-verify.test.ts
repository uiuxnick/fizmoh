import { expect, test, describe } from "bun:test"
import crypto from "crypto"
import { verifySignatureWithSecret } from "../src/lib/social/social-webhook-verify"

function sign(payload: string, secret: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`
}

describe("webhook signature verification", () => {
  const secret = "test-app-secret"
  const payload = JSON.stringify({ object: "page", entry: [{ id: "123" }] })

  test("a correctly signed payload verifies", () => {
    expect(verifySignatureWithSecret(payload, sign(payload, secret), secret, true)).toBe(true)
  })

  test("a tampered payload fails verification", () => {
    const tampered = payload.replace("123", "456")
    expect(verifySignatureWithSecret(tampered, sign(payload, secret), secret, true)).toBe(false)
  })

  test("a signature made with the wrong secret fails", () => {
    expect(verifySignatureWithSecret(payload, sign(payload, "wrong-secret"), secret, true)).toBe(false)
  })

  test("a missing signature fails closed in production", () => {
    expect(verifySignatureWithSecret(payload, null, secret, true)).toBe(false)
  })

  test("a missing signature is tolerated only when not fail-closed (dev)", () => {
    expect(verifySignatureWithSecret(payload, null, secret, false)).toBe(true)
  })

  test("no secret configured fails closed in production rather than accepting anything", () => {
    expect(verifySignatureWithSecret(payload, sign(payload, secret), "", true)).toBe(false)
  })
})
