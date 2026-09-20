import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { sharedRedis } from "@/lib/shared-redis"

export const dynamic = "force-dynamic"

export const GET = withErrors(async () => {
  const started = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    const redis = sharedRedis()
    if (redis && redis.status !== "ready") {
      return NextResponse.json({ status: "unhealthy", database: "connected", realtime: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } })
    }
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      realtime: redis ? "redis" : "local",
      release: process.env.FIZMOH_RELEASE_ID || null,
      responseTimeMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({
      status: "unhealthy",
      database: "unavailable",
      timestamp: new Date().toISOString(),
    }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
})
