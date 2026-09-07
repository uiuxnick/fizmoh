import { NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { db } from "@/lib/db"

export const GET = withErrors(async () => {
  const addons = await db.planAddon.findMany({ where: { isPublic: true }, orderBy: { sortOrder: "asc" } })
  return NextResponse.json({ addons })
})
