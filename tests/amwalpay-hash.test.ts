import { describe, expect, test, beforeAll } from "bun:test"
import crypto from "crypto"

/**
 * The AmwalPay integrity hash decides whether a payment notification is
 * accepted. Getting it wrong in one direction rejects real payments; in the
 * other it accepts forged ones. Both were live defects before these tests.
 *
 * The env has to be set before the module is imported, because the config is
 * read at call time from process.env.
 */
const SECURE_KEY = "A72CBD8813CC0A789A03C361CD173E3A81362B7C999763A159A659AF772DCBA8"

let verifyCallbackHash: (payload: Record<string, unknown>) => boolean
let generateSecureHash: (params: Record<string, unknown>, key: string) => string

beforeAll(async () => {
  process.env.AMWALPAY_MERCHANT_ID = "189552"
  process.env.AMWALPAY_TERMINAL_ID = "592424"
  process.env.AMWALPAY_SECURE_KEY = SECURE_KEY
  const mod = await import("../src/lib/amwalpay")
  verifyCallbackHash = mod.verifyCallbackHash
  generateSecureHash = mod.generateSecureHash
})

/** Builds the hash the way AmwalPay's own packages do. */
function sign(payload: Record<string, string>, trailingAmpersand = false): string {
  const fields = [
    "amount", "currencyId", "customerId", "customerTokenId", "merchantId",
    "merchantReference", "responseCode", "terminalId", "transactionId", "transactionTime",
  ]
  const input = fields.map(f => `${f}=${payload[f] ?? ""}`).join("&") + (trailingAmpersand ? "&" : "")
  return crypto.createHmac("sha256", Buffer.from(SECURE_KEY, "hex")).update(input, "utf8").digest("hex").toUpperCase()
}

const base = {
  amount: "68.250",
  currencyId: "512",
  customerId: "",
  customerTokenId: "",
  merchantId: "189552",
  merchantReference: "ORD-20260808-8914DA27",
  responseCode: "00",
  terminalId: "592424",
  transactionId: "TXN-1",
  transactionTime: "20260808180000",
}

describe("verifyCallbackHash", () => {
  test("accepts a correctly signed notification", () => {
    expect(verifyCallbackHash({ ...base, secureHashValue: sign(base) })).toBe(true)
  })

  test("accepts the trailing-ampersand form their packages produce", () => {
    expect(verifyCallbackHash({ ...base, secureHashValue: sign(base, true) })).toBe(true)
  })

  test("rejects a forged hash", () => {
    expect(verifyCallbackHash({ ...base, secureHashValue: "DEADBEEF".repeat(8) })).toBe(false)
  })

  test("rejects a notification with no hash at all", () => {
    expect(verifyCallbackHash({ ...base })).toBe(false)
  })

  test("rejects a tampered amount", () => {
    // The attack this exists to stop: a real notification replayed with the
    // amount reduced.
    const signed = sign(base)
    expect(verifyCallbackHash({ ...base, amount: "1.000", secureHashValue: signed })).toBe(false)
  })

  test("rejects a tampered order reference", () => {
    const signed = sign(base)
    expect(verifyCallbackHash({ ...base, merchantReference: "ORD-SOMEONE-ELSE", secureHashValue: signed })).toBe(false)
  })

  test("extra fields in the payload do not change the result", () => {
    // Hashing every key present, which is what the code used to do, breaks the
    // moment AmwalPay adds a field.
    const signed = sign(base)
    expect(verifyCallbackHash({ ...base, someNewField: "x", secureHashValue: signed })).toBe(true)
  })

  test('the literal strings "null" and "undefined" hash as empty', () => {
    const withNulls = { ...base, customerId: "null", customerTokenId: "undefined" }
    // Signed as empty, sent as the literal words — must still verify.
    expect(verifyCallbackHash({ ...withNulls, secureHashValue: sign(base) })).toBe(true)
  })

  test("the hash is case-insensitive on the received value", () => {
    expect(verifyCallbackHash({ ...base, secureHashValue: sign(base).toLowerCase() })).toBe(true)
  })
})

describe("generateSecureHash", () => {
  test("is stable for the same input", () => {
    const params = { amount: 10, merchantId: 189552, terminalId: 592424 }
    expect(generateSecureHash(params, SECURE_KEY)).toBe(generateSecureHash(params, SECURE_KEY))
  })

  test("ignores key order, since it sorts alphabetically", () => {
    const a = generateSecureHash({ b: 2, a: 1 }, SECURE_KEY)
    const b = generateSecureHash({ a: 1, b: 2 }, SECURE_KEY)
    expect(a).toBe(b)
  })

  test("excludes secureHashValue from its own input", () => {
    const withOut = generateSecureHash({ a: 1 }, SECURE_KEY)
    const withIn = generateSecureHash({ a: 1, secureHashValue: "ANYTHING" }, SECURE_KEY)
    expect(withIn).toBe(withOut)
  })

  test("a different key produces a different hash", () => {
    const other = "B".repeat(64)
    expect(generateSecureHash({ a: 1 }, SECURE_KEY)).not.toBe(generateSecureHash({ a: 1 }, other))
  })
})
