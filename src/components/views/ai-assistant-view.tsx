"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Send, Globe, Zap, Calendar, Search, CreditCard, HelpCircle, MapPin, Trash2, Bot } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

import { toast } from "sonner"

interface Msg { role: "user" | "assistant"; content: string; ts: Date }

export default function AIAssistantView() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [lang, setLang] = useState<"en" | "ar">("en")
  const [typing, setTyping] = useState(false)
  const [assistantName, setAssistantName] = useState("AI Assistant")
  const [businessName, setBusinessName] = useState("")
  const [newName, setNewName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [togglingAi, setTogglingAi] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        const aName = String(d?.settings?.assistant_name ?? "").trim()
        const bName = String(d?.settings?.business_name ?? "").trim()
        if (aName) {
          setAssistantName(aName)
          setNewName(aName)
        } else if (bName) {
          setAssistantName(`${bName} Assistant`)
          setNewName(`${bName} Assistant`)
        }
        if (bName) setBusinessName(bName)

        const s = d?.settings || {}
        const isOff =
          s.ai_assistant_enabled === false || String(s.ai_assistant_enabled).toLowerCase() === "false" ||
          s.wa_bot_enabled === false || String(s.wa_bot_enabled).toLowerCase() === "false" ||
          s.bot_enabled === false || String(s.bot_enabled).toLowerCase() === "false" ||
          s.auto_reply_enabled === false || String(s.auto_reply_enabled).toLowerCase() === "false" ||
          s.ai_24_7 === false || String(s.ai_24_7).toLowerCase() === "false" ||
          s.wa_ai_always_on === false || String(s.wa_ai_always_on).toLowerCase() === "false"
        const hasExplicitSetting =
          s.ai_assistant_enabled !== undefined ||
          s.wa_bot_enabled !== undefined ||
          s.bot_enabled !== undefined ||
          s.auto_reply_enabled !== undefined ||
          s.ai_24_7 !== undefined
        setAiEnabled(hasExplicitSetting ? !isOff : true)
      })
      .catch(() => {})
  }, [])

  const toggleAiAssistant = async (next: boolean) => {
    setTogglingAi(true)
    const prev = aiEnabled
    setAiEnabled(next)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_assistant_enabled: next,
          wa_bot_enabled: next,
          bot_enabled: next,
          auto_reply_enabled: next,
          ai_24_7: next,
          wa_ai_always_on: next,
        }),
      })
      if (!res.ok) throw new Error("Could not update AI assistant status")
      toast.success(next ? "AI Assistant enabled (Auto-replies active)" : "AI Assistant turned off (Manual team mode)")
    } catch (e: any) {
      setAiEnabled(prev)
      toast.error(e?.message || "Failed to update AI assistant setting")
    } finally {
      setTogglingAi(false)
    }
  }

  const saveAssistantName = async () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      toast.error("Please enter a valid assistant name")
      return
    }
    setSavingName(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistant_name: trimmed }),
      })
      if (!res.ok) throw new Error("Could not update assistant name")
      setAssistantName(trimmed)
      setEditingName(false)
      toast.success(`AI Assistant name updated to "${trimmed}"`)
    } catch (e: any) {
      toast.error(e?.message || "Failed to save assistant name")
    } finally {
      setSavingName(false)
    }
  }

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight) }, [messages, typing])

  const send = async (text?: string) => {
    const content = text || input
    if (!content.trim()) return
    const userMsg: Msg = { role: "user", content, ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setTyping(true)
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })), language: lang }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.response, ts: new Date() }])
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again.", ts: new Date() }]) }
    finally { setTyping(false) }
  }

  const quickPrompts = [
    { text: "Show me desert tours", icon: MapPin },
    { text: "Check availability for tomorrow", icon: Calendar },
    { text: "How do I pay by bank transfer?", icon: CreditCard },
    { text: "What's the cancellation policy?", icon: HelpCircle },
  ]

  const capabilities = [
    { icon: Search, label: "Check Availability" },
    { icon: Calendar, label: "Book Tours" },
    { icon: CreditCard, label: "Payment Help" },
    { icon: WhatsAppIcon, label: "Order Status" },
    { icon: HelpCircle, label: "FAQs" },
    { icon: Globe, label: "EN + AR" },
  ]

  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-[calc(100dvh-4rem)] relative overflow-hidden">
      {/* Left panel for desktop */}
      <div className="hidden md:flex w-72 border-e border-stone-200 bg-white flex-col shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between gap-2" data-tour="ai-assistant-toggle">
            <div className="flex items-center gap-2.5 truncate">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="truncate">
                <div className="font-bold text-stone-900 truncate text-sm">{assistantName}</div>
                <div className="text-[11px] flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${aiEnabled ? "bg-emerald-500 animate-pulse" : "bg-stone-400"}`} />
                  <span className={aiEnabled ? "text-emerald-700 font-medium" : "text-stone-500"}>
                    {aiEnabled ? "Active & Online" : "Turned Off"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setEditingName(!editingName)}
              className="text-[10px] font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md transition"
              title="Change Assistant Name"
            >
              {editingName ? "Close" : "Brand"}
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t flex items-center justify-between gap-2 bg-stone-50/80 p-2.5 rounded-lg border border-stone-200">
            <div>
              <div className="text-xs font-semibold text-stone-800">AI Auto-Replies</div>
              <div className="text-[10px] text-stone-500">{aiEnabled ? "AI answers customer inquiries" : "Off (Manual agent mode)"}</div>
            </div>
            <Switch
              checked={aiEnabled}
              disabled={togglingAi}
              onCheckedChange={toggleAiAssistant}
              aria-label="Toggle AI Assistant"
            />
          </div>

          {editingName && (
            <div className="mt-3 p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Assistant Name
              </label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. EMADI Assistant"
                className="h-8 text-xs bg-white"
              />
              <div className="flex items-center gap-1.5 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={() => setEditingName(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs px-2.5 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={saveAssistantName}
                  disabled={savingName}
                >
                  {savingName ? "Saving..." : "Save Name"}
                </Button>
              </div>
            </div>
          )}
        </div>
        <ScrollArea className="flex-1 p-4 space-y-4">
          <div data-tour="ai-instructions">
            <div className="text-[10px] font-bold uppercase text-stone-400 mb-2">Capabilities</div>
            <div className="grid grid-cols-2 gap-2">{capabilities.map((c, i) => <div key={i} className="p-2 rounded-lg bg-stone-50 flex flex-col items-center gap-1"><c.icon className="h-4 w-4 text-emerald-600" /><span className="text-[10px] text-stone-600 text-center">{c.label}</span></div>)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-stone-400 mb-2">Quick Prompts</div>
            <div className="space-y-1.5">{quickPrompts.map((p, i) => <button key={i} onClick={() => send(p.text)} className="w-full flex items-center gap-2 p-2 rounded-lg border hover:bg-emerald-50 hover:border-emerald-200 text-left text-xs text-stone-700"><p.icon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{p.text}</button>)}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100" data-tour="ai-knowledge-sync"><div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 mb-1"><Bot className="h-3.5 w-3.5" />WhatsApp Powered</div><p className="text-[10px] text-emerald-600">This AI powers WhatsApp conversations. Test it here before going live.</p></div>
        </ScrollArea>
        <div className="p-3 border-t flex items-center justify-between">
          <span className="text-xs text-stone-500">Language</span>
          <div className="flex gap-1">
            <button onClick={() => setLang("en")} className={`px-2 py-0.5 rounded text-xs ${lang === "en" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"}`}>EN</button>
            <button onClick={() => setLang("ar")} className={`px-2 py-0.5 rounded text-xs ${lang === "ar" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"}`}>عربي</button>
          </div>
        </div>
        {messages.length > 0 && <div className="p-3 border-t"><Button variant="outline" size="sm" className="w-full" onClick={() => setMessages([])}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Clear Chat</Button></div>}
      </div>

      {/* Mobile Drawer (Settings/Capabilities) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/50 flex">
          <div className="w-80 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="font-bold text-sm text-stone-800">Assistant Options</span>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-stone-500 hover:text-stone-800">
                <Trash2 className="hidden" /> ✕
              </button>
            </div>
            <ScrollArea className="flex-1 p-4 space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase text-stone-400 mb-2">Capabilities</div>
                <div className="grid grid-cols-2 gap-2">{capabilities.map((c, i) => <div key={i} className="p-2 rounded-lg bg-stone-50 flex flex-col items-center gap-1"><c.icon className="h-4 w-4 text-emerald-600" /><span className="text-[10px] text-stone-600 text-center">{c.label}</span></div>)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-stone-400 mb-2">Quick Prompts</div>
                <div className="space-y-1.5">{quickPrompts.map((p, i) => <button key={i} onClick={() => { send(p.text); setDrawerOpen(false) }} className="w-full flex items-center gap-2 p-2 rounded-lg border hover:bg-emerald-50 hover:border-emerald-200 text-left text-xs text-stone-700"><p.icon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{p.text}</button>)}</div>
              </div>
            </ScrollArea>
            <div className="p-3 border-t flex items-center justify-between">
              <span className="text-xs text-stone-500">Language</span>
              <div className="flex gap-1">
                <button onClick={() => setLang("en")} className={`px-2 py-0.5 rounded text-xs ${lang === "en" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"}`}>EN</button>
                <button onClick={() => setLang("ar")} className={`px-2 py-0.5 rounded text-xs ${lang === "ar" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600"}`}>عربي</button>
              </div>
            </div>
            {messages.length > 0 && <div className="p-3 border-t"><Button variant="outline" size="sm" className="w-full" onClick={() => { setMessages([]); setDrawerOpen(false) }}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Clear Chat</Button></div>}
          </div>
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-stone-50 min-w-0">
        <div className="p-2.5 sm:p-3 border-b bg-white flex items-center justify-between md:hidden gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0"
            >
              <Sparkles className="h-4 w-4 text-white" />
            </button>
            <div className="truncate">
              <span className="font-semibold text-xs sm:text-sm block truncate">{assistantName}</span>
              <span className={`text-[10px] block ${aiEnabled ? "text-emerald-600" : "text-stone-400"}`}>
                {aiEnabled ? "● Online" : "○ Turned Off"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-stone-50 border rounded-lg px-2 py-1">
              <span className="text-[10px] font-semibold text-stone-600">AI</span>
              <Switch
                checked={aiEnabled}
                disabled={togglingAi}
                onCheckedChange={toggleAiAssistant}
                aria-label="Toggle AI Assistant"
                className="scale-90"
              />
            </div>
            <div className="flex gap-1">
              <button onClick={() => setLang("en")} className={`px-2 py-0.5 rounded text-xs ${lang === "en" ? "bg-emerald-600 text-white" : "bg-stone-100"}`}>EN</button>
              <button onClick={() => setLang("ar")} className={`px-2 py-0.5 rounded text-xs ${lang === "ar" ? "bg-emerald-600 text-white" : "bg-stone-100"}`}>عربي</button>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setDrawerOpen(true)}>
              Prompts
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3" dir={lang === "ar" ? "rtl" : "ltr"}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-6">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3 sm:mb-4"><Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-white" /></div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 mb-2">Hi, I&apos;m {assistantName}! 👋</h2>
              <p className="text-xs sm:text-sm text-stone-500 mb-4 px-2">{businessName ? `Your AI assistant for ${businessName}.` : "Your 24/7 AI conversational assistant."} I can answer questions, quote requests, and handle customer support directly on WhatsApp.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm sm:max-w-md">{quickPrompts.map((p, i) => <button key={i} onClick={() => send(p.text)} className="p-2.5 sm:p-3 rounded-xl border hover:border-emerald-300 hover:bg-emerald-50 text-left"><p.icon className="h-4 w-4 text-emerald-600 mb-1" /><div className="text-xs font-medium text-stone-700">{p.text}</div></button>)}</div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 break-words [overflow-wrap:anywhere] ${m.role === "user" ? "bg-emerald-600 text-white" : "bg-white border border-stone-200 text-stone-800"}`}>
                  {m.role === "assistant" && <div className="flex items-center gap-1 text-[10px] text-amber-500 mb-1"><Sparkles className="h-2.5 w-2.5" />{assistantName}</div>}
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">{m.content}</p>
                  <div className={`text-[9px] mt-1 ${m.role === "user" ? "text-emerald-100" : "text-stone-400"}`}>{m.ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))
          )}
          {typing && <div className="flex justify-start"><div className="bg-white border rounded-2xl px-4 py-3 flex gap-1"><span className="h-2 w-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "0ms" }} /><span className="h-2 w-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "150ms" }} /><span className="h-2 w-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "300ms" }} /></div></div>}
        </div>

        <div className="p-2.5 sm:p-3 border-t bg-white flex items-center gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={lang === "ar" ? "اكتب رسالتك..." : "Type your message..."}
            className="flex-1 text-base sm:text-sm h-10"
            dir={lang === "ar" ? "rtl" : "ltr"}
            onKeyDown={e => { if (e.key === "Enter" && input.trim()) send() }}
          />
          <Button onClick={() => input.trim() && send()} className="bg-emerald-600 hover:bg-emerald-700 min-h-[40px] min-w-[40px]" disabled={typing}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center text-[10px] text-stone-400 pb-1">Powered by Z.ai</div>
      </div>
    </div>
  )
}
