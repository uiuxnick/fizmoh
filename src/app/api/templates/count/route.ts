import { NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { BOT_TEMPLATES } from "@/lib/bot-templates"

/**
 * How many bot templates ship with the platform.
 *
 * Public, and deliberately trivial: the home page claims a number, and a
 * number typed into marketing copy is wrong the moment a template is added.
 * This is the one headline figure the platform can answer about itself.
 */
export const GET = withErrors(async () => {
  return NextResponse.json({ count: BOT_TEMPLATES.length })
})
