"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Send, Globe, Zap, Calendar, Search, CreditCard, HelpCircle, MapPin, Trash2, Bot } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

interface Msg { role: "user" | "assistant"; content: string; ts: Date }

export default function AIAssistantView() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [lang, setLang] = useState<"en" | "ar">("en")
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left panel */}
      <div className="hidden md:flex w-72 border-r border-stone-200 bg-white flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"><Sparkles className="h-6 w-6 text-white" /></div>
            <div><div className="font-bold text-stone-900">Najwa</div><div className="text-[11px] text-stone-500 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Online 24/7</div></div>
          </div>
        </div>
        <ScrollArea className="flex-1 p-4 space-y-4">
          <div>
            <div className="text-[10px] font-bold uppercase text-stone-400 mb-2">Capabilities</div>
            <div className="grid grid-cols-2 gap-2">{capabilities.map((c, i) => <div key={i} className="p-2 rounded-lg bg-stone-50 flex flex-col items-center gap-1"><c.icon className="h-4 w-4 text-emerald-600" /><span className="text-[10px] text-stone-600 text-center">{c.label}</span></div>)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-stone-400 mb-2">Quick Prompts</div>
            <div className="space-y-1.5">{quickPrompts.map((p, i) => <button key={i} onClick={() => send(p.text)} className="w-full flex items-center gap-2 p-2 rounded-lg border hover:bg-emerald-50 hover:border-emerald-200 text-left text-xs text-stone-700"><p.icon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{p.text}</button>)}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100"><div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 mb-1"><Bot className="h-3.5 w-3.5" />WhatsApp Powered</div><p className="text-[10px] text-emerald-600">This AI powers WhatsApp conversations. Test it here before going live.</p></div>
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

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-stone-50">
        <div className="p-3 border-b bg-white flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div><span className="font-semibold text-sm">Najwa AI</span></div>
          <div className="flex gap-1"><button onClick={() => setLang("en")} className={`px-2 py-0.5 rounded text-xs ${lang === "en" ? "bg-emerald-600 text-white" : "bg-stone-100"}`}>EN</button><button onClick={() => setLang("ar")} className={`px-2 py-0.5 rounded text-xs ${lang === "ar" ? "bg-emerald-600 text-white" : "bg-stone-100"}`}>عربي</button></div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" dir={lang === "ar" ? "rtl" : "ltr"}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4"><Sparkles className="h-8 w-8 text-white" /></div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">Hi, I'm Najwa! 🐪</h2>
              <p className="text-sm text-stone-500 mb-4">Your AI travel assistant for Oman Adventures. I can help you discover tours, check availability, make bookings, and answer any questions.</p>
              <div className="grid grid-cols-2 gap-2 w-full">{quickPrompts.map((p, i) => <button key={i} onClick={() => send(p.text)} className="p-3 rounded-xl border hover:border-emerald-300 hover:bg-emerald-50 text-left"><p.icon className="h-4 w-4 text-emerald-600 mb-1" /><div className="text-xs font-medium text-stone-700">{p.text}</div></button>)}</div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.role === "user" ? "bg-emerald-600 text-white" : "bg-white border border-stone-200 text-stone-800"}`}>
                  {m.role === "assistant" && <div className="flex items-center gap-1 text-[10px] text-amber-500 mb-1"><Sparkles className="h-2.5 w-2.5" />Najwa AI</div>}
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  <div className={`text-[9px] mt-1 ${m.role === "user" ? "text-emerald-100" : "text-stone-400"}`}>{m.ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))
          )}
          {typing && <div className="flex justify-start"><div className="bg-white border rounded-2xl px-4 py-3 flex gap-1"><span className="h-2 w-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "0ms" }} /><span className="h-2 w-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "150ms" }} /><span className="h-2 w-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "300ms" }} /></div></div>}
        </div>

        <div className="p-3 border-t bg-white flex items-center gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder={lang === "ar" ? "اكتب رسالتك..." : "Type your message..."} className="flex-1" dir={lang === "ar" ? "rtl" : "ltr"} onKeyDown={e => { if (e.key === "Enter" && input.trim()) send() }} />
          <Button onClick={() => input.trim() && send()} className="bg-emerald-600 hover:bg-emerald-700" disabled={typing}><Send className="h-4 w-4" /></Button>
        </div>
        <div className="text-center text-[10px] text-stone-400 pb-1">Powered by Z.ai</div>
      </div>
    </div>
  )
}
