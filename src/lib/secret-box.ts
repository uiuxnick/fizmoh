import crypto from "crypto"

/**
 * Encrypts credentials that have to live in the database.
 *
 * Most secrets belong in the environment file, and the ones that can be there
 * have been moved. But some are written at runtime and cannot be: the Google
 * refresh token arrives when somebody clicks Connect, and anything typed into
 * the settings screen is saved by the running process. Those had been going
 * into a text column in the clear, where read access to the database — a
 * backup file, a support query, a stolen connection string — was read access
 * to the credentials themselves.
 *
 * AES-256-GCM, so a tampered value fails to decrypt rather than decrypting to
 * something an attacker chose. The key lives in the environment, which means
 * a database dump on its own is no longer enough.
 *
 * Values written before this existed are still plain text. They are read as-is
 * and re-encrypted the next time they are saved, so nothing breaks on the way
 * through.
 */

const PREFIX = "enc.v1:"

function key(): Buffer | null {
  const raw = process.env.CONFIG_ENCRYPTION_KEY
  if (!raw) return null
  // A hex key of the right length is used directly; anything else is stretched,
  // so a human-typed passphrase still produces a valid 256-bit key.
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex")
  return crypto.createHash("sha256").update(raw).digest()
}

export function encryptionAvailable(): boolean {
  return key() !== null
}

export function isEncrypted(value: string): boolean {
  return typeof value === "string" && value.startsWith(PREFIX)
}

export function encryptSecret(plaintext: string): string {
  const secret = key()
  // Without a key the value is stored as it was. Refusing to save would lock
  // an operator out of their own settings screen over a missing variable,
  // which is a worse outcome than the status quo it replaces.
  if (!secret || plaintext === "") return plaintext

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", secret, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`
}

export function decryptSecret(value: string): string {
  if (!isEncrypted(value)) return value

  const secret = key()
  if (!secret) {
    // The key has gone missing while encrypted values remain. Returning the
    // ciphertext would send gibberish to Google or OpenAI and read as a
    // baffling authentication failure; empty reads as "not configured", which
    // is what the panel already knows how to show.
    console.error("CONFIG_ENCRYPTION_KEY is not set, but an encrypted setting was read")
    return ""
  }

  try {
    const [, ivPart, tagPart, dataPart] = value.split(":")
    const decipher = crypto.createDecipheriv("aes-256-gcm", secret, Buffer.from(ivPart, "base64"))
    decipher.setAuthTag(Buffer.from(tagPart, "base64"))
    return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64")), decipher.final()]).toString("utf8")
  } catch (error) {
    // Wrong key, or a value someone edited by hand.
    console.error("Could not decrypt a stored setting:", error instanceof Error ? error.message : error)
    return ""
  }
}
