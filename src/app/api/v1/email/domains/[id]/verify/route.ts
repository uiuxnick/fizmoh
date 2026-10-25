import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"
import dns from "dns/promises"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.domains.manage")
  if (response) return response

  const { id } = await context.params
  const tenantId = auth!.tenant.tenantId

  const domainRecord = await db.emailSenderDomain.findFirst({
    where: { id, tenantId },
  })

  if (!domainRecord) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 })
  }

  const domain = domainRecord.domain

  let spfStatus = "PENDING"
  let dkimStatus = "PENDING"
  let dmarcStatus = "PENDING"

  // 1. Verify SPF TXT record
  try {
    const txtRecords = await dns.resolveTxt(domain).catch(() => [])
    const flattenedTxt = txtRecords.flat().join(" ")
    if (flattenedTxt.toLowerCase().includes("include:_spf.fizmoh.cloud") || flattenedTxt.toLowerCase().includes("v=spf1")) {
      spfStatus = "VERIFIED"
    }
  } catch {}

  // 2. Verify DKIM CNAME or TXT
  try {
    const dkimHost = `fizmoh._domainkey.${domain}`
    const cnames = await dns.resolveCname(dkimHost).catch(() => [])
    if (cnames.some(c => c.toLowerCase().includes("fizmoh.cloud") || c.toLowerCase().includes("dkim"))) {
      dkimStatus = "VERIFIED"
    } else {
      const dkimTxt = await dns.resolveTxt(dkimHost).catch(() => [])
      if (dkimTxt.flat().join(" ").includes("v=DKIM1")) {
        dkimStatus = "VERIFIED"
      }
    }
  } catch {}

  // 3. Verify DMARC TXT
  try {
    const dmarcHost = `_dmarc.${domain}`
    const dmarcTxt = await dns.resolveTxt(dmarcHost).catch(() => [])
    if (dmarcTxt.flat().join(" ").toLowerCase().includes("v=dmarc1")) {
      dmarcStatus = "VERIFIED"
    }
  } catch {}

  const isAllVerified = spfStatus === "VERIFIED" && dkimStatus === "VERIFIED"
  const overallStatus = isAllVerified ? "VERIFIED" : "PENDING"

  const updatedRecords = [
    {
      type: "TXT",
      name: domain,
      value: "v=spf1 include:_spf.fizmoh.cloud ~all",
      status: spfStatus,
      purpose: "SPF Sender Authorization",
    },
    {
      type: "CNAME",
      name: `fizmoh._domainkey.${domain}`,
      value: `dkim.fizmoh.cloud`,
      status: dkimStatus,
      purpose: "DKIM Cryptographic Signature",
    },
    {
      type: "TXT",
      name: `_dmarc.${domain}`,
      value: "v=DMARC1; p=quarantine; sp=quarantine; pct=100;",
      status: dmarcStatus,
      purpose: "DMARC Phishing Protection",
    },
  ]

  const updated = await db.emailSenderDomain.update({
    where: { id: domainRecord.id },
    data: {
      status: overallStatus,
      spfStatus,
      dkimStatus,
      dmarcStatus,
      dnsRecordsJson: updatedRecords,
      verifiedAt: isAllVerified ? new Date() : domainRecord.verifiedAt,
    },
  })

  return NextResponse.json({
    success: true,
    domain: updated,
    isVerified: isAllVerified,
    spfStatus,
    dkimStatus,
    dmarcStatus,
  })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.domains.manage")
  if (response) return response

  const { id } = await context.params
  const tenantId = auth!.tenant.tenantId

  await db.emailSenderDomain.deleteMany({
    where: { id, tenantId },
  })

  return NextResponse.json({ success: true })
}
