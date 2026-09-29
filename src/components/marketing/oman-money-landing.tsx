"use client"

import { useState } from "react"
import Link from "next/link"
import { SiteHeader, SiteFooter } from "@/components/site-header"
import { ClientLogos } from "@/components/client-logos"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Check,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  Award,
  CheckCircle2,
  Lock,
  Building2,
  DollarSign,
  TrendingUp,
  Server,
  FileCheck2,
  ChevronRight,
  Code2,
  Terminal,
  Copy,
  Layers,
  Globe,
  Cpu,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  CreditCard,
  XCircle,
  FileText,
} from "lucide-react"

export interface OmanPageData {
  slug: string
  badge: string
  h1: string
  subheadline: string
  introHeading: string
  introText: string
  keyFeatures: { title: string; description: string }[]
  benefits: { stat: string; label: string; description: string }[]
  faqs: { q: string; a: string }[]
}

export function OmanMoneyLanding({ data }: { data: OmanPageData }) {
  const [conversations, setConversations] = useState(25000)
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "node" | "python" | "webhook">("curl")
  const [copied, setCopied] = useState(false)
  const [phoneSimState, setPhoneSimState] = useState<"idle" | "sending" | "delivered" | "paid">("delivered")

  // Pricing calculations
  const metaRate = 0.0135 // Meta official cost per conversation in OMR
  const aggregatorMarkup = 0.019 // Average reseller markup in Oman
  const fizmohCost = (conversations * metaRate).toFixed(1)
  const legacyCost = (conversations * (metaRate + aggregatorMarkup)).toFixed(1)
  const annualSavings = (conversations * aggregatorMarkup * 12).toFixed(0)

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  }

  const codeSnippets = {
    curl: `curl -X POST "https://api.fizmoh.cloud/v1/messages" \\
  -H "Authorization: Bearer fz_live_muscat_98214" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+96898314456",
    "type": "template",
    "template": {
      "name": "oman_order_confirmation",
      "language": { "code": "ar" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Nick Sharma" },
            { "type": "currency", "amount_1000": 25000, "currency": "OMR" }
          ]
        }
      ]
    }
  }'`,
    node: `import { Fizmoh } from "@fizmoh/sdk";

const client = new Fizmoh({ apiKey: process.env.FIZMOH_SECRET_KEY });

// Send official Meta Cloud API template with zero per-message markup
const response = await client.messages.send({
  to: "+96898314456",
  channel: "whatsapp",
  template: "oman_order_confirmation",
  variables: {
    customerName: "Nick Sharma",
    orderTotal: "25.000 OMR",
    checkoutUrl: "https://app.fizmoh.cloud/pay/FZ-9821"
  }
});

console.log("Meta Cloud Message ID:", response.messageId);`,
    python: `from fizmoh import FizmohClient

client = FizmohClient(api_key="fz_live_muscat_98214")

# Dispatch high-throughput WhatsApp template to Oman numbers
message = client.messages.create(
    to="+96898314456",
    template="oman_order_confirmation",
    language="ar",
    params={
        "customer_name": "Nick Sharma",
        "amount_omr": 25.000,
        "payment_gateway": "AmwalPay"
    }
)

print(f"Delivered in {message.latency_ms}ms via Muscat Edge")`,
    webhook: `{
  "event": "message.delivered",
  "platform": "whatsapp_cloud_api",
  "edge_region": "me-central-muscat",
  "latency_ms": 22.4,
  "data": {
    "message_id": "wamid.HBgMOTY4OTgzMTQ0NTYVAgASGBQzQTkyRDc=",
    "recipient": "+96898314456",
    "status": "delivered",
    "cost_omr": 0.0135,
    "markup_fee": 0.0000,
    "verified_badge": true
  }
}`,
  }

  const copyCode = () => {
    navigator.clipboard.writeText(codeSnippets[activeCodeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const roadmapSteps = [
    {
      num: "01",
      title: "Commercial Registration (CR) Verification",
      time: "Day 1",
      desc: "Submit your Ministry of Commerce, Industry and Investment Promotion (MOCIIP) CR and utility bill for fast-track validation.",
    },
    {
      num: "02",
      title: "Meta Business Manager Domain Binding",
      time: "Day 1 - 2",
      desc: "Verify your official business website domain (DNS TXT record) and enable 2-Factor Authentication on your Meta BM.",
    },
    {
      num: "03",
      title: "Direct Cloud API Number Provisioning",
      time: "Day 2",
      desc: "Onboard your official landline (+968 24XXXXXX) or mobile number directly onto Meta's regional Cloud infrastructure.",
    },
    {
      num: "04",
      title: "Official Green Tick Badge Issuance",
      time: "Day 3 - 5",
      desc: "Meta evaluates notable brand presence and awards the official green checkmark next to your business name.",
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="min-h-screen bg-[#0A2540] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
        <SiteHeader />

        <main className="flex-1 overflow-hidden">
          {/* ========================================================================= */}
          {/* STRIPE-INSPIRED HERO SECTION WITH ANGLED GRADIENT MESH                    */}
          {/* ========================================================================= */}
          <section className="relative pt-12 pb-24 md:pt-20 md:pb-36 overflow-hidden">
            {/* Stripe Signature Angled Aurora Gradient Background */}
            <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
              <div
                className="absolute -top-[30%] -left-[10%] w-[130%] h-[120%] opacity-40 blur-3xl"
                style={{
                  background:
                    "radial-gradient(ellipse at 20% 30%, #00D4B2 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #635BFF 0%, transparent 50%), radial-gradient(ellipse at 50% 60%, #059669 0%, transparent 60%)",
                }}
              />
              {/* Subtle architectural perspective grid */}
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
                  backgroundSize: "64px 64px",
                }}
              />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Live Edge Status Bar */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 text-emerald-300 mb-8 transition-all">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="font-mono">Meta Cloud API · Muscat Edge &lt; 24ms</span>
                <span className="text-white/30">|</span>
                <span className="text-white font-medium flex items-center gap-1">
                  0% Surcharge <ArrowRight className="h-3 w-3" />
                </span>
              </div>

              <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                {/* Left Column: Authoritative Copy */}
                <div className="lg:col-span-7 space-y-6 text-start">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    {data.badge}
                  </div>

                  <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-black tracking-tight leading-[1.05] text-white">
                    WhatsApp Business API for Oman.{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">
                      Direct from Meta.
                    </span>
                  </h1>

                  <p className="text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed font-normal">
                    {data.subheadline}
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap items-center gap-4 pt-3">
                    <Button
                      size="lg"
                      className="h-13 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-xl shadow-emerald-500/25 transition-transform hover:scale-[1.02] cursor-pointer text-base"
                      asChild
                    >
                      <Link href="/signup">
                        Start 14-Day Free Trial
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-13 px-7 rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold backdrop-blur-sm cursor-pointer text-base"
                      asChild
                    >
                      <Link href="/book-demo">Talk to an API Specialist</Link>
                    </Button>
                  </div>

                  {/* Micro Trust Indicators */}
                  <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Official Meta Green Tick</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Local AmwalPay OMR</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Muscat SLA Support</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Stripe-Style Interactive Product & Code Showcase */}
                <div className="lg:col-span-5 relative">
                  {/* Subtle 3D Perspective Glow */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/30 to-blue-500/30 rounded-3xl blur-2xl opacity-60" />

                  <div className="relative rounded-2xl border border-white/20 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden">
                    {/* Browser Terminal Chrome */}
                    <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-rose-500/90 inline-block" />
                        <span className="h-3 w-3 rounded-full bg-amber-500/90 inline-block" />
                        <span className="h-3 w-3 rounded-full bg-emerald-500/90 inline-block" />
                        <span className="ml-2 text-xs font-mono text-slate-400">
                          whatsapp-cloud-api.fizmoh.om
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                        200 OK
                      </span>
                    </div>

                    {/* Interactive Live Message Demo */}
                    <div className="p-6 space-y-4">
                      {/* Incoming Meta Webhook Event */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 font-mono text-xs">
                        <div className="flex justify-between items-center text-slate-400 mb-2 pb-2 border-b border-white/10">
                          <span className="text-emerald-400 font-bold">POST /v1/messages</span>
                          <span>Latency: 22ms</span>
                        </div>
                        <div className="space-y-1 text-slate-300">
                          <p><span className="text-slate-500">to:</span> <span className="text-cyan-300">&quot;+968 9831 4456&quot;</span></p>
                          <p><span className="text-slate-500">template:</span> <span className="text-amber-300">&quot;oman_invoice_omr&quot;</span></p>
                          <p><span className="text-slate-500">settlement:</span> <span className="text-emerald-400">&quot;AmwalPay (0% Markup)&quot;</span></p>
                        </div>
                      </div>

                      {/* Simulated WhatsApp Phone Notification Screen */}
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 relative overflow-hidden">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            WA
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-xs text-white truncate">Fizmoh Official</h4>
                              <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black">
                                ✓
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 leading-snug">
                              Salam Nick! Your order #FZ-9821 for 25.000 OMR has been confirmed. Tap below to pay via Apple Pay.
                            </p>
                          </div>
                        </div>

                        {/* Interactive Payment Button Pill */}
                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                            Amount: 25.000 OMR
                          </span>
                          <span className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-bold">
                            Paid with Apple Pay ✓
                          </span>
                        </div>
                      </div>

                      {/* Real-time Meta throughput counter */}
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2">
                        <span className="flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-emerald-400" />
                          Throughput: 1,000 msgs/sec
                        </span>
                        <span className="text-emerald-400 font-bold">Meta Tier 3 Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* CLIENT PROOF / TRUSTED BRANDS WALL                                       */}
          {/* ========================================================================= */}
          <section className="py-12 border-y border-white/10 bg-[#071B2F]/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ClientLogos />
            </div>
          </section>

          {/* ========================================================================= */}
          {/* STRIPE-STYLE INTERACTIVE OMR SAVINGS DASHBOARD CALCULATOR                  */}
          {/* ========================================================================= */}
          <section className="py-24 border-b border-white/10 bg-[#092138] relative">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
                  <DollarSign className="h-3.5 w-3.5" />
                  Transparent Telecom Economics
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                  Stop Paying Aggregator Markups.
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
                  Legacy middlemen charge hidden markups (18–25 baisa) on every WhatsApp conversation. 
                  Fizmoh passes Meta Cloud API through at pure direct cost (0% fee).
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-slate-900/90 shadow-2xl p-6 sm:p-12 grid lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-7 space-y-8">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                        Monthly Conversations:
                      </span>
                      <span className="text-3xl font-mono font-black text-emerald-400">
                        {conversations.toLocaleString()}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="5000"
                      max="100000"
                      step="5000"
                      value={conversations}
                      onChange={(e) => setConversations(parseInt(e.target.value))}
                      className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />

                    <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                      <span>5,000 / mo</span>
                      <span>50,000 / mo</span>
                      <span>100,000+ / mo</span>
                    </div>
                  </div>

                  {/* Side-by-Side Breakdown Cards */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10">
                      <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                        Fizmoh Cloud API
                      </span>
                      <div className="text-2xl font-mono font-black text-white mt-1">
                        {fizmohCost} <span className="text-sm font-sans font-normal text-slate-400">OMR/mo</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        0% markup · Direct Meta invoice
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl border border-white/10 bg-slate-950/60 opacity-80">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Legacy Middleman
                      </span>
                      <div className="text-2xl font-mono font-black text-slate-400 line-through mt-1">
                        {legacyCost} <span className="text-sm font-sans font-normal text-slate-500">OMR/mo</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Hidden +19 baisa per message markup
                      </p>
                    </div>
                  </div>
                </div>

                {/* Net Annual Retained Earnings Callout */}
                <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 p-8 text-white shadow-xl flex flex-col justify-between text-center">
                  <div>
                    <span className="text-xs uppercase tracking-widest font-bold text-emerald-200">
                      Net Retained Budget / Year
                    </span>
                    <div className="text-5xl sm:text-6xl font-black font-mono my-3 tracking-tight">
                      +{annualSavings} <span className="text-2xl font-sans font-semibold">OMR</span>
                    </div>
                    <p className="text-xs text-emerald-100 leading-relaxed max-w-xs mx-auto">
                      Real cash preserved in your company's bottom line rather than surrendered to telecom reselling margins.
                    </p>
                  </div>

                  <Button
                    size="lg"
                    className="mt-6 w-full h-12 rounded-full bg-white text-slate-950 hover:bg-emerald-50 font-bold cursor-pointer"
                    asChild
                  >
                    <Link href="/signup">Claim 0% Markup Account</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* STRIPE-STYLE DEVELOPER CODE TAB SECTION                                   */}
          {/* ========================================================================= */}
          <section className="py-24 border-b border-white/10 bg-[#071828]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-5 space-y-6 text-start">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Terminal className="h-3.5 w-3.5" />
                    Developer-First API Design
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    Engineered for Instant Deployment.
                  </h2>

                  <p className="text-base text-slate-300 leading-relaxed">
                    Integrate official WhatsApp messaging with clean RESTful endpoints, official client SDKs, 
                    and cryptographic HMAC-SHA256 signed webhooks.
                  </p>

                  <ul className="space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Native support for Interactive Buttons &amp; Lists</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Zero-drop webhooks with automatic retries</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Sub-50ms SLA across all GCC telecom carriers</span>
                    </li>
                  </ul>

                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 rounded-full cursor-pointer"
                    asChild
                  >
                    <Link href="/docs">
                      View API Reference <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>

                {/* Code Terminal Box */}
                <div className="lg:col-span-7 rounded-2xl border border-white/15 bg-slate-950 shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-2.5">
                    {/* Tabs */}
                    <div className="flex gap-2">
                      {(["curl", "node", "python", "webhook"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveCodeTab(tab)}
                          className={`px-3 py-1 text-xs font-mono rounded-md font-semibold transition cursor-pointer ${
                            activeCodeTab === tab
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {tab === "curl"
                            ? "cURL"
                            : tab === "node"
                            ? "Node.js"
                            : tab === "python"
                            ? "Python"
                            : "Webhook JSON"}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={copyCode}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-mono transition cursor-pointer"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <pre className="p-5 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed bg-slate-950">
                    <code>{codeSnippets[activeCodeTab]}</code>
                  </pre>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* STRIPE-STYLE ARCHITECTURE COMPARISON TABLE                                */}
          {/* ========================================================================= */}
          <section className="py-24 border-b border-white/10 bg-[#092138]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Official Meta Cloud API vs. Legacy Aggregators
                </h2>
                <p className="mt-3 text-slate-300 text-base">
                  Why leading enterprises in Muscat, Sohar, and Salalah switch to Fizmoh.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="py-4 px-6">Capability</th>
                      <th className="py-4 px-6 text-emerald-400 bg-emerald-500/10 rounded-t-xl">
                        Fizmoh (Direct Meta Cloud)
                      </th>
                      <th className="py-4 px-6 text-slate-400">Legacy Middleman / Reseller</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    <tr>
                      <td className="py-4 px-6 font-semibold text-white">Message Surcharge / Markup</td>
                      <td className="py-4 px-6 font-mono font-bold text-emerald-400 bg-emerald-500/5">
                        0% Markup (Pure Meta Cost)
                      </td>
                      <td className="py-4 px-6 text-rose-400 flex items-center gap-1.5">
                        <XCircle className="h-4 w-4" /> +18 to +25 baisa extra fee per msg
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-semibold text-white">Number Ban Risk</td>
                      <td className="py-4 px-6 font-bold text-emerald-400 bg-emerald-500/5 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 0% (Official Meta Cloud Host)
                      </td>
                      <td className="py-4 px-6 text-slate-400">High risk on unofficial proxy bots</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-semibold text-white">Payment Gateway Settlement</td>
                      <td className="py-4 px-6 font-bold text-emerald-400 bg-emerald-500/5">
                        AmwalPay OMR &amp; Apple Pay
                      </td>
                      <td className="py-4 px-6 text-slate-400">External redirect links only</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-semibold text-white">Regional Network Latency</td>
                      <td className="py-4 px-6 font-mono font-bold text-emerald-400 bg-emerald-500/5">
                        &lt; 25ms (Muscat Edge)
                      </td>
                      <td className="py-4 px-6 text-slate-400">3,000ms - 8,000ms via European hops</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-semibold text-white">Meta Green Tick Verification</td>
                      <td className="py-4 px-6 font-bold text-emerald-400 bg-emerald-500/5">
                        Fast-Track Full Dossier Support
                      </td>
                      <td className="py-4 px-6 text-slate-400">Unsupported or expensive add-on</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 4-STAGE META GREEN TICK ROADMAP                                           */}
          {/* ========================================================================= */}
          <section className="py-24 border-b border-white/10 bg-[#071828]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 mb-3">
                  <Award className="h-3.5 w-3.5" />
                  Guaranteed Compliance Roadmap
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Fast-Track Meta Green Tick Verification
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Our Muscat compliance specialists handle your end-to-end verification directly with Meta.
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-6">
                {roadmapSteps.map((step) => (
                  <div
                    key={step.num}
                    className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 hover:border-emerald-500/40 transition duration-300"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-3xl font-black font-mono text-emerald-400">{step.num}</span>
                      <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300">
                        {step.time}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-white mb-2">{step.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* KEY FEATURES BENTO GRID                                                   */}
          {/* ========================================================================= */}
          <section className="py-24 border-b border-white/10 bg-[#092138]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-center mb-16">
                Built for High-Growth Enterprises in Oman &amp; GCC
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {data.keyFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl border border-white/10 bg-slate-900/70 hover:border-emerald-500/30 transition shadow-lg"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-4">
                      <Check className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="font-bold text-base text-white mb-2">{feat.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* STRIPE-STYLE STATS COUNTER STRIP                                          */}
          {/* ========================================================================= */}
          <section className="py-20 border-b border-white/10 bg-[#071B2F]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
                {data.benefits.map((b, idx) => (
                  <div key={idx} className="pt-6 md:pt-0">
                    <div className="text-5xl sm:text-6xl font-black font-mono text-emerald-400 mb-2">
                      {b.stat}
                    </div>
                    <div className="text-base font-bold text-white mb-1">{b.label}</div>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">{b.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* FAQ ACCORDION                                                             */}
          {/* ========================================================================= */}
          <section className="py-24 border-b border-white/10 bg-[#092138]">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-center mb-12">
                Frequently Asked Questions
              </h2>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {data.faqs.map((faq, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`item-${idx}`}
                    className="rounded-2xl border border-white/10 px-6 bg-slate-900/60"
                  >
                    <AccordionTrigger className="text-left font-semibold text-base py-5 text-white hover:no-underline">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-300 leading-relaxed pb-5">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* STRIPE-STYLE BOTTOM CTA BANNER                                            */}
          {/* ========================================================================= */}
          <section className="py-24 relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 text-white text-center">
            <div className="max-w-4xl mx-auto px-4 relative z-10">
              <h2 className="text-3xl sm:text-5xl font-black mb-6 tracking-tight">
                Start Transforming Your WhatsApp Operations in Oman
              </h2>
              <p className="text-base sm:text-xl text-emerald-100 mb-10 max-w-2xl mx-auto leading-relaxed">
                Connect your business landline or mobile number directly to Meta Cloud API in less than 15 minutes.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="h-13 px-8 rounded-full bg-white text-slate-950 hover:bg-emerald-50 font-bold shadow-xl cursor-pointer text-base"
                  asChild
                >
                  <Link href="/signup">Start Free Trial Now</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-13 px-8 rounded-full border-white/40 text-white hover:bg-white/10 font-semibold cursor-pointer text-base"
                  asChild
                >
                  <Link href="/pricing">View Transparent Pricing</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  )
}
