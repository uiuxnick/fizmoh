import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { parseExternalFlow } from "@/lib/flow-importer"

export const POST = withErrors(async (request: NextRequest) => {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const raw = body.flowData ?? body
  if (!raw) {
    return NextResponse.json({ error: "Missing flowData" }, { status: 400 })
  }

  try {
    const result = parseExternalFlow(raw)
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to parse flow" }, { status: 422 })
  }
})
