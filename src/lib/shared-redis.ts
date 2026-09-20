import Redis from "ioredis"

const state = globalThis as typeof globalThis & { fizmohRedis?: Redis }

/** Opt-in: single-process installations retain their existing behavior. */
export function sharedRedis(): Redis | null {
  const url = process.env.FIZMOH_REDIS_URL
  if (!url) return null
  if (!state.fizmohRedis) {
    state.fizmohRedis = new Redis(url, {
      connectTimeout: 1500, commandTimeout: 2000, maxRetriesPerRequest: 1,
      enableOfflineQueue: false, retryStrategy: attempt => Math.min(attempt * 200, 5000),
    })
    state.fizmohRedis.on("error", () => console.error("[redis] Shared transport unavailable"))
  }
  return state.fizmohRedis
}

export function redisNamespace(): string {
  return process.env.FIZMOH_REDIS_PREFIX || "fizmoh:production"
}
