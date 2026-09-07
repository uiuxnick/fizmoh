type Entry = { count: number; resetAt: number }

const buckets = new Map<string, Entry>()

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
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
