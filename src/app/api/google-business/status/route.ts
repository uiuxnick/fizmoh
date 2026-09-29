import { NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"
import { businessIntegrationStatus, recheckBusinessIntegration } from "@/lib/google-business-oauth"

export const GET = withErrors(withModule("DIGITAL_QR", async () => {
  const status = await businessIntegrationStatus()
  return NextResponse.json(status)
}))

export const POST = withErrors(withModule("DIGITAL_QR", async () => {
  const status = await recheckBusinessIntegration()
  return NextResponse.json(status)
}))
