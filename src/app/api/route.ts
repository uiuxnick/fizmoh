import { NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"

export const GET = withErrors(async () => {
  return NextResponse.json({ service: "wptour", status: "ok" })
})
