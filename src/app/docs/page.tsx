import type { Metadata } from "next"
import Link from "next/link"
import { BookOpen, Code2, Download, ExternalLink, ShieldCheck, Workflow, Sparkles, Database, Layers, Send, FileJson } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { SiteFooter, SiteHeader } from "@/components/site-header"

export async function generateMetadata() {
  const { pageSeo } = await import("@/lib/seo-config")
  return pageSeo("/docs", "Developer REST API & System Manual", "Official Developer REST API Reference and Operator Manual for WhatsApp commerce, campaigns, automation, CRM, bookings, and payments.")
}

const endpointGroups = [
  {
    title: "External V1 Public APIs (Developer & Integration)",
    items: [
      ["POST", "/api/external/v1/whatsapp/send", "Send text, media (image/doc/video), interactive buttons, and template messages"],
      ["GET", "/api/external/v1/whatsapp/templates", "List approved Meta WhatsApp templates with parameters"],
      ["POST", "/api/external/v1/whatsapp/broadcast", "Batch dispatch templates to up to 500 phone numbers"],
      ["GET", "/api/external/v1/customers", "Search and list CRM contacts with pagination and stage filter"],
      ["POST", "/api/external/v1/customers", "Create or upsert CRM contact details and tags"],
      ["GET/PATCH/DELETE", "/api/external/v1/customers/:id", "Retrieve, update, or remove a contact record"],
      ["GET", "/api/external/v1/orders", "Query bookings and orders with status and date filters"],
      ["POST", "/api/external/v1/orders", "Create order and generate instant AmwalPay customer checkout URL"],
      ["GET/POST/DELETE", "/api/external/v1/webhooks", "Manage HTTPS developer webhook subscriptions"],
    ],
  },
  {
    title: "Platform & Workspaces",
    items: [
      ["GET", "/api/health", "Public service and database health check"],
      ["GET", "/api/features", "Enabled modules for the current workspace"],
      ["GET", "/api/dashboard", "Workspace metrics and operational summary"],
      ["GET", "/api/search?q=...", "Search contacts, orders, and conversations"],
      ["GET", "/api/tenant/health", "Tenant usage and health summary"],
      ["GET", "/api/tenant/export", "Authenticated tenant data export"],
      ["GET", "/api/plans/public", "Public plan catalog"],
    ],
  },
  {
    title: "Tours, Bookings & Calendar",
    items: [
      ["GET/POST", "/api/tours", "List or create tours"],
      ["GET/PUT/DELETE", "/api/tours/:id", "Read, edit, or remove a tour"],
      ["GET/POST", "/api/slots", "Manage tour availability slots"],
      ["GET/POST", "/api/orders", "List or create customer orders"],
      ["GET/PUT/DELETE", "/api/orders/:id", "Read, update, or cancel an order"],
      ["POST", "/api/orders/:id/refund", "Request an order refund"],
      ["POST", "/api/orders/:id/reschedule", "Reschedule an order"],
      ["POST", "/api/orders/:id/send-confirmation", "Send a WhatsApp confirmation message"],
      ["GET", "/api/calendar", "Booking calendar data"],
      ["GET", "/api/calendar/ics", "Calendar subscription/download feed"],
    ],
  },
  {
    title: "WhatsApp & Omnichannel Commerce",
    items: [
      ["GET/POST", "/api/whatsapp/accounts", "List or connect WhatsApp numbers"],
      ["POST", "/api/whatsapp/send", "Send freeform text or interactive messages"],
      ["GET/POST", "/api/campaigns", "Manage broadcast promotional campaigns"],
      ["POST", "/api/campaigns/:id/send", "Trigger campaign broadcast to audience"],
      ["POST", "/api/whatsapp/templates/sync", "Synchronize templates from Meta"],
      ["GET/POST", "/api/botflows", "Visual botflow logic graphs and execution"],
      ["POST", "/api/amwalpay/create-session", "Initiate AmwalPay payment session"],
      ["POST", "/api/amwalpay/webhook", "Verify payment notifications"],
      ["GET", "/api/payments", "Payment records and verification queue"],
    ],
  },
]

function Code({ lines, title }: { lines: string[]; title?: string }) {
  return (
    <div className="rounded-[12px] bg-[#1D1D1D] border border-[#E5E7EB] overflow-hidden my-3 shadow-xs">
      {title && (
        <div className="px-3.5 py-1.5 bg-[#2A2A2A] border-b border-[#333] text-[11.5px] font-mono text-[#9ca3af] flex items-center justify-between">
          <span>{title}</span>
          <span className="text-[10px] uppercase font-bold text-[#00E785] bg-black/40 px-1.5 py-0.5 rounded">REST API</span>
        </div>
      )}
      <pre className="overflow-x-auto p-3.5 text-[12px] font-mono leading-5 text-[#00E785]">
        <code>{lines.join("\n")}</code>
      </pre>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[#E5E7EB] pt-8">
      <h2 className="text-xl font-extrabold tracking-tight text-[#1D1D1D]">{title}</h2>
      <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-[#717680]">{children}</div>
    </section>
  )
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white text-[#1D1D1D]">
      <SiteHeader />
      <main>
        {/* Header Hero */}
        <section className="border-b border-[#E5E7EB] bg-gradient-to-b from-[#FFF6DA]/50 via-white to-white py-10 sm:py-12 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#E5E7EB] bg-[#F2F2F2] px-3 py-1 text-[12px] font-bold text-[#1D1D1D]">
                <BookOpen className="h-3.5 w-3.5 text-[#00B96A]" /> Fizmoh API Reference &amp; Manual
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1D]">
                REST API Reference &amp; Operator Manual
              </h1>
              <p className="text-[14px] leading-relaxed text-[#717680]">
                Build enterprise integrations with Fizmoh Cloud. Send WhatsApp messages, trigger marketing broadcasts, manage CRM contacts, sync orders, and listen to real-time webhook events.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <a href="#api-reference" className="rounded-[8px] bg-[#00E785] hover:bg-[#00B96A] px-4 py-2 text-[12.5px] font-bold text-[#1D1D1D] transition border border-[#00B96A]/20">
                  Explore REST APIs
                </a>
                <a href="/api/docs/openapi.json" target="_blank" className="rounded-[8px] bg-white border border-[#1D1D1D] px-3.5 py-2 text-[12.5px] font-semibold text-[#1D1D1D] hover:bg-[#F2F2F2] flex items-center gap-1.5">
                  <FileJson className="h-3.5 w-3.5 text-[#00B96A]" /> OpenAPI 3.1 Spec
                </a>
                <a href="/api/docs/postman" className="rounded-[8px] bg-white border border-[#E5E7EB] px-3.5 py-2 text-[12.5px] font-semibold text-[#1D1D1D] hover:bg-[#F2F2F2] flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5 text-[#00B96A]" /> Postman Collection
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 py-10 sm:py-12 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4 text-[13px]">
              <p className="font-bold uppercase tracking-wider text-[#717680] text-[11.5px]">Navigation</p>
              <nav className="space-y-2 border-l border-[#E5E7EB] pl-3.5">
                <a href="#quick-start" className="block text-[#717680] hover:text-[#1D1D1D] font-medium transition">Quick start</a>
                <a href="#authentication" className="block text-[#717680] hover:text-[#1D1D1D] font-medium transition">Authentication</a>
                <a href="#code-examples" className="block text-[#717680] hover:text-[#1D1D1D] font-medium transition">Code Examples</a>
                <a href="#api-reference" className="block text-[#717680] hover:text-[#1D1D1D] font-medium transition">API Endpoint Catalog</a>
                <a href="#webhooks" className="block text-[#717680] hover:text-[#1D1D1D] font-medium transition">Webhooks</a>
                <a href="#operator-manual" className="block text-[#717680] hover:text-[#1D1D1D] font-medium transition">Operator manual</a>
              </nav>
              <div className="space-y-2 pt-3 border-t border-[#E5E7EB] text-[12.5px]">
                <a className="flex items-center gap-1.5 text-[#00B96A] hover:underline font-bold" href="/api/docs/openapi.json" target="_blank">
                  <FileJson className="h-3.5 w-3.5" /> OpenAPI Spec (.JSON)
                </a>
                <a className="flex items-center gap-1.5 text-[#00B96A] hover:underline font-bold" href="/api/docs/postman">
                  <Download className="h-3.5 w-3.5" /> Postman Collection
                </a>
                <a className="flex items-center gap-1.5 text-[#717680] hover:text-[#1D1D1D]" href="/admin">
                  <ExternalLink className="h-3.5 w-3.5" /> Open Dashboard
                </a>
              </div>
            </div>
          </aside>

          <article className="min-w-0 space-y-8">
            <Section id="quick-start" title="Quick Start & Architecture">
              <p>
                Fizmoh Cloud provides a multi-tenant API. Every request made with a tenant API key automatically operates within that tenant&apos;s isolated database scope.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FAFAFA] p-4 shadow-xs">
                  <WhatsAppIcon className="h-5 w-5 text-[#00B96A]" />
                  <h3 className="mt-2 font-bold text-[#1D1D1D] text-[13.5px]">1. WhatsApp API</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#717680]">Send texts, media, interactive list/button messages, and approved Meta templates.</p>
                </div>
                <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FAFAFA] p-4 shadow-xs">
                  <Workflow className="h-5 w-5 text-[#00B96A]" />
                  <h3 className="mt-2 font-bold text-[#1D1D1D] text-[13.5px]">2. CRM &amp; Orders</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#717680]">Sync customer contacts, stages, tags, bookings, and auto-generate AmwalPay checkout links.</p>
                </div>
                <div className="rounded-[12px] border border-[#E5E7EB] bg-[#FAFAFA] p-4 shadow-xs">
                  <ShieldCheck className="h-5 w-5 text-[#00B96A]" />
                  <h3 className="mt-2 font-bold text-[#1D1D1D] text-[13.5px]">3. Developer Webhooks</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#717680]">Subscribe to real-time events signed with HMAC SHA-256 secrets.</p>
                </div>
              </div>
            </Section>

            <Section id="authentication" title="Authentication">
              <p>
                Generate your secret API key in <strong className="text-[#1D1D1D]">Settings &rarr; API Keys &amp; Docs</strong>. Keys begin with the prefix <code className="rounded bg-[#F2F2F2] border border-[#E5E7EB] px-1.5 py-0.5 font-mono text-[11.5px] text-[#1D1D1D] font-bold">fiz_live_...</code>.
              </p>
              <p>Pass your API key in either of the following HTTP headers:</p>
              <Code
                title="HTTP Request Headers"
                lines={[
                  "X-API-Key: fiz_live_your_secret_key_here",
                  "# or",
                  "Authorization: Bearer fiz_live_your_secret_key_here",
                ]}
              />
            </Section>

            <Section id="code-examples" title="Integration Code Examples">
              <h3 className="font-bold text-[#1D1D1D] text-[14px]">1. Send WhatsApp Message (cURL)</h3>
              <Code
                title="cURL — Send Text Message"
                lines={[
                  "curl -sS -X POST https://app.fizmoh.cloud/api/external/v1/whatsapp/send \\",
                  "  -H 'Content-Type: application/json' \\",
                  "  -H 'X-API-Key: fiz_live_REPLACE_ME' \\",
                  "  -d '{",
                  '    "phone": "+96898821965",',
                  '    "type": "text",',
                  '    "text": "Your booking ORD-9821 is confirmed! View details: https://app.fizmoh.cloud"',
                  "  }'",
                ]}
              />

              <h3 className="font-bold text-[#1D1D1D] text-[14px] mt-4">2. Node.js Example</h3>
              <Code
                title="Node.js (TypeScript / JavaScript)"
                lines={[
                  'const res = await fetch("https://app.fizmoh.cloud/api/external/v1/whatsapp/send", {',
                  '  method: "POST",',
                  "  headers: {",
                  '    "Content-Type": "application/json",',
                  '    "X-API-Key": process.env.FIZMOH_API_KEY,',
                  "  },",
                  "  body: JSON.stringify({",
                  '    phone: "+96898821965",',
                  '    text: "Welcome to Fizmoh Cloud!",',
                  "  }),",
                  "});",
                  "const data = await res.json();",
                  'console.log("Message ID:", data.messageId);',
                ]}
              />
            </Section>

            <Section id="api-reference" title="REST API Endpoint Catalog">
              <div className="space-y-6">
                {endpointGroups.map(group => (
                  <div key={group.title}>
                    <h4 className="mb-2 font-bold text-[#1D1D1D] text-[14px] flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-[#00B96A]" /> {group.title}
                    </h4>
                    <div className="overflow-x-auto rounded-[12px] border border-[#E5E7EB] bg-white shadow-xs">
                      <table className="w-full min-w-[580px] text-left text-[12px]">
                        <thead className="bg-[#F2F2F2] text-[#1D1D1D] border-b border-[#E5E7EB]">
                          <tr>
                            <th className="px-3.5 py-2.5 font-bold w-28">Method</th>
                            <th className="px-3.5 py-2.5 font-bold font-mono">Path</th>
                            <th className="px-3.5 py-2.5 font-bold">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                          {group.items.map(([method, path, purpose]) => (
                            <tr key={method + path} className="hover:bg-[#FAFAFA] transition">
                              <td className="px-3.5 py-2">
                                <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10.5px] ${
                                  method === "GET"
                                    ? "bg-blue-100 text-blue-800"
                                    : method === "POST"
                                      ? "bg-[#00E785]/20 text-[#1D1D1D] border border-[#00E785]/40"
                                      : "bg-amber-100 text-amber-900"
                                }`}>
                                  {method}
                                </span>
                              </td>
                              <td className="px-3.5 py-2 font-mono text-[#1D1D1D] font-bold">{path}</td>
                              <td className="px-3.5 py-2 text-[#717680]">{purpose}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="webhooks" title="Developer Webhook Events">
              <p>
                Subscribe your backend systems to real-time events triggered by customer interactions, incoming messages, and payments.
              </p>
              <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-[#717680]">
                <li><code className="bg-[#F2F2F2] border border-[#E5E7EB] px-1 py-0.5 rounded font-mono text-[#1D1D1D] font-bold">message.received</code> — Inbound WhatsApp message received from a customer.</li>
                <li><code className="bg-[#F2F2F2] border border-[#E5E7EB] px-1 py-0.5 rounded font-mono text-[#1D1D1D] font-bold">message.delivered</code> — Message delivery receipt confirmation.</li>
                <li><code className="bg-[#F2F2F2] border border-[#E5E7EB] px-1 py-0.5 rounded font-mono text-[#1D1D1D] font-bold">order.created</code> — Customer created an order / booking.</li>
                <li><code className="bg-[#F2F2F2] border border-[#E5E7EB] px-1 py-0.5 rounded font-mono text-[#1D1D1D] font-bold">order.paid</code> — Verified AmwalPay payment received.</li>
              </ul>
            </Section>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#E5E7EB] bg-[#F2F2F2] p-6 text-[#1D1D1D]">
              <div>
                <h3 className="text-[15px] font-extrabold text-[#1D1D1D]">Ready to integrate?</h3>
                <p className="text-[13px] text-[#717680]">Download the Postman collection or view the OpenAPI specification.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/api/docs/openapi.json" target="_blank" className="inline-flex items-center gap-1.5 rounded-[8px] bg-white border border-[#1D1D1D] px-3.5 py-1.5 text-[12px] font-bold text-[#1D1D1D] hover:bg-[#E5E7EB]">
                  <FileJson className="h-3.5 w-3.5 text-[#00B96A]" /> OpenAPI 3.1
                </a>
                <a href="/api/docs/postman" className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#00E785] px-4 py-1.5 text-[12px] font-bold text-[#1D1D1D] hover:bg-[#00B96A] border border-[#00B96A]/20">
                  <Download className="h-3.5 w-3.5" /> Download Postman
                </a>
              </div>
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
