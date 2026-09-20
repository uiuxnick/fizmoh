import { createHash } from "crypto"
import { sharedRedis, redisNamespace } from "@/lib/shared-redis"

type Entry = { count: number; resetAt: number }

const buckets = new Map<string, Entry>()
const MAX_BUCKETS = 20_000
let lastSweep = 0

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  if (now - lastSweep >= 60_000 || buckets.size >= MAX_BUCKETS) {
    for (const [entryKey, entry] of buckets) if (entry.resetAt <= now) buckets.delete(entryKey)
    lastSweep = now
  }
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    // Fail closed at capacity; evicting active keys would reset abuse limits.
    if (!current && buckets.size >= MAX_BUCKETS) return { allowed: false, retryAfter: 60 }
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }
  current.count += 1
  if (current.count <= limit) return { allowed: true, retryAfter: 0 }
  return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) }
}

export function requestIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")
    || "unknown"
}

export async function checkSharedRateLimit(key: string, limit: number, windowMs: number) {
  const redis = sharedRedis()
  if (!redis) return checkRateLimit(key, limit, windowMs)
  try {
    const result = await redis.eval(
      "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; return {n, redis.call('PTTL', KEYS[1])}",
      1, `${redisNamespace()}:rate:${createHash("sha256").update(key).digest("hex")}`, String(windowMs),
    ) as [number, number]
    return { allowed: result[0] <= limit, retryAfter: result[0] <= limit ? 0 : Math.max(1, Math.ceil(result[1] / 1000)) }
  } catch {
    // A shared limiter outage must not reset each worker's abuse budget.
    return { allowed: false, retryAfter: 5 }
  }
}
