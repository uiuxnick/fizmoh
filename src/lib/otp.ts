import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { PLATFORM } from "@/lib/tenant"

/**
 * One-time codes, for signing in without a password.
 *
 * The code itself is never stored — only an HMAC of it. A stored code is a
 * password in the clear that happens to expire, and a database dump would hand
 * over every account that had one outstanding.
 *
 * This was written twice, once in each of the two OTP routes, with the same
 * logic copied between them. A third copy for staff sign-in would have been
 * three places to fix a mistake, so it lives here now.
 */

const TTL_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 5

function hash(subject: string, code: string): string {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || "dev-otp-secret"
  return createHmac("sha256", secret).update(`${subject}:${code}`).digest("hex")
}

/** Six digits, from a generator meant for secrets rather than for dice. */
export function generateOtp(): string {
  return randomInt(100000, 1000000).toString()
}

/** Secure random 32-byte hexadecimal token for 1-click magic link authentication */
export function generateMagicToken(): string {
  return randomBytes(32).toString("hex")
}

export async function storeMagicToken(token: string, staffId: string, ttlMs = 15 * 60 * 1000): Promise<void> {
  const key = `magic_${token}`
  const record = JSON.stringify({ staffId, expiresAt: Date.now() + ttlMs, attempts: 0 })
  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: PLATFORM, key } },
    update: { value: record, type: "JSON", category: "AUTH" },
    create: { key, value: record, type: "JSON", category: "AUTH" },
  })
}

export async function verifyAndConsumeMagicToken(token: string): Promise<string | null> {
  if (!token || typeof token !== "string" || token.length < 16) return null
  const key = `magic_${token}`
  const stored = await db.systemSetting.findFirst({
    where: { tenantId: PLATFORM, key },
  })
  if (!stored) return null

  try {
    const record = JSON.parse(stored.value)
    if (!record || record.expiresAt < Date.now()) {
      await db.systemSetting.deleteMany({ where: { tenantId: PLATFORM, key } }).catch(() => {})
      return null
    }
    // Delete immediately so it is strictly single-use
    await db.systemSetting.deleteMany({ where: { tenantId: PLATFORM, key } }).catch(() => {})
    return record.staffId || null
  } catch {
    await db.systemSetting.deleteMany({ where: { tenantId: PLATFORM, key } }).catch(() => {})
    return null
  }
}

export async function storeOtp(key: string, subject: string, code: string): Promise<void> {
  const record = JSON.stringify({ hash: hash(subject, code), expiresAt: Date.now() + TTL_MS, attempts: 0 })
  await db.systemSetting.upsert({
    where: { tenantId_key: { tenantId: PLATFORM, key } },
    update: { value: record, type: "JSON", category: "AUTH" },
    create: { key, value: record, type: "JSON", category: "AUTH" },
  })
}

export async function clearOtp(key: string): Promise<void> {
  await db.systemSetting.deleteMany({ where: { key } }).catch(() => {})
}

/**
 * Checks a code, counting the attempts.
 *
 * Compared in constant time: a comparison that returns early on the first
 * wrong character leaks, in its timing, how much of the code was right.
 */
export async function verifyOtp(key: string, subject: string, code: string): Promise<boolean> {
  const stored = await db.systemSetting.findFirst({ where: { key } })
  if (!stored) return false

  let record: { hash: string; expiresAt: number; attempts: number }
  try {
    record = JSON.parse(stored.value)
  } catch {
    await clearOtp(key)
    return false
  }

  if (record.expiresAt < Date.now() || record.attempts >= MAX_ATTEMPTS) {
    await clearOtp(key)
    return false
  }

  const actual = Buffer.from(hash(subject, code), "hex")
  const expected = Buffer.from(record.hash, "hex")
  const valid = actual.length === expected.length && timingSafeEqual(actual, expected)

  if (!valid) {
    record.attempts += 1
    await db.systemSetting.update({ where: { tenantId_key: { tenantId: PLATFORM, key } }, data: { value: JSON.stringify(record) } })
    return false
  }

  // A code is good once. Leaving it usable would turn a shoulder-surfed
  // message into a standing key.
  await clearOtp(key)
  return true
}
