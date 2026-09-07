import { NextResponse } from "next/server"

/**
 * What build of the mobile app the server will still talk to.
 *
 * The app checks this on launch. Without it, shipping a breaking API change
 * means every install still on the old build simply stops working, with no way
 * to tell those people why or what to do about it — and no way to find out it
 * is happening, because a phone that fails quietly does not file a report.
 *
 * Configured by environment rather than by a database row: this is a property
 * of the deployment, it is set at the same moment the breaking change ships,
 * and there is nothing per-workspace about it. Unset means nothing is forced —
 * a missing variable must never lock anybody out of an app that works.
 *
 * Public on purpose. The one thing an app blocked from every other endpoint
 * still has to be able to ask is why.
 */

function build(name: string): number {
  const value = Number.parseInt(process.env[name] ?? "", 10)
  return Number.isFinite(value) && value > 0 ? value : 0
}

export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json({
    // Below this the app refuses to run and sends the user to the store.
    minimumBuild: build("APP_MIN_BUILD"),
    // Above the running build this is a suggestion, not a wall.
    latestBuild: build("APP_LATEST_BUILD"),
    // No default: an invented store link sends people to the wrong app, which
    // is worse than sending them nowhere. Set APP_STORE_URL when the listing
    // exists.
    storeUrl: process.env.APP_STORE_URL || "",
    message: process.env.APP_UPGRADE_MESSAGE || "",
  })
}
