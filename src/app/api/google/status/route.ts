import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { getConfigValue } from "@/lib/app-config"
import { oauthConfigured, oauthConnected } from "@/lib/google-oauth"

export const GET = withErrors(async (req: NextRequest) => {
  const ready = await oauthConfigured()
  const connected = await oauthConnected()
  const account = (await getConfigValue("google_oauth_account")) || null

  return NextResponse.json({
    ready,
    connected,
    account,
  })
})
