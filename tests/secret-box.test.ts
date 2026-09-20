import { expect, test, describe, beforeAll } from "bun:test"

// The module reads the key at call time, so this has to be set before import.
process.env.CONFIG_ENCRYPTION_KEY = "a".repeat(64)

const { encryptSecret, decryptSecret, isEncrypted, encryptionAvailable } = await import("../src/lib/secret-box")

describe("secrets at rest", () => {
  beforeAll(() => { expect(encryptionAvailable()).toBe(true) })

  test("a value survives the round trip", () => {
    const secret = "GOCSPX-not-a-real-secret-12345"
    const stored = encryptSecret(secret)
    expect(stored).not.toBe(secret)
    expect(stored).not.toContain(secret)
    expect(decryptSecret(stored)).toBe(secret)
  })

  test("the plaintext never appears in what is stored", () => {
    // The whole point: someone reading the column learns nothing.
    const secret = "sk-proj-abcdefghijklmnop"
    const stored = encryptSecret(secret)
    for (const fragment of ["sk-proj", "abcdef", "ijklmnop"]) {
      expect(stored.includes(fragment)).toBe(false)
    }
  })

  test("the same input encrypts differently each time", () => {
    // A fresh IV per write, so two identical secrets are not recognisable as
    // identical, and a repeated value cannot be spotted by eye in a dump.
    const a = encryptSecret("same-value")
    const b = encryptSecret("same-value")
    expect(a).not.toBe(b)
    expect(decryptSecret(a)).toBe("same-value")
    expect(decryptSecret(b)).toBe("same-value")
  })

  test("a tampered value refuses to decrypt rather than returning something wrong", () => {
    const stored = encryptSecret("original-secret")
    const parts = stored.split(":")
    // Flip the ciphertext. GCM authenticates it, so this must fail.
    parts[3] = Buffer.from("attacker-chosen-value").toString("base64")
    expect(decryptSecret(parts.join(":"))).toBe("")
  })

  test("values written before encryption existed still read", () => {
    // The migration cannot reach a value nobody has saved since. Plain text
    // must keep working or a setting silently becomes empty.
    expect(decryptSecret("plain-legacy-value")).toBe("plain-legacy-value")
    expect(isEncrypted("plain-legacy-value")).toBe(false)
  })

  test("an empty value stays empty rather than becoming ciphertext", () => {
    // "Not set" must not turn into a non-empty string, or every unset field
    // would start claiming it was configured.
    expect(encryptSecret("")).toBe("")
    expect(decryptSecret("")).toBe("")
  })

  test("multi-line JSON, such as a service account key", () => {
    const json = JSON.stringify({ private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n" })
    expect(decryptSecret(encryptSecret(json))).toBe(json)
  })
})
