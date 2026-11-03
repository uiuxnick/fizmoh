import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"
import { realtimeStatus } from "@/lib/realtime"
import { realtimeUpstreamUrl } from "@/lib/chat-api/realtime-upstream"
import { legacyRecoverySince } from "@/lib/chat-api/legacy-recovery"

export const dynamic = "force-dynamic"

export const GET = withErrors(async () => {
  const started = Date.now()
  let upstream: string | null
  try {
    upstream = realtimeUpstreamUrl()
    legacyRecoverySince(process.env)
  } catch {
    return NextResponse.json({ status: "unhealthy", configuration: "invalid" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
  try {
    await db.$queryRaw`SELECT 1`
    let realtime: string = realtimeStatus()
    if (upstream) {
      realtime = "unavailable"
      try {
        const response = await fetch(`${upstream}/api/health`, { signal: AbortSignal.timeout(2000), cache: "no-store", redirect: "error" })
        const health = await response.json()
        if (response.ok && health.status === "healthy" && health.database === "connected") realtime = "upstream"
      } catch { /* Fail readiness without exposing upstream details. */ }
    }
    if (realtime === "unavailable") {
      return NextResponse.json({ status: "unhealthy", database: "connected", realtime: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } })
    }
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      realtime,
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
