import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireEmailMarketingAuth } from "@/lib/email-marketing/guard"

export async function GET(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.domains.read")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const domains = await db.emailSenderDomain.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      senders: true,
    },
  })

  return NextResponse.json({ domains })
}

export async function POST(request: NextRequest) {
  const { auth, response } = await requireEmailMarketingAuth(request, "email.domains.manage")
  if (response) return response

  const tenantId = auth!.tenant.tenantId
  const body = await request.json().catch(() => ({}))
  const { domain } = body

  if (!domain || typeof domain !== "string" || !domain.includes(".")) {
    return NextResponse.json({ error: "A valid domain name is required (e.g. mail.yourcompany.com)" }, { status: 400 })
  }

  const cleanDomain = domain.trim().toLowerCase()

  const dkimSelector = "fizmoh"
  const dnsRecords = [
    {
      type: "TXT",
      name: cleanDomain,
      value: "v=spf1 include:_spf.fizmoh.cloud ~all",
      status: "PENDING",
      purpose: "SPF Sender Authorization",
    },
    {
      type: "CNAME",
      name: `${dkimSelector}._domainkey.${cleanDomain}`,
      value: `dkim.fizmoh.cloud`,
      status: "PENDING",
      purpose: "DKIM Cryptographic Signature",
    },
    {
      type: "TXT",
      name: `_dmarc.${cleanDomain}`,
      value: "v=DMARC1; p=quarantine; sp=quarantine; pct=100;",
      status: "PENDING",
      purpose: "DMARC Phishing Protection",
    },
  ]

  const senderDomain = await db.emailSenderDomain.upsert({
    where: { tenantId_domain: { tenantId, domain: cleanDomain } },
    update: {
      dnsRecordsJson: dnsRecords,
    },
    create: {
      tenantId,
      domain: cleanDomain,
      status: "PENDING",
      dnsRecordsJson: dnsRecords,
    },
  })

  return NextResponse.json({ domain: senderDomain })
}
