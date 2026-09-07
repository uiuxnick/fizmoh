import { NextRequest, NextResponse } from "next/server"
import { withErrors } from "@/lib/api-handler"
import dns from "dns/promises"

export const POST = withErrors(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}))
  const domain = typeof body.domain === "string" ? body.domain : ""
  if (!domain) {
    return NextResponse.json({ error: "Enter a custom domain to test" }, { status: 400 })
  }

  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")

  try {
    const cnames: string[] = await dns.resolveCname(cleanDomain).catch(() => [])
    const aRecords: string[] = await dns.resolve4(cleanDomain).catch(() => [])

    const pointsToCname = cnames.some(c => c.toLowerCase().includes("fizmoh") || c.toLowerCase().includes("linetrip"))
    const pointsToIp = aRecords.includes("187.127.119.207")

    if (pointsToCname || pointsToIp) {
      return NextResponse.json({
        verified: true,
        cnameMatched: pointsToCname,
        ipMatched: pointsToIp,
        message: `DNS check passed! Domain '${cleanDomain}' is pointing to your Fizmoh workspace server.`,
        records: { cnames, aRecords },
      })
    }

    return NextResponse.json({
      verified: false,
      cnameMatched: false,
      ipMatched: false,
      message: `DNS records found for ${cleanDomain}: A [${aRecords.join(", ") || "none"}], CNAME [${cnames.join(", ") || "none"}]. Point CNAME to cname.fizmoh.cloud or A record to 187.127.119.207.`,
      records: { cnames, aRecords },
    })
  } catch (err: any) {
    return NextResponse.json({
      verified: false,
      error: `Could not resolve DNS for ${cleanDomain}: ${err.message || "Domain not found"}`,
    }, { status: 400 })
  }
})
