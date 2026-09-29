import { NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import { getPublicPlanCatalogue } from "@/lib/public-plan-catalogue"

export const dynamic = "force-dynamic"

/** Public, read-only catalogue used by the marketing site and sign-up flow. */
export const GET = withErrors(async () => NextResponse.json(await getPublicPlanCatalogue()))
