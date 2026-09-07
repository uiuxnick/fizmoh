"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Workflow, Plus, Zap, Clock, Bot, GitBranch, Pencil, Trash2, Activity } from "lucide-react"
import { BotMessagesEditor } from "@/components/views/bot-messages-editor"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { FlowEditor, type BotFlowRecord } from "@/components/views/flow-editor"
import { ChannelSettingsTab } from "@/components/views/social-channels-view"
import { FLOW_CHANNELS, FLOW_CHANNEL_LABELS, flowChannels, type FlowChannel } from "@/lib/flow-channels"
import { normalizeFlowGraph } from "@/lib/flow-normalizer"
import { AIDraftButton } from "@/components/views/ai-draft"

interface BotFlow {
  id: string
  name: string
  description: string | null
  trigger: string
  triggerConfig: string | null
  nodes: string | null
  edges: string | null
  isActive: boolean
  priority: number
  createdAt: string
}

const TRIGGER_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  NEW_CONVERSATION: { icon: WhatsAppIcon, color: "bg-emerald-100 text-emerald-700", label: "New Conversation" },
  KEYWORD: { icon: Zap, color: "bg-amber-100 text-amber-700", label: "Keyword Trigger" },
  INTENT: { icon: GitBranch, color: "bg-teal-100 text-teal-700", label: "Intent Detected" },
  SCHEDULE: { icon: Clock, color: "bg-purple-100 text-purple-700", label: "Scheduled" },
}

function safeJson<T>(value: unknown, fallback: T): T {
  if (!value) return fallback
  if (typeof value !== "string") return value as T
  try { return JSON.parse(value) as T } catch { return fallback }
}

export default function BotBuilderView() {
  const [channel, setChannel] = useState<FlowChannel>("WHATSAPP")
  const [flows, setFlows] = useState<BotFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<BotFlowRecord | null>(null)
  const [creating, setCreating] = useState(false)
  const [runs, setRuns] = useState<any[]>([])
  const [aiOn, setAiOn] = useState(true)
  const [aiName, setAiName] = useState("")
  const [aiSaving, setAiSaving] = useState(false)

  // The banner used to claim "Najwa … Active" whatever the workspace had
  // configured, on a page with no way to change either.
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        const v = String(d?.settings?.ai_assistant_enabled ?? "").trim().toLowerCase()
        setAiOn(!(v === "false" || v === "off" || v === "0"))
        setAiName(String(d?.settings?.assistant_name ?? "").trim())
      })
      .catch(() => {})
  }, [])

  const toggleAi = async (next: boolean) => {
    setAiSaving(true)
    const previous = aiOn
    setAiOn(next)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_assistant_enabled: next ? "true" : "false" }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not save")
      toast.success(next ? "AI assistant switched on" : "AI assistant switched off")
    } catch (e) {
      setAiOn(previous)
      toast.error(e instanceof Error ? e.message : "Could not save")
    } finally {
      setAiSaving(false)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/botflows")
      const data = await res.json()
      setFlows(data.flows || [])
      const runResponse = await fetch("/api/botflows/runs")
      if (runResponse.ok) setRuns((await runResponse.json()).runs || [])
    } catch { toast.error("Failed to load bot flows") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // The toggle used to change local state only and report success, so a flow
  // shown as live had never been saved as live.
  const toggleFlow = async (id: string, active: boolean) => {
    const previous = flows
    setFlows(prev => prev.map(f => (f.id === id ? { ...f, isActive: active } : f)))
    const res = await fetch(`/api/botflows/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: active }),
    }).catch(() => null)
    if (!res || !res.ok) {
      setFlows(previous)
      toast.error("Could not change the flow")
      return
    }
    toast.success(active ? "Flow is live" : "Flow paused")
  }

  const removeFlow = async (flow: BotFlow) => {
    if (!confirm(`Delete the flow “${flow.name}”?`)) return
    const res = await fetch(`/api/botflows/${flow.id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Could not delete the flow"); return }
    toast.success("Flow deleted")
    load()
  }

  const visibleFlows = flows.filter(flow => flowChannels(flow.triggerConfig).includes(channel))
  const visibleRuns = runs.filter(run => run.channel === channel)

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <Workflow className="h-5 w-5 text-purple-600" />
            </div>
            Bot &amp; Automation Builder
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">Visual conversation flows &amp; AI automation rules</p>
        </div>
        <div className="flex gap-2">
          {channel === "WHATSAPP" ? <AIDraftButton kind="flow" onCreated={load} /> : <Button variant="outline" onClick={() => { setEditing(null); setCreating(true) }}>Draft with AI</Button>}
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditing(null); setCreating(true) }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Flow
          </Button>
        </div>
      </div>

      <div role="tablist" aria-label="Automation channel" className="flex flex-wrap gap-2 border-b pb-3">
        {FLOW_CHANNELS.map(value => <Button key={value} role="tab" aria-selected={channel === value} variant={channel === value ? "default" : "outline"} onClick={() => setChannel(value)}>{FLOW_CHANNEL_LABELS[value]}</Button>)}
      </div>
      <p className="text-sm text-stone-600">{FLOW_CHANNEL_LABELS[channel]} bots — create, import, simulate and publish visual flows. Flows assigned to multiple channels appear in each selected channel.</p>
      {channel !== "WHATSAPP" && <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">{FLOW_CHANNEL_LABELS[channel]} bot settings &amp; reply test</summary><div className="mt-4"><ChannelSettingsTab key={channel} channel={channel} /></div><p className="text-sm mt-4"><a className="underline" href="/settings">Account connections and AI Tone &amp; Knowledge are in Settings → Facebook &amp; Instagram.</a></p></details>}

      <Card className="border-stone-200">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-teal-600" />Recent flow runs <span className="text-xs font-normal text-stone-500">{visibleRuns.length} latest</span></CardTitle></CardHeader>
        <CardContent className="pt-0">{visibleRuns.length === 0 ? <p className="text-sm text-stone-500">No flow runs recorded yet.</p> : <div className="space-y-2">{visibleRuns.slice(0, 8).map(run => <div key={run.id} className="flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2"><div><p className="text-sm font-medium text-stone-800">{run.flow?.name || "Automation flow"}</p><p className="text-[11px] text-stone-500">{new Date(run.startedAt).toLocaleString()}</p></div><Badge className={run.status === "FAILED" ? "bg-rose-100 text-rose-700" : run.status === "DONE" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}>{run.status}</Badge></div>)}</div>}</CardContent>
      </Card>

      {/* AI Assistant banner */}
      {channel === "WHATSAPP" && <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  {aiName ? `${aiName} AI Assistant` : "AI Assistant"}
                  <Badge className={aiOn ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-600"}>
                    {aiOn ? "Active" : "Off"}
                  </Badge>
                </h3>
                <Switch checked={aiOn} disabled={aiSaving} onCheckedChange={toggleAi} />
              </div>
              <p className="text-sm text-stone-600 mt-1">
                {aiOn
                  ? "The AI assistant handles natural-language conversations, checks live availability, creates bookings, and hands off to humans when needed. It works 24/7 alongside your bot flows."
                  : "The AI is off. Your menu, buttons and booking flow still work exactly as before — anything they do not answer goes to a person instead of the AI."}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="bg-white">🧠 LLM-powered</Badge>
                <Badge variant="outline" className="bg-white">🎤 Voice notes (ASR)</Badge>
                <Badge variant="outline" className="bg-white">🌍 EN + AR</Badge>
                <Badge variant="outline" className="bg-white">🔄 Human handoff</Badge>
                <Badge variant="outline" className="bg-white">⚡ Function calling</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>}

      {/* What the built-in bot says, editable by the workspace */}
      {channel === "WHATSAPP" && <BotMessagesEditor />}

      {/* Flows */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-stone-900">Automation Flows</h3>
          <span className="text-xs text-stone-500">{visibleFlows.filter(f => f.isActive).length} active · {visibleFlows.length} total</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
        ) : visibleFlows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Workflow className="h-10 w-10 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500">No automation flows yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleFlows.map(f => {
              const cfg = TRIGGER_CONFIG[f.trigger] || TRIGGER_CONFIG.KEYWORD
              const keywords = safeJson<{ keywords?: string[] }>(f.triggerConfig, {}).keywords || []
              const { nodes, edges } = normalizeFlowGraph(f.nodes, f.edges)
              return (
                <Card key={f.id} className={`hover:shadow-md transition-shadow ${!f.isActive ? "opacity-60" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${cfg.color}`}>
                          <cfg.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-stone-900">{f.name}</h3><div className="flex gap-1 mt-1">{flowChannels(f.triggerConfig).map(c => <Badge key={c} variant="outline">{FLOW_CHANNEL_LABELS[c]}</Badge>)}</div>
                          <p className="text-xs text-stone-500">{f.description || "No description"}</p>
                        </div>
                      </div>
                      <Switch checked={f.isActive} onCheckedChange={(v) => toggleFlow(f.id, v)} />
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="bg-stone-50 text-stone-600">{cfg.label}</Badge>
                      <Badge variant="outline" className="bg-stone-50 text-stone-600">Priority: {f.priority}</Badge>
                      {keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {keywords.slice(0, 3).map((k: string, i: number) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-mono">{k}</span>
                          ))}
                          {keywords.length > 3 && <span className="text-[10px] text-stone-400">+{keywords.length - 3}</span>}
                        </div>
                      )}
                    </div>

                    {/* Flow preview */}
                    {nodes.length > 0 && (
                      <div className="p-3 rounded-lg bg-stone-50 border border-stone-100">
                        <div className="text-[10px] font-semibold uppercase text-stone-400 mb-2">Flow Preview</div>
                        <div className="space-y-1.5">
                          {nodes.slice(0, 4).map((n: any, i: number) => (
                            <div key={n.id || i} className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${
                                n.type === "MESSAGE" ? "bg-emerald-500" :
                                n.type === "PRODUCT" ? "bg-purple-500" :
                                n.type === "CATALOG" ? "bg-indigo-500" :
                                n.type === "CONDITION" ? "bg-amber-500" :
                                n.type === "HANDOFF" ? "bg-rose-500" : "bg-teal-500"
                              }`} />
                              <span className="text-xs text-stone-600 truncate flex-1">
                                {n.type === "MESSAGE" ? (n.data?.text?.slice(0, 50) || "Empty message")
                                  : n.type === "BUTTONS" ? `📲 ${n.data?.text?.slice(0, 40) || "Quick buttons"}`
                                  : n.type === "LIST" ? `📋 ${n.data?.text?.slice(0, 40) || "List picker"}`
                                  : n.type === "AI" ? `🤖 AI Reply — ${n.data?.instruction?.slice(0, 40) || "Natural language"}`
                                  : n.type === "QUESTION" ? `❓ Ask: ${n.data?.text?.slice(0, 40) || "(no question)"}`
                                  : n.type === "PRODUCT" ? `🛍️ Product Card (${n.data?.productId || "Featured"})`
                                  : n.type === "CATALOG" ? `📦 Catalog (${n.data?.productCount || 5} items)`
                                  : n.type === "CONDITION" ? `⚡ If ${n.data?.field} ${n.data?.op} "${n.data?.value}"`
                                  : n.type === "HOURS" ? `🕐 Business hours ${n.data?.from}–${n.data?.to}`
                                  : n.type === "SPLIT" ? `🔀 A/B split ${n.data?.percent}%`
                                  : n.type === "DELAY" ? `⏱️ Wait ${n.data?.seconds}s`
                                  : n.type === "HANDOFF" ? "👤 Hand to agent"
                                  : n.type === "APPOINTMENT" ? `📅 ${n.data?.appointmentText?.slice(0, 40) || "Book appointment"}`
                                  : n.type === "HOSPITAL" ? `🏥 Kauvery Hospital (${n.data?.hospMode || "Day Care & Apts"})`
                                  : n.type === "TOUR" ? `🚙 Tours & Safaris (${n.data?.tourCount || 4} tours)`
                                  : n.type === "PAYMENT" ? `💳 AmwalPay (${n.data?.amount || 10} ${n.data?.currency || "OMR"})`
                                  : n.type === "BANK_TRANSFER" ? `🏦 Bank Transfer (${n.data?.bankName || "Bank"})`
                                  : n.type === "CTA_URL" ? `🔗 CTA: ${n.data?.buttonText || "Website"}`
                                  : n.type === "LOCATION" ? `📍 Location: ${n.data?.name || "Muscat"}`
                                  : n.type === "TOUR_DETAILS" ? "🌄 Featured Tour Card"
                                  : n.type === "TOUR_AVAIL" ? "📅 Check Tour Dates"
                                  : n.type === "HOSP_CHEMO" ? "💊 Chemotherapy Day Care (30 Beds)"
                                  : n.type === "HOSP_DOCTOR" ? "🩺 Oncologist Appointment"
                                  : n.type === "HOSP_BED_MAP" ? "🛏️ Live Bed Vacancy Map"
                                  : n.type === "VISA" ? "🛂 Visa Assistance"
                                  : n.type === "RESTAURANT" ? "🍽️ Table Reservation & Menu"
                                  : n.type === "APT_RESCHEDULE" ? "🔄 Reschedule / Cancel Apt"
                                  : n.type === "TAG" ? `🏷️ Tag: ${n.data?.value}`
                                  : n.type === "HTTP" ? `🌐 API: ${n.data?.method} ${n.data?.url?.slice(0, 30)}`
                                  : n.type === "SAVE" ? "💾 Save lead / enquiry"
                                  : n.type === "END" ? "🔴 End flow"
                                  : n.type === "TRIGGER" ? "⚡ Trigger"
                                  : n.type}
                              </span>
                              {n.data?.buttons?.length > 0 && <Badge variant="outline" className="text-[9px] bg-white">{n.data.buttons.length} buttons</Badge>}
                            </div>
                          ))}
                          {nodes.length > 4 && <div className="text-[10px] text-stone-400">+{nodes.length - 4} more steps</div>}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] text-stone-400">
                        <GitBranch className="h-3 w-3" />{nodes.length} nodes · {edges.length} connections
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditing(f as unknown as BotFlowRecord); setCreating(false) }}>
                          <Pencil className="h-3 w-3 mr-1" />Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-600 hover:text-rose-700" onClick={() => removeFlow(f)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Capabilities */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" />Automation Capabilities</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: WhatsAppIcon, title: "Keyword Triggers", desc: "Bot responds to keywords like 'availability', 'price', 'cancel'" },
              { icon: GitBranch, title: "Intent Detection", desc: "AI detects customer intent and routes to appropriate flow" },
              { icon: Clock, title: "Business Hours", desc: "Auto-reply outside working hours, AI handles 24/7" },
              { icon: Bot, title: "AI Handoff", desc: "Bot detects when it can't help and passes to human agent" },
              { icon: Zap, title: "Quick Replies", desc: "Predefined answers for FAQs to speed up agents" },
              { icon: Workflow, title: "Flow Builder", desc: "Build a flow as an ordered list of messages, conditions and handoffs" },
            ].map((c, i) => (
              <div key={i} className="p-3 rounded-lg border bg-stone-50">
                <c.icon className="h-5 w-5 text-emerald-600 mb-2" />
                <div className="font-medium text-sm text-stone-900">{c.title}</div>
                <div className="text-xs text-stone-500 mt-0.5">{c.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(editing || creating) && (
        <FlowEditor
          flow={editing}
          defaultChannel={channel}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSaved={load}
        />
      )}
    </div>
  )
}
