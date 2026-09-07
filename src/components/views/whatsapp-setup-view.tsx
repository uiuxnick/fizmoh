"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { toast } from "sonner"
import { WhatsAppCatalogCard } from "@/components/views/whatsapp-catalog-card"
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Copy, ExternalLink,
  Bot, Megaphone, Clock, ShieldCheck, PlayCircle,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

type Health = {
  whatsapp: { configured: boolean; appSecret: boolean; phoneNumber?: string; verifiedName?: string; qualityRating?: string; wabaName?: string; error?: string }
  ai: { configured: boolean; provider?: string; model?: string }
  cron: { configured: boolean; lastRunAt?: string | null; pending?: Record<string, number> }
  templates: { total: number; approved: number; missing: string[] }
  webhookUrl: string
}

function StatusPill({ ok, label, warn }: { ok: boolean; label: string; warn?: boolean }) {
  const Icon = ok ? CheckCircle2 : warn ? AlertTriangle : XCircle
  const cls = ok
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : warn
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200"
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-stone-500">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => {
            navigator.clipboard.writeText(value)
            toast.success("Copied")
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function WhatsAppSetupView() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [settings, setSettings] = useState<Record<string, any>>({})

  const loadHealth = async () => {
    try {
      const res = await fetch("/api/whatsapp/health")
      if (res.ok) setHealth(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealth()
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => setSettings(d.settings || {}))
      .catch(() => {})
  }, [])

  const saveSetting = async (key: string, value: any) => {
    setSettings(s => ({ ...s, [key]: value }))
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    })
    toast.success("Saved")
  }

  const syncTemplates = async () => {
    setBusy("sync")
    try {
      const res = await fetch("/api/whatsapp/templates/sync", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Synced ${data.synced} templates (${data.created} new, ${data.updated} updated)`)
        loadHealth()
      } else {
        toast.error(data.error || "Sync failed")
      }
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-stone-500">Checking WhatsApp configuration…</div>
  }

  const wa = health?.whatsapp
  const inboundReady = !!wa?.configured && !!wa?.appSecret

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">WhatsApp Setup &amp; Guide</h1>
        <p className="text-sm text-stone-500 mt-1">
          Connection status, automation settings, and the steps to get conversational commerce live.
        </p>
      </div>

      {/* ─── Status ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Connection status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-stone-50">
              <div>
                <div className="text-sm font-medium text-stone-800">Outbound messaging</div>
                <div className="text-xs text-stone-500">
                  {wa?.verifiedName ? `${wa.verifiedName} · ${wa.phoneNumber}` : "Access token, WABA and phone number"}
                </div>
              </div>
              <StatusPill ok={!!wa?.configured} label={wa?.configured ? "Live" : "Not configured"} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-stone-50">
              <div>
                <div className="text-sm font-medium text-stone-800">Inbound webhook</div>
                <div className="text-xs text-stone-500">Requires WHATSAPP_APP_SECRET</div>
              </div>
              <StatusPill ok={inboundReady} warn={!wa?.appSecret} label={inboundReady ? "Verified" : "App secret missing"} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-stone-50">
              <div>
                <div className="text-sm font-medium text-stone-800">AI assistant</div>
                <div className="text-xs text-stone-500">
                  {health?.ai.configured && health.ai.model
                    ? `${health.ai.provider === "openai" ? "OpenAI" : "Anthropic"} · ${health.ai.model}`
                    : "Natural language + booking tools"}
                </div>
              </div>
              <StatusPill ok={!!health?.ai.configured} label={health?.ai.configured ? "Live" : "No API key"} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-stone-50">
              <div>
                <div className="text-sm font-medium text-stone-800">Scheduled automation</div>
                <div className="text-xs text-stone-500">Reminders, recovery, campaigns</div>
              </div>
              <StatusPill ok={!!health?.cron.configured} label={health?.cron.configured ? "Timer active" : "Not configured"} />
            </div>
          </div>

          {!wa?.appSecret && wa?.configured && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <strong>Inbound messages are being rejected.</strong> The webhook verifies Meta&apos;s signature
              and fails closed without an App Secret. Add it in <strong>Settings → WhatsApp → App Secret</strong>
              (get it from Meta App Dashboard → Settings → Basic → App Secret). No restart needed.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <CopyField label="Webhook callback URL" value={health?.webhookUrl || ""} />
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Templates</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-sm px-3 py-2 rounded-md border bg-white">
                  <span className="font-semibold">{health?.templates.approved ?? 0}</span>
                  <span className="text-stone-500"> approved of {health?.templates.total ?? 0}</span>
                </div>
                <Button variant="outline" size="sm" onClick={syncTemplates} disabled={busy === "sync"}>
                  <RefreshCw className={`h-4 w-4 mr-1.5 ${busy === "sync" ? "animate-spin" : ""}`} />
                  Sync from Meta
                </Button>
              </div>
            </div>
          </div>

          {health?.templates.missing?.length ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              <strong>Missing approved templates:</strong> {health.templates.missing.join(", ")}. Messages
              using these will not be delivered until Meta approves them.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="guide">
        <TabsList>
          <TabsTrigger value="guide">Setup guide</TabsTrigger>
          <TabsTrigger value="automation">Automation settings</TabsTrigger>
          <TabsTrigger value="rules">Messaging rules</TabsTrigger>
        </TabsList>

        {/* ─── Guide ─── */}
        <TabsContent value="guide" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible defaultValue="step1">
                <AccordionItem value="step1">
                  <AccordionTrigger className="text-sm font-semibold">
                    1. Connect the WhatsApp Business number
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-stone-600 space-y-2">
                    <p>Set these on the server environment file, then restart the app:</p>
                    <pre className="bg-stone-900 text-stone-100 p-3 rounded-lg text-xs overflow-x-auto">{`WHATSAPP_ACCESS_TOKEN=       # System User token (never expires)
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_PHONE_NUMBER=
WHATSAPP_APP_SECRET=         # required for inbound
WHATSAPP_WEBHOOK_VERIFY_TOKEN=`}</pre>
                    <p>
                      Use a <strong>System User</strong> token with the <code>whatsapp_business_messaging</code> and{" "}
                      <code>whatsapp_business_management</code> scopes — user tokens expire and will silently
                      break sending.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step2">
                  <AccordionTrigger className="text-sm font-semibold">2. Point Meta at the webhook</AccordionTrigger>
                  <AccordionContent className="text-sm text-stone-600 space-y-2">
                    <p>
                      In Meta App Dashboard → WhatsApp → Configuration, set the callback URL and verify token
                      shown above, then subscribe the WABA to the <strong>messages</strong> field.
                    </p>
                    <p className="text-xs text-stone-500">
                      Without the <code>messages</code> subscription, customers can message the number but
                      nothing reaches the inbox.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step3">
                  <AccordionTrigger className="text-sm font-semibold">3. Get templates approved</AccordionTrigger>
                  <AccordionContent className="text-sm text-stone-600 space-y-2">
                    <p>
                      Outside the 24-hour window Meta only delivers approved templates. Create them under{" "}
                      <strong>Templates</strong>, submit to Meta, then use <strong>Sync from Meta</strong> above
                      to pull approval status back in — Meta does not notify us when a template is approved.
                    </p>
                    <p>These are used by the platform automatically:</p>
                    <ul className="list-disc pl-5 text-xs space-y-1">
                      <li><code>order_confirmation</code> — sent when a booking is confirmed</li>
                      <li><code>payment_received</code> — payment acknowledged</li>
                      <li><code>payment_rejected</code> — verification failed</li>
                      <li><code>tour_reminder</code> — 24h before departure</li>
                      <li><code>post_tour_review</code> — review request after the tour</li>
                      <li><code>abandoned_cart</code> — incomplete booking recovery</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step4">
                  <AccordionTrigger className="text-sm font-semibold">4. Enable the AI assistant</AccordionTrigger>
                  <AccordionContent className="text-sm text-stone-600 space-y-2">
                    <p>
                      Set <code>ANTHROPIC_API_KEY</code> on the server. The assistant answers in natural
                      language and can check live availability, look up an order, and create a booking —
                      all against the same database the website uses.
                    </p>
                    <p className="text-xs text-stone-500">
                      Without a key the bot replies with a fallback message and hands off to an agent.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step5">
                  <AccordionTrigger className="text-sm font-semibold">5. Turn on scheduled automation</AccordionTrigger>
                  <AccordionContent className="text-sm text-stone-600 space-y-2">
                    <p>
                      Reminders, abandoned-cart recovery and scheduled campaigns run from a systemd timer that
                      calls <code>/api/cron</code> every 5 minutes. Set <code>CRON_SECRET</code> and enable the
                      timer on the server:
                    </p>
                    <pre className="bg-stone-900 text-stone-100 p-3 rounded-lg text-xs overflow-x-auto">{`systemctl enable --now wptour-cron.timer
systemctl list-timers wptour-cron.timer`}</pre>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step6">
                  <AccordionTrigger className="text-sm font-semibold">6. Build your bot flows</AccordionTrigger>
                  <AccordionContent className="text-sm text-stone-600 space-y-2">
                    <p>
                      Under <strong>Bot &amp; Automation</strong>, build keyword and intent flows. A matching
                      flow answers before the AI does — use it for FAQs and fixed answers where you want an
                      exact, predictable reply.
                    </p>
                    <p className="text-xs text-stone-500">
                      Add a <strong>Handoff</strong> node at the end of any flow that should escalate to a
                      human; it pauses the bot and notifies the assigned agent.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Automation settings ─── */}
        <TabsContent value="automation" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-amber-600" /> Assistant behaviour
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "wa_bot_enabled", label: "AI assistant auto-replies", hint: "Turn off to route every conversation straight to an agent" },
                { key: "wa_flows_enabled", label: "Run bot flows before the AI", hint: "Keyword and intent flows answer first when they match" },
                { key: "wa_auto_assign", label: "Auto-assign new conversations", hint: "Load-balanced across active chat agents" },
              ].map(row => (
                <div key={row.key} className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-stone-800">{row.label}</div>
                    <div className="text-xs text-stone-500">{row.hint}</div>
                  </div>
                  <Switch
                    checked={settings[row.key] !== false}
                    onCheckedChange={v => saveSetting(row.key, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" /> Scheduled jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "wa_reminders_enabled", label: "Pre-tour reminders", hint: "24 hours before departure" },
                { key: "wa_recovery_enabled", label: "Abandoned booking recovery", hint: "1 hour after an unpaid booking is created" },
                { key: "wa_review_enabled", label: "Post-tour review requests", hint: "24 hours after the tour ends" },
              ].map(row => (
                <div key={row.key} className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-stone-800">{row.label}</div>
                    <div className="text-xs text-stone-500">{row.hint}</div>
                  </div>
                  <Switch
                    checked={settings[row.key] !== false}
                    onCheckedChange={v => saveSetting(row.key, v)}
                  />
                </div>
              ))}

              {health?.cron.pending && (
                <div className="pt-2 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  {Object.entries(health.cron.pending).map(([k, v]) => (
                    <div key={k} className="p-2 rounded-lg bg-stone-50">
                      <div className="text-lg font-bold text-stone-800">{v}</div>
                      <div className="text-[10px] uppercase tracking-wide text-stone-500">{k}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Rules ─── */}
        <TabsContent value="rules" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-5 text-sm text-stone-600">
              <div>
                <div className="font-semibold text-stone-800 flex items-center gap-2 mb-1">
                  <WhatsAppIcon className="h-4 w-4" /> The 24-hour window
                </div>
                <p>
                  You can send free-form messages for 24 hours after a customer&apos;s last message. Outside that
                  window Meta only delivers approved templates — a free-form send is dropped, and the customer
                  never sees it. The platform enforces this automatically and reports the reason instead of
                  failing silently.
                </p>
              </div>

              <div>
                <div className="font-semibold text-stone-800 flex items-center gap-2 mb-1">
                  <Megaphone className="h-4 w-4 text-amber-600" /> Broadcasts and opt-out
                </div>
                <p>
                  Campaigns only go to customers who are opted in, and consent is re-checked at send time.
                  Customers who reply <strong>STOP</strong> (or the Arabic equivalent) are unsubscribed
                  immediately and confirmed; <strong>START</strong> resubscribes them. Honouring this is a Meta
                  policy requirement — ignoring it puts the number&apos;s quality rating and the WhatsApp
                  Business Account at risk.
                </p>
              </div>

              <div>
                <div className="font-semibold text-stone-800 flex items-center gap-2 mb-1">
                  <PlayCircle className="h-4 w-4 text-teal-600" /> Order of response
                </div>
                <p>
                  Every inbound message is checked in this order: consent keywords → bot flow match → AI
                  assistant → human handoff. Consent is handled even when an agent has taken over the
                  conversation.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Badge variant="outline" className="font-mono text-xs">{wa?.qualityRating || "—"}</Badge>
                <span className="text-xs text-stone-500">
                  Current number quality rating from Meta
                </span>
                <a
                  href="https://business.facebook.com/wa/manage/phone-numbers/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1 ml-auto"
                >
                  Manage in Meta <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WhatsAppCatalogCard />
    </div>
  )
}
