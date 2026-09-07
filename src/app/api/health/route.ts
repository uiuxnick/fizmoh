import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrors } from "@/lib/api-handler"

export const dynamic = "force-dynamic"

export const GET = withErrors(async () => {
  const started = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: "healthy",
      database: "connected",
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
