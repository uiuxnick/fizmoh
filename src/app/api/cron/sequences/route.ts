import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { processDueSequences } from "@/lib/sequences"

export const GET = withErrors(async (req: NextRequest) => {
  const result = await processDueSequences()
  return NextResponse.json({
    status: "ok",
    ...result,
  })
})

export const POST = withErrors(async (req: NextRequest) => {
  const result = await processDueSequences()
  return NextResponse.json({
    status: "ok",
    ...result,
  })
})
