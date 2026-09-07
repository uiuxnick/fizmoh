import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { searchKnowledge } from "@/lib/knowledge"

/** Lets an operator see exactly what the assistant would find for a question. */
export const GET = withErrors(async (request: NextRequest) => {
  const query = new URL(request.url).searchParams.get("q") || ""
  if (query.trim().length < 2) return NextResponse.json({ passages: [] })
  return NextResponse.json({ passages: await searchKnowledge(query, 8) })
})
