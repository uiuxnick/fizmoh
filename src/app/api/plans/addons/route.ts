import { NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { raw } from "@/lib/db"
import { DEFAULT_ADDONS, ensureDefaultAddons } from "@/lib/addon-catalog"

export const GET = withErrors(async () => {
  const count = await raw.planAddon.count()
  if (count < DEFAULT_ADDONS.length) {
    await ensureDefaultAddons().catch(err => console.error("[addons] sync failed:", err))
  }
  const addons = await raw.planAddon.findMany({ where: { isPublic: true }, orderBy: { sortOrder: "asc" } })
  return NextResponse.json({ addons })
})
