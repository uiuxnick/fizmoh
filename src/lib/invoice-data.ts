/**
 * One invoice, read into the shape the reference design expects.
 *
 * Both the HTML view (pixel-identical to the design) and the WhatsApp PDF read
 * through this, so a field fixed or added here is fixed in both places at
 * once. Nothing here invents data: a field with nothing behind it comes back
 * empty, and the caller decides how an empty field renders — a dash on the
 * PDF, a blank cell on the page. Neither should show a plausible-looking value
 * nobody actually entered.
 */

import { db } from "@/lib/db"
import { getConfigValue } from "@/lib/app-config"

export type InvoiceViewModel = {
  invoice: { number: string; date: string; dueDate: string; status: string }
  company: {
    name: string; tagline: string; website: string
    email: string; phone: string; address: string
    signatureUrl?: string
    signatoryName?: string
  }
  customer: { name: string; email: string; phone: string; address: string }
  subscription: {
    planName: string; type: string; billingCycle: string
    startDate: string; expiryDate: string; renewalDate: string
    accountWebsite: string; status: string
  }
  items: Array<{ description: string; qty: number; rate: number }>
  vatPercent: number
  discount: number
  amountPaid: number
  payment: { method: string; transactionReference: string; paymentDate: string }
} | null

const dateLabel = (v: Date | null | undefined) =>
  v ? v.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : ""

export async function loadInvoiceViewModel(invoiceId: string): Promise<InvoiceViewModel> {
  const invoice = await db.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
    include: { subscription: { include: { plan: true } }, items: { orderBy: { position: "asc" } } },
  })
  if (!invoice) return null

  const tenant = await db.tenant.findUnique({ where: { id: invoice.tenantId } })
  const owner = await db.tenantMember.findFirst({
    where: { tenantId: invoice.tenantId, role: "OWNER" },
    include: { staff: { select: { email: true, phone: true } } },
  })

  const [coName, coTag, coEmail, coPhone, coAddress, coWeb, coSigUrl, coSigName] = await Promise.all([
    getConfigValue("invoice_company_name").catch(() => ""),
    getConfigValue("invoice_company_tagline").catch(() => ""),
    getConfigValue("invoice_company_email").catch(() => ""),
    getConfigValue("invoice_company_phone").catch(() => ""),
    getConfigValue("invoice_company_address").catch(() => ""),
    getConfigValue("invoice_company_website").catch(() => ""),
    getConfigValue("invoice_signature_url").catch(() => ""),
    getConfigValue("invoice_signatory_name").catch(() => ""),
  ])

  // Check if static signature file exists if no custom url was configured
  let signatureUrl = coSigUrl || ""
  if (!signatureUrl) {
    try {
      const fs = await import("fs")
      const path = await import("path")
      const sigPath = path.join(process.cwd(), "public", "invoice", "signature.png")
      if (fs.existsSync(sigPath)) {
        signatureUrl = "/invoice/signature.png"
      }
    } catch {
      // ignore
    }
  }

  // Real line items if the invoice has them; otherwise the single amount it
  // is actually billed for, described by its plan and period.
  const items = invoice.items.length
    ? invoice.items.map(i => ({ description: i.description, qty: i.quantity, rate: i.unitAmount / 1000 }))
    : [{
        description: `${invoice.subscription?.plan?.name || "Subscription"} - ${
          invoice.period === "YEARLY" ? "annual" : "monthly"
        }`,
        qty: 1,
        rate: invoice.amount / 1000,
      }]

  return {
    invoice: {
      number: invoice.reference,
      date: dateLabel(invoice.createdAt),
      dueDate: dateLabel(invoice.createdAt),
      status: invoice.status,
    },
    company: {
      name: coName || "FIZMOH TECHNOLOGIES",
      tagline: coTag || "Technology . Software . Digital Solutions",
      website: coWeb || "www.fizmoh.com",
      email: coEmail || "info@fizmoh.com",
      phone: coPhone || "",
      address: coAddress || "",
      signatureUrl,
      signatoryName: coSigName || "Authorised Signature",
    },
    customer: {
      name: tenant?.name || "",
      email: owner?.staff?.email || "",
      phone: owner?.staff?.phone || "",
      address: "",
    },
    subscription: {
      planName: invoice.subscription?.plan?.name || "",
      type: invoice.period === "YEARLY" ? "Annual Subscription" : "Monthly Subscription",
      billingCycle: invoice.period === "YEARLY" ? "Yearly" : "Monthly",
      startDate: dateLabel(invoice.periodStart),
      expiryDate: dateLabel(invoice.periodEnd),
      renewalDate: dateLabel(invoice.subscription?.currentPeriodEnd),
      accountWebsite: tenant?.customDomain || (tenant?.slug ? `${tenant.slug}.fizmoh.cloud` : ""),
      status: invoice.subscription?.status || "",
    },
    items,
    vatPercent: 0,
    discount: 0,
    amountPaid: invoice.status === "PAID" ? invoice.amount / 1000 : 0,
    payment: {
      method: invoice.gatewayReference ? "Card (AmwalPay)" : "-",
      transactionReference: invoice.gatewayReference || "-",
      paymentDate: dateLabel(invoice.paidAt),
    },
  }
}
