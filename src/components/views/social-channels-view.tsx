"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Facebook, Instagram, Link2, Unlink, Loader2, Check, AlertTriangle, Plus, Trash2,
  Star, Pause, Play, MessageCircle, ArrowRight, RefreshCw,
} from "lucide-react"

/**
 * Facebook & Instagram Automation settings — embedded as a tab inside the
 * main Settings screen (Settings → Facebook & Instagram), not a standalone
 * sidebar destination. Messages themselves live in the real Inbox
 * (inbox-view.tsx), alongside WhatsApp — this is configuration only.
 */
export default function SocialChannelsView() {
  const [tab, setTab] = useState("overview")

  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("social")
    if (!flag) return
    if (flag === "connected") toast.success("Account connected")
    else toast.error(`Could not connect: ${flag.replace(/_/g, " ")}`)
    window.history.replaceState({}, "", window.location.pathname)
  }, [])

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Connect Accounts</TabsTrigger>
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="automation">Automation Rules</TabsTrigger>
          <TabsTrigger value="knowledge">AI Tone &amp; Knowledge</TabsTrigger>
          <TabsTrigger value="handoff">Human Handoff</TabsTrigger>
          <TabsTrigger value="logs">Logs &amp; Errors</TabsTrigger>
          <TabsTrigger value="usage">Usage &amp; Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="facebook" className="mt-4"><ChannelSettingsTab channel="FACEBOOK" /></TabsContent>
        <TabsContent value="instagram" className="mt-4"><ChannelSettingsTab channel="INSTAGRAM" /></TabsContent>
        <TabsContent value="automation" className="mt-4"><AutomationRulesTab /></TabsContent>
        <TabsContent value="knowledge" className="mt-4"><KnowledgeTab /></TabsContent>
        <TabsContent value="handoff" className="mt-4"><HandoffTab /></TabsContent>
        <TabsContent value="logs" className="mt-4"><LogsTab /></TabsContent>
        <TabsContent value="usage" className="mt-4">
          <div className="space-y-4">
            <UsageTab />
            <BillingTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Overview / Connect ───

interface SocialAccountRow {
  id: string; channel: "FACEBOOK" | "INSTAGRAM"; name: string | null; username: string | null
  status: string; lastError: string | null; isActive: boolean; webhookSubscribed: boolean; connectedAt: string
}

function OverviewTab() {
  const [accounts, setAccounts] = useState<SocialAccountRow[] | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)

  const load = () => fetch("/api/social/accounts").then(r => r.json()).then(d => setAccounts(d.accounts || []))
  useEffect(() => { load() }, [])

  async function connect(channel: "facebook" | "instagram") {
    setConnecting(channel)
    try {
      const res = await fetch(`/api/social/oauth/${channel}/connect`).then(r => r.json())
      if (res.url) window.location.href = res.url
      else toast.error(res.error || "Could not start connect")
    } finally {
      setConnecting(null)
    }
  }

  async function setActive(id: string) {
    const res = await fetch("/api/social/accounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    if (!res.ok) { toast.error("Could not set active account"); return }
    toast.success("Active account updated"); load()
  }

  async function disconnect(id: string) {
    if (!confirm("Disconnect this account? Automation for it will stop immediately.")) return
    const res = await fetch(`/api/social/accounts?id=${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Could not disconnect"); return }
    toast.success("Disconnected"); load()
  }

  const forChannel = (channel: string) => accounts?.filter(a => a.channel === channel) || []

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {(["FACEBOOK", "INSTAGRAM"] as const).map(channel => (
        <Card key={channel}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {channel === "FACEBOOK" ? <Facebook className="h-4 w-4 text-blue-600" /> : <Instagram className="h-4 w-4 text-pink-600" />}
              {channel === "FACEBOOK" ? "Facebook Pages" : "Instagram Professional Accounts"}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => connect(channel.toLowerCase() as "facebook" | "instagram")} disabled={connecting === channel.toLowerCase()}>
              {connecting === channel.toLowerCase() ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Link2 className="h-3.5 w-3.5 mr-1.5" />}Connect
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {!accounts ? <Skeleton className="h-16 rounded-lg" /> : forChannel(channel).length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">Nothing connected yet.</p>
            ) : forChannel(channel).map(a => (
              <div key={a.id} className="rounded-lg border border-stone-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                      {a.name || a.username || a.id}
                      {a.isActive && <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700">Active</Badge>}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {a.status === "CONNECTED"
                        ? <span className="text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" />Connected{a.webhookSubscribed ? "" : " · webhook not confirmed"}</span>
                        : <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{a.lastError || a.status}</span>}
                    </p>
                    {a.status === "CONNECTED" && !a.webhookSubscribed && a.lastError && (
                      <p className="text-[11px] text-amber-600 mt-0.5 max-w-xs">{a.lastError}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {!a.isActive && <Button size="sm" variant="outline" onClick={() => setActive(a.id)}>Make active</Button>}
                    <Button size="sm" variant="ghost" onClick={() => disconnect(a.id)}><Unlink className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <PermissionsCheck accountId={a.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card className="md:col-span-2">
        <CardContent className="p-4 text-xs text-stone-500 space-y-1">
          <p><strong className="text-stone-700">Setup:</strong> the platform's Meta app needs its App Review permissions approved before real customer traffic can flow — connecting works today for test accounts either way.</p>
          <p>Facebook needs: pages_show_list, pages_manage_metadata, pages_messaging, pages_read_engagement, business_management. Instagram needs: instagram_business_basic, instagram_business_manage_messages, instagram_business_manage_comments.</p>
        </CardContent>
      </Card>
    </div>
  )
}

interface PermissionResult { required: string[]; granted: string[]; missing: string[]; checkable: boolean; note?: string; error?: string }

/** A real, live check of what this token actually carries — never the same claim as "Meta App Review approved". */
function PermissionsCheck({ accountId }: { accountId: string }) {
  const [result, setResult] = useState<PermissionResult | null>(null)
  const [checking, setChecking] = useState(false)

  async function check() {
    setChecking(true)
    try {
      const res = await fetch(`/api/social/permissions-check?accountId=${accountId}`)
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Could not check permissions"); return }
      setResult(data)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div>
      <Button size="sm" variant="outline" onClick={check} disabled={checking} className="h-7 text-xs">
        {checking ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Check permissions
      </Button>
      {result && (
        <div className="mt-2 space-y-1 rounded-lg border border-stone-200 p-2.5">
          {result.required.map(p => {
            const granted = result.granted.includes(p)
            return (
              <div key={p} className="flex items-center gap-1.5 text-[11px]">
                {granted ? <Check className="h-3 w-3 text-emerald-600" /> : <AlertTriangle className="h-3 w-3 text-amber-600" />}
                <span className={granted ? "text-stone-700" : "text-amber-700"}>{p}</span>
              </div>
            )
          })}
          {result.missing.length > 0 && result.checkable && (
            <p className="text-[11px] text-amber-700 pt-1">Missing above are most likely not yet approved by Meta's App Review (Advanced Access) for this app.</p>
          )}
          {!result.checkable && <p className="text-[11px] text-stone-400 pt-1">{result.note}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Channel settings (Facebook / Instagram tabs) ───

interface ChannelSettings {
  enabled: boolean; dmAutoReplyEnabled: boolean; commentAutoReplyEnabled: boolean
  mode: string; fullyAutomaticConfirmedByOwner: boolean
  businessHoursStart: string; businessHoursEnd: string; timezone: string; replyDelaySeconds: number
  dailyMessageLimit: number; hourlyMessageLimit: number
  welcomeMessage: string | null; awayMessage: string | null; fallbackReply: string | null; requireApproval: boolean
}

export function ChannelSettingsTab({ channel }: { channel: "FACEBOOK" | "INSTAGRAM" }) {
  const [testMessage, setTestMessage] = useState("")
  const [testReply, setTestReply] = useState("")
  const [testing, setTesting] = useState(false)
  async function testBot() {
    setTesting(true)
    try {
      const response = await fetch("/api/social/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, message: testMessage }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Preview failed")
      setTestReply(`${data.handoff ? "Needs a person: " : ""}${data.reply}`)
    } catch (error) { toast.error(error instanceof Error ? error.message : "Preview failed") }
    finally { setTesting(false) }
  }
  const [settings, setSettings] = useState<ChannelSettings | null>(null)
  const [saving, setSaving] = useState(false)

  const [loadError, setLoadError] = useState("")
  const load = async () => {
    setLoadError("")
    try {
      const response = await fetch(`/api/social/settings?channel=${channel}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not load channel settings")
      setSettings(data.settings)
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Could not load channel settings") }
  }
  useEffect(() => { load() }, [channel])

  if (loadError) return <p role="alert" className="text-sm text-rose-700">{loadError}</p>
  if (!settings) return <Skeleton className="h-96 rounded-xl" />

  function patch(p: Partial<ChannelSettings>) { setSettings(s => s ? { ...s, ...p } : s) }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/social/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, ...settings }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not save")
      setSettings(data.settings)
      toast.success("Settings saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card><CardHeader><CardTitle className="text-base">Test your knowledge bot</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-stone-500">Uses saved AI Tone &amp; Knowledge and your workspace Knowledge Base. This preview sends nothing to customers. Build guided conversations in Bot &amp; Automation and select this channel.</p><Input aria-label="Test customer message" value={testMessage} onChange={e => setTestMessage(e.target.value)} placeholder="Ask a question as a customer" maxLength={1000} /><Button disabled={testing || !testMessage.trim()} onClick={testBot}>{testing ? "Testing…" : "Test bot"}</Button>{testReply && <p className="text-sm whitespace-pre-wrap" role="status">{testReply}</p>}</CardContent></Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Automation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.enabled} onChange={e => patch({ enabled: e.target.checked })} className="h-4 w-4" />
            Enable automation for {channel === "FACEBOOK" ? "Facebook Messenger" : "Instagram"}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.dmAutoReplyEnabled} onChange={e => patch({ dmAutoReplyEnabled: e.target.checked })} className="h-4 w-4" />
            Auto-reply to direct messages
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.commentAutoReplyEnabled} onChange={e => patch({ commentAutoReplyEnabled: e.target.checked })} className="h-4 w-4" />
            Auto-reply to comments (separate from DMs)
          </label>

          <select value={settings.mode} onChange={e => patch({ mode: e.target.value })} className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 bg-white">
            <option value="MANUAL_APPROVAL">Manual approval — every reply needs a click</option>
            <option value="DRAFT_ONLY">Draft only — never sends on its own</option>
            <option value="AUTOMATIC">Automatic publishing — eligible replies send without a click</option>
          </select>
          {settings.mode === "AUTOMATIC" && (
            <label className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <input type="checkbox" checked={settings.fullyAutomaticConfirmedByOwner} onChange={e => patch({ fullyAutomaticConfirmedByOwner: e.target.checked })} className="h-4 w-4 mt-0.5" />
              <span><AlertTriangle className="h-3.5 w-3.5 inline mr-1" />I understand this sends AI replies to real customers with no review, and I want to enable it. Requires owner or super admin.</span>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.requireApproval} onChange={e => patch({ requireApproval: e.target.checked })} className="h-4 w-4" />
            Require approval before sending, even in Automatic mode
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Hours, delay &amp; limits</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Input value={settings.businessHoursStart} onChange={e => patch({ businessHoursStart: e.target.value })} placeholder="09:00" />
            <Input value={settings.businessHoursEnd} onChange={e => patch({ businessHoursEnd: e.target.value })} placeholder="18:00" />
            <Input value={settings.timezone} onChange={e => patch({ timezone: e.target.value })} placeholder="Asia/Muscat" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><p className="text-xs text-stone-500 mb-1">Reply delay (sec)</p><Input type="number" min={0} value={settings.replyDelaySeconds} onChange={e => patch({ replyDelaySeconds: Number(e.target.value) })} /></div>
            <div><p className="text-xs text-stone-500 mb-1">Daily limit</p><Input type="number" min={1} value={settings.dailyMessageLimit} onChange={e => patch({ dailyMessageLimit: Number(e.target.value) })} /></div>
            <div><p className="text-xs text-stone-500 mb-1">Hourly limit</p><Input type="number" min={1} value={settings.hourlyMessageLimit} onChange={e => patch({ hourlyMessageLimit: Number(e.target.value) })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Messages</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><p className="text-xs text-stone-500 mb-1">Welcome message (first message in a new conversation)</p><textarea value={settings.welcomeMessage || ""} onChange={e => patch({ welcomeMessage: e.target.value })} className="w-full text-sm border border-stone-200 rounded-lg p-2" rows={2} /></div>
          <div><p className="text-xs text-stone-500 mb-1">Away message (outside business hours)</p><textarea value={settings.awayMessage || ""} onChange={e => patch({ awayMessage: e.target.value })} className="w-full text-sm border border-stone-200 rounded-lg p-2" rows={2} /></div>
          <div><p className="text-xs text-stone-500 mb-1">Fallback reply (AI has no confident answer)</p><textarea value={settings.fallbackReply || ""} onChange={e => patch({ fallbackReply: e.target.value })} className="w-full text-sm border border-stone-200 rounded-lg p-2" rows={2} /></div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}Save {channel === "FACEBOOK" ? "Facebook" : "Instagram"} settings
      </Button>
    </div>
  )
}

// ─── Unified Inbox ───

interface ConversationRow {
  id: string; channel: string; status: string; customerName: string; lastMessageText: string | null
  lastMessageAt: string | null; unreadCount: number; automationPaused: boolean; assignedStaffName: string | null
  tags: string[]; leadStatus: string | null
}

// ─── Automation Rules (keyword replies) ───

export interface KeywordRule { id: string; channel: string; keywords: string; reply: string; isActive: boolean }

export function AutomationRulesTab({ defaultRuleType = "COMMENT_TO_DM", defaultChannel = "INSTAGRAM" }: { defaultRuleType?: "COMMENT_TO_DM" | "KEYWORD_REPLY"; defaultChannel?: "FACEBOOK" | "INSTAGRAM" } = {}) {
  const [channel, setChannel] = useState(defaultChannel)
  const [rules, setRules] = useState<KeywordRule[] | null>(null)
  const [ruleType, setRuleType] = useState<"COMMENT_TO_DM" | "KEYWORD_REPLY">(defaultRuleType)
  const [keywords, setKeywords] = useState("")
  const [reply, setReply] = useState("")
  const [privateReply, setPrivateReply] = useState("")
  const [creating, setCreating] = useState(false)

  function load() { fetch(`/api/social/keywords?channel=${channel}`).then(r => r.json()).then(d => setRules(d.rules || [])) }
  useEffect(() => { load() }, [channel])

  async function create() {
    if (!keywords.trim()) { toast.error("Enter at least one trigger keyword"); return }
    let payloadReply = ""
    if (ruleType === "COMMENT_TO_DM") {
      if (!privateReply.trim() && !reply.trim()) { toast.error("Provide a private DM or public comment reply"); return }
      payloadReply = JSON.stringify({ mode: "comment_to_dm", public: reply.trim(), private: privateReply.trim() })
    } else {
      if (!reply.trim()) { toast.error("Provide a reply text"); return }
      payloadReply = reply.trim()
    }

    setCreating(true)
    try {
      const res = await fetch("/api/social/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, keywords: keywords.trim(), reply: payloadReply }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Could not create rule")
      toast.success(ruleType === "COMMENT_TO_DM" ? "Comment-to-DM trigger created!" : "Keyword rule created!")
      setKeywords("")
      setReply("")
      setPrivateReply("")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create rule")
    } finally {
      setCreating(false)
    }
  }

  async function remove(id: string) {
    await fetch(`/api/social/keywords/${id}`, { method: "DELETE" })
    load()
  }

  function parseRuleContent(rawReply: string) {
    try {
      const parsed = JSON.parse(rawReply)
      if (parsed && typeof parsed === "object" && (parsed.private || parsed.mode === "comment_to_dm")) {
        return { isCommentToDm: true, public: parsed.public as string || "", private: parsed.private as string || "" }
      }
    } catch {}
    return { isCommentToDm: false, public: rawReply, private: "" }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(["FACEBOOK", "INSTAGRAM"] as const).map(c => (
            <Button
              key={c}
              size="sm"
              variant={channel === c ? "default" : "outline"}
              className={channel === c ? (c === "FACEBOOK" ? "bg-blue-600 hover:bg-blue-700" : "bg-pink-600 hover:bg-pink-700") : ""}
              onClick={() => setChannel(c)}
            >
              {c === "FACEBOOK" ? <Facebook className="h-3.5 w-3.5 mr-1.5" /> : <Instagram className="h-3.5 w-3.5 mr-1.5" />}
              {c === "FACEBOOK" ? "Facebook" : "Instagram"}
            </Button>
          ))}
        </div>
        <div className="flex bg-stone-100 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${ruleType === "COMMENT_TO_DM" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            onClick={() => setRuleType("COMMENT_TO_DM")}
          >
            Viral Comment-to-DM
          </button>
          <button
            type="button"
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${ruleType === "KEYWORD_REPLY" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            onClick={() => setRuleType("KEYWORD_REPLY")}
          >
            Canned Reply
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{ruleType === "COMMENT_TO_DM" ? "New Comment-to-DM Trigger" : "New Canned Keyword Reply"}</span>
            <Badge variant="outline" className="text-[10px] font-normal">
              {ruleType === "COMMENT_TO_DM" ? "Auto-broadcast to commenters" : "Keyword match"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">Trigger Keywords (comma separated)</label>
            <Input
              placeholder="e.g. OFFER, DEAL, MENU, VIP, PROMO"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Triggers when a follower comments any of these words on your {channel === "FACEBOOK" ? "Facebook Page" : "Instagram"} posts or reels.
            </p>
          </div>

          {ruleType === "COMMENT_TO_DM" ? (
            <>
              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">Private Direct Message (Sent to Commenter's DM)</label>
                <textarea
                  placeholder="e.g. Hey! Thanks for your comment. Here is your exclusive 25% promo code: VIP25 and direct link: https://app.fizmoh.cloud/menu"
                  value={privateReply}
                  onChange={e => setPrivateReply(e.target.value)}
                  className="w-full text-sm border border-stone-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  rows={3}
                />
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Delivered straight into their private inbox, opening an active 24-hour interaction window and adding them to your CRM contact list.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">Public Comment Reply (Optional)</label>
                <Input
                  placeholder="e.g. Check your DM! Sent you the secret code 📩"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                />
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Public reply posted under their comment for social proof.
                </p>
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">Reply to send when matched</label>
              <textarea
                placeholder="Reply text to send"
                value={reply}
                onChange={e => setReply(e.target.value)}
                className="w-full text-sm border border-stone-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={2}
              />
            </div>
          )}

          <Button size="sm" onClick={create} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-3.5 w-3.5 mr-1" />
            {ruleType === "COMMENT_TO_DM" ? "Create Comment-to-DM Trigger" : "Add Keyword Rule"}
          </Button>
        </CardContent>
      </Card>

      {!rules ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : rules.length === 0 ? (
        <p className="text-xs text-stone-400 py-6 text-center border border-dashed rounded-xl">
          No automated rules configured for {channel === "FACEBOOK" ? "Facebook" : "Instagram"} yet.
        </p>
      ) : (
        rules.map(r => {
          const parsed = parseRuleContent(r.reply)
          return (
            <div key={r.id} className="flex items-start justify-between rounded-lg border border-stone-200 p-3 bg-white space-y-1">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-900">{r.keywords}</span>
                  {parsed.isCommentToDm ? (
                    <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                      Comment-to-DM
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-stone-50 text-stone-600">
                      Canned Reply
                    </Badge>
                  )}
                </div>
                {parsed.isCommentToDm ? (
                  <div className="text-xs space-y-0.5 pt-0.5">
                    {parsed.private && (
                      <p className="text-stone-700 flex items-baseline gap-1.5">
                        <span className="text-[10px] font-semibold text-purple-600 uppercase">Private DM:</span>
                        <span>{parsed.private}</span>
                      </p>
                    )}
                    {parsed.public && (
                      <p className="text-stone-500 flex items-baseline gap-1.5">
                        <span className="text-[10px] font-semibold text-stone-400 uppercase">Public Reply:</span>
                        <span>{parsed.public}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-stone-600">{r.reply}</p>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </Button>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── AI Tone & Knowledge Base ───

function KnowledgeTab() {
  const [channel, setChannel] = useState("FACEBOOK")
  const [settings, setSettings] = useState<{ tone: string; customTone: string | null; businessInfo: Record<string, string>; customInstructions: string | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const [businessInfoText, setBusinessInfoText] = useState("")

  useEffect(() => {
    fetch(`/api/social/settings?channel=${channel}`).then(r => r.json()).then(d => {
      setSettings(d.settings)
      setBusinessInfoText(JSON.stringify(d.settings.businessInfo || {}, null, 2))
    })
  }, [channel])

  async function save() {
    if (!settings) return
    setSaving(true)
    try {
      let businessInfo: Record<string, unknown> = {}
      try { businessInfo = JSON.parse(businessInfoText || "{}") } catch { toast.error("Business information must be valid JSON"); setSaving(false); return }
      const res = await fetch("/api/social/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, tone: settings.tone, customTone: settings.customTone, businessInfo, customInstructions: settings.customInstructions }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Could not save")
      toast.success("Saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  if (!settings) return <Skeleton className="h-96 rounded-xl" />

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex gap-1.5">
        {["FACEBOOK", "INSTAGRAM"].map(c => <Button key={c} size="sm" variant={channel === c ? "default" : "outline"} className={channel === c ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => setChannel(c)}>{c}</Button>)}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Tone</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <select value={settings.tone} onChange={e => setSettings(s => s && { ...s, tone: e.target.value })} className="w-full h-9 px-3 text-sm rounded-lg border border-stone-200 bg-white">
            {["professional", "friendly", "casual", "luxury", "short", "custom"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {settings.tone === "custom" && (
            <textarea value={settings.customTone || ""} onChange={e => setSettings(s => s && { ...s, customTone: e.target.value })} className="w-full text-sm border border-stone-200 rounded-lg p-2" rows={2} placeholder="Describe the tone" />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Business information</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-stone-500">The only facts the AI is allowed to answer from — services, prices, FAQs, opening hours, location, contact details, as JSON.</p>
          <textarea value={businessInfoText} onChange={e => setBusinessInfoText(e.target.value)} className="w-full text-xs font-mono border border-stone-200 rounded-lg p-2" rows={10} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Custom instructions</CardTitle></CardHeader>
        <CardContent>
          <textarea value={settings.customInstructions || ""} onChange={e => setSettings(s => s && { ...s, customInstructions: e.target.value })} className="w-full text-sm border border-stone-200 rounded-lg p-2" rows={3} placeholder="Anything else the AI should know or do" />
        </CardContent>
      </Card>
      <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}Save</Button>
    </div>
  )
}

// ─── Human Handoff ───

function HandoffTab() {
  const [channel, setChannel] = useState("FACEBOOK")
  const [settings, setSettings] = useState<{ requireApproval: boolean; handoffKeywords: string[]; excludedKeywords: string[] } | null>(null)
  const [escalated, setEscalated] = useState<ConversationRow[] | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch(`/api/social/settings?channel=${channel}`).then(r => r.json()).then(d => setSettings(d.settings)) }, [channel])
  useEffect(() => { fetch("/api/social/inbox?escalated=true").then(r => r.json()).then(d => setEscalated(d.conversations || [])) }, [])

  const csv = (v: string[]) => v.join(", ")
  const parseCsv = (v: string) => v.split(",").map(s => s.trim()).filter(Boolean)

  async function save() {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch("/api/social/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, ...settings }) })
      if (!res.ok) throw new Error((await res.json()).error || "Could not save")
      toast.success("Saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  async function resume(id: string) {
    await fetch(`/api/social/inbox/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resume" }) })
    setEscalated(prev => prev?.filter(c => c.id !== id) || null)
  }

  if (!settings) return <Skeleton className="h-64 rounded-xl" />

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-3 max-w-lg">
        <div className="flex gap-1.5">
          {["FACEBOOK", "INSTAGRAM"].map(c => <Button key={c} size="sm" variant={channel === c ? "default" : "outline"} className={channel === c ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => setChannel(c)}>{c}</Button>)}
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Escalation rules</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.requireApproval} onChange={e => setSettings(s => s && { ...s, requireApproval: e.target.checked })} className="h-4 w-4" />
              Require approval before any reply is sent
            </label>
            <div>
              <p className="text-xs text-stone-500 mb-1">Extra phrases that always escalate</p>
              <Input value={csv(settings.handoffKeywords)} onChange={e => setSettings(s => s && { ...s, handoffKeywords: parseCsv(e.target.value) })} />
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-1">Excluded topics — never engaged, always escalated</p>
              <Input value={csv(settings.excludedKeywords)} onChange={e => setSettings(s => s && { ...s, excludedKeywords: parseCsv(e.target.value) })} />
            </div>
            <p className="text-[11px] text-stone-400">Refunds, legal threats, safety, abuse and payment issues are always escalated regardless of what's listed here.</p>
            <Button size="sm" onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">Save</Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Currently escalated</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!escalated ? <Skeleton className="h-32 rounded-lg" /> : escalated.length === 0 ? (
            <p className="text-sm text-stone-400 py-6 text-center">Nothing waiting on a person.</p>
          ) : escalated.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div><p className="text-sm font-medium">{c.customerName}</p><p className="text-xs text-stone-500">{c.lastMessageText}</p></div>
              <Button size="sm" variant="outline" onClick={() => resume(c.id)}><Play className="h-3.5 w-3.5 mr-1" />Resume</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Logs & Errors ───

function LogsTab() {
  const [data, setData] = useState<{ logs: { id: string; action: string; createdAt: string; staffName: string | null }[]; failedMessages: { id: string; channel: string; customerName: string | null; content: string; createdAt: string }[] } | null>(null)
  useEffect(() => { fetch("/api/social/logs").then(r => r.json()).then(setData) }, [])
  if (!data) return <Skeleton className="h-96 rounded-xl" />

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Failed messages</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.failedMessages.length === 0 ? <p className="text-sm text-stone-400 py-6 text-center">No failures.</p> : data.failedMessages.map(m => (
            <div key={m.id} className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs">
              <p className="font-medium">{m.customerName || "Unknown"} · {m.channel}</p>
              <p className="text-stone-600 mt-0.5">{m.content}</p>
              <p className="text-stone-400 mt-1">{new Date(m.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Audit log</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 max-h-96 overflow-y-auto">
          {data.logs.map(l => (
            <div key={l.id} className="text-xs flex items-center justify-between border-b border-stone-100 pb-1.5">
              <span>{l.action.replace(/^SOCIAL_/, "").replace(/_/g, " ")}</span>
              <span className="text-stone-400">{new Date(l.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Usage & Limits ───

function UsageTab() {
  const [analytics, setAnalytics] = useState<{ receivedByChannel: { channel: string; count: number }[]; sentByChannel: { channel: string; count: number }[]; aiReplies: number; humanReplies: number; escalated: number; failedMessages: number; leadsGenerated: number; avgResponseMinutes: number | null } | null>(null)
  useEffect(() => { fetch("/api/social/analytics").then(r => r.json()).then(setAnalytics) }, [])
  if (!analytics) return <Skeleton className="h-64 rounded-xl" />

  const cards: Array<[string, number | string | null]> = [
    ["AI replies sent", analytics.aiReplies], ["Human replies sent", analytics.humanReplies],
    ["Escalated conversations", analytics.escalated], ["Failed messages", analytics.failedMessages],
    ["Leads generated", analytics.leadsGenerated], ["Avg. response time", analytics.avgResponseMinutes != null ? `${analytics.avgResponseMinutes} min` : "—"],
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(([label, value]) => (
          <Card key={label}><CardContent className="p-4"><p className="text-xs font-medium text-stone-500">{label}</p><p className="text-2xl font-bold text-stone-900 mt-1">{value ?? "—"}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Messages by channel</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {analytics.receivedByChannel.map(r => {
            const sent = analytics.sentByChannel.find(s => s.channel === r.channel)?.count || 0
            return (
              <div key={r.channel} className="flex items-center justify-between text-sm border-b border-stone-100 pb-1.5">
                <span>{r.channel}</span><span className="text-stone-500">{r.count} received · {sent} sent</span>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Add-on Billing ───

function BillingTab() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  useEffect(() => { fetch("/api/features").then(r => r.json()).then(d => setEnabled(Boolean(d.social_inbox))) }, [])

  return (
    <Card className="max-w-lg">
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />Add-on status</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {enabled === null ? <Skeleton className="h-10 rounded-lg" /> : enabled ? (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Included in your plan</Badge>
        ) : (
          <>
            <Badge variant="outline" className="bg-stone-100 text-stone-500">Not included in your current plan</Badge>
            <p className="text-sm text-stone-500">Facebook &amp; Instagram Automation is a paid add-on. Contact your platform administrator to enable it for this workspace.</p>
          </>
        )}
        <p className="text-[11px] text-stone-400 flex items-center gap-1"><ArrowRight className="h-3 w-3" />Every feature on this page is gated behind this add-on the same way Digital QR Addons is — nothing here works without it enabled.</p>
      </CardContent>
    </Card>
  )
}
