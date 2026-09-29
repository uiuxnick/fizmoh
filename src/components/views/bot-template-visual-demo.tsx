"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { type FlowTemplate } from "@/lib/bot-templates"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  X,
  RotateCcw,
  Check,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Copy,
  Zap,
  CheckCircle2,
  Send,
  Play,
  Pause,
  Hand,
  ChevronUp,
  Bot,
} from "lucide-react"
import { toast } from "sonner"

interface VisualDemoProps {
  template: FlowTemplate
  isOpen: boolean
  onClose: () => void
  onApply?: (template: FlowTemplate) => void
  signupUrl?: string
  allTemplates?: FlowTemplate[]
  currentIndex?: number
  onNavigate?: (template: FlowTemplate, index: number) => void
}

interface DemoMessage {
  id: string
  sender: "customer" | "bot"
  text: string
  buttons?: string[]
  listButton?: string
  listRows?: Array<{ id: string; title: string; description?: string }>
  mediaType?: "IMAGE" | "VIDEO" | "DOCUMENT"
  timestamp: string
  isTyped?: boolean // user typed it manually
}

/** Format WhatsApp markdown *bold*, _italic_, ~strike~, `code` */
function formatWhatsApp(text: string): string {
  if (!text) return ""
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    .replace(/~([^~\n]+)~/g, "<del>$1</del>")
    .replace(/`([^`]+)`/g, "<code class='bg-stone-100 rounded px-1 text-[11px] font-mono'>$1</code>")
    .replace(/\n/g, "<br/>")
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function BotTemplateVisualDemo({
  template,
  isOpen,
  onClose,
  onApply,
  signupUrl,
  allTemplates,
  currentIndex = 0,
  onNavigate,
}: VisualDemoProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [scriptStep, setScriptStep] = useState(0)      // next script index to play
  const [isTyping, setIsTyping] = useState(false)
  const [selectedButtons, setSelectedButtons] = useState<Set<string>>(new Set())
  const [inputValue, setInputValue] = useState("")
  const [mode, setMode] = useState<"manual" | "auto">("manual")
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [autoTimer, setAutoTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [inputDisabled, setInputDisabled] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Navigation ─────────────────────────────────────────────────────────────
  const canGoPrev = allTemplates && currentIndex > 0
  const canGoNext = allTemplates && currentIndex < allTemplates.length - 1

  const navigate = (dir: "prev" | "next") => {
    if (!allTemplates || !onNavigate) return
    const nextIdx = dir === "prev" ? currentIndex - 1 : currentIndex + 1
    if (nextIdx < 0 || nextIdx >= allTemplates.length) return
    hardReset()
    onNavigate(allTemplates[nextIdx], nextIdx)
  }

  // ── Build conversation script from template nodes ──────────────────────────
  const conversationScript = useMemo<DemoMessage[]>(() => {
    const rawNodes = (template.nodes || []) as any[]
    const script: DemoMessage[] = []

    // 1. Trigger: customer sends the keyword
    let triggerKeyword = "Hello! 👋"
    const triggerCfg = template.triggerConfig as any
    if (triggerCfg?.keywords?.length) {
      triggerKeyword = String(triggerCfg.keywords[0])
    }
    script.push({
      id: "trigger-customer",
      sender: "customer",
      text: triggerKeyword,
      timestamp: "10:30 AM",
    })

    // 2. Bot messages from each node
    let minuteOffset = 31
    rawNodes.forEach((node, i) => {
      if (node.type === "TRIGGER") return

      let text = ""
      let buttons: string[] | undefined
      let listButton: string | undefined
      let listRows: any[] | undefined

      if (node.type === "SEND_TEXT") {
        text = String(node.data?.text || "")
      } else if (node.type === "QUICK_REPLY") {
        text = String(node.data?.text || "Please choose an option:")
        if (Array.isArray(node.data?.buttons)) buttons = node.data.buttons
      } else if (node.type === "LIST") {
        text = String(node.data?.text || "Please select from the menu:")
        listButton = node.data?.listButton || "View Menu"
        if (Array.isArray(node.data?.rows)) listRows = node.data.rows
      } else if (node.type === "QUESTION") {
        text = String(node.data?.text || "Please reply with your answer:")
      } else if (node.type === "AI") {
        text = "🤖 *AI Intelligent Assistant*\n" + (node.data?.instruction || "I'm ready to answer questions about your products, services, and policies.")
      } else if (node.type === "HANDOFF") {
        text = "👨‍💼 *Connecting you to a specialist…*\nEstimated wait: < 1 minute."
      } else if (node.type === "CATALOG") {
        text = String(node.data?.text || "🛍️ Here's our product catalogue — browse and pick what you'd like!")
      } else if (node.type === "PRODUCT") {
        text = String(node.data?.text || "⭐ Check out our featured product below!")
      } else if (node.type === "VISA") {
        text = String(node.data?.text || "🛂 " + (node.data?.visaType || "We process your visa application quickly and securely."))
      } else if (node.type === "CONDITION") {
        text = ""           // conditions don't produce chat messages
      } else if (node.type === "END") {
        text = "✅ *All done!* Your request has been processed. Thank you for reaching out!"
      } else {
        text = String(node.data?.text || "")
      }

      if (text.trim()) {
        const t = minuteOffset++
        script.push({
          id: `bot-${node.id || i}`,
          sender: "bot",
          text,
          buttons,
          listButton,
          listRows,
          timestamp: `10:${t < 10 ? "0" + t : t} AM`,
        })
      }
    })

    return script
  }, [template])

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // ── Deliver next bot message from script ───────────────────────────────────
  const deliverNextBot = useCallback((currentStep: number, onDone?: (nextStep: number) => void) => {
    const next = conversationScript[currentStep]
    if (!next || next.sender !== "bot") {
      onDone?.(currentStep)
      return
    }
    // Typing delay proportional to message length (min 600ms, max 2000ms)
    const typingMs = Math.min(2000, Math.max(600, next.text.length * 12))
    setIsTyping(true)
    const timer = setTimeout(() => {
      setIsTyping(false)
      setMessages(prev => [...prev, { ...next, timestamp: nowTime() }])
      const newStep = currentStep + 1
      setScriptStep(newStep)
      onDone?.(newStep)
    }, typingMs)
    setAutoTimer(timer)
  }, [conversationScript])

  // ── Reset ──────────────────────────────────────────────────────────────────
  const hardReset = useCallback(() => {
    if (autoTimer) clearTimeout(autoTimer)
    setAutoPlaying(false)
    setMessages([])
    setScriptStep(0)
    setIsTyping(false)
    setSelectedButtons(new Set())
    setInputValue("")
    setInputDisabled(false)
  }, [autoTimer])

  const startDemo = useCallback(() => {
    if (conversationScript.length === 0) return

    // Show trigger message
    const trigger = conversationScript[0]
    setMessages([{ ...trigger, timestamp: nowTime() }])

    // Deliver first bot reply
    deliverNextBot(1)
    setScriptStep(2)
  }, [conversationScript, deliverNextBot])

  // ── On open / template change ──────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      hardReset()
      setTimeout(() => startDemo(), 200)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, template])

  // ── Auto-play mode: automatically advance through all bot messages ─────────
  const runAutoPlay = useCallback((fromStep: number) => {
    const next = conversationScript[fromStep]
    if (!next) {
      setAutoPlaying(false)
      return
    }
    if (next.sender === "customer") {
      // Simulate customer typing before proceeding
      const delayMs = 1000
      const t = setTimeout(() => {
        setMessages(prev => [...prev, { ...next, timestamp: nowTime() }])
        runAutoPlay(fromStep + 1)
      }, delayMs)
      setAutoTimer(t)
    } else {
      deliverNextBot(fromStep, (nextStep) => runAutoPlay(nextStep))
    }
  }, [conversationScript, deliverNextBot])

  const toggleAutoPlay = () => {
    if (autoPlaying) {
      if (autoTimer) clearTimeout(autoTimer)
      setAutoPlaying(false)
      setIsTyping(false)
    } else {
      setAutoPlaying(true)
      runAutoPlay(scriptStep)
    }
  }

  // ── Handle button tap ──────────────────────────────────────────────────────
  const handleButtonClick = (btn: string) => {
    if (isTyping || inputDisabled) return
    setSelectedButtons(prev => new Set([...prev, btn]))
    setInputDisabled(true)

    const customerMsg: DemoMessage = {
      id: `customer-btn-${Date.now()}`,
      sender: "customer",
      text: btn,
      timestamp: nowTime(),
    }
    setMessages(prev => [...prev, customerMsg])

    deliverNextBot(scriptStep, (nextStep) => {
      setInputDisabled(false)
      // If next script item is also a bot message (chained), deliver it
      // otherwise user must type
    })
  }

  // ── Handle manual text input send ─────────────────────────────────────────
  const handleSend = () => {
    const text = inputValue.trim()
    if (!text || isTyping || inputDisabled) return

    setInputValue("")
    setInputDisabled(true)

    const customerMsg: DemoMessage = {
      id: `customer-typed-${Date.now()}`,
      sender: "customer",
      text,
      timestamp: nowTime(),
      isTyped: true,
    }
    setMessages(prev => [...prev, customerMsg])

    // Advance script: deliver next bot reply if one exists
    if (scriptStep < conversationScript.length) {
      deliverNextBot(scriptStep, () => setInputDisabled(false))
    } else {
      // Flow complete — echo a wrap-up
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setInputDisabled(false)
        setMessages(prev => [...prev, {
          id: `bot-end-${Date.now()}`,
          sender: "bot",
          text: "✅ *Got it!* Your message has been received. A team member will follow up shortly.\n\nWant to explore more? Try loading this flow into your workspace!",
          timestamp: nowTime(),
        }])
      }, 1200)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend()
  }

  const copyTemplateJson = () => {
    navigator.clipboard.writeText(JSON.stringify(template, null, 2))
    toast.success("Template JSON copied to clipboard")
  }

  if (!isOpen) return null

  // Last bot message in chat (to show active buttons)
  const lastBotMsg = [...messages].reverse().find(m => m.sender === "bot")
  const activeButtons = !inputDisabled && lastBotMsg?.buttons && lastBotMsg.buttons.length > 0
    ? lastBotMsg.buttons
    : null
  const activeList = !inputDisabled && lastBotMsg?.listRows && lastBotMsg.listRows.length > 0
    ? lastBotMsg
    : null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col lg:flex-row overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-stone-400 hover:text-stone-700 p-2 rounded-full hover:bg-stone-100 transition cursor-pointer"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ─── LEFT: Phone Simulator ─────────────────────────────────────────── */}
        <div className="flex-1 bg-gradient-to-br from-stone-100 to-stone-200 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start overflow-y-auto border-b lg:border-b-0 lg:border-r border-stone-200">

          {/* Mode toggle row */}
          <div className="w-full max-w-[360px] mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-stone-200 shadow-xs">
              <button
                onClick={() => { setMode("manual"); if (autoPlaying) { if (autoTimer) clearTimeout(autoTimer); setAutoPlaying(false) } }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${mode === "manual" ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-700"}`}
              >
                <Hand className="h-3.5 w-3.5" />
                Manual
              </button>
              <button
                onClick={() => setMode("auto")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${mode === "auto" ? "bg-emerald-600 text-white" : "text-stone-500 hover:text-stone-700"}`}
              >
                <Zap className="h-3.5 w-3.5" />
                Auto-Play
              </button>
            </div>

            <div className="flex items-center gap-1">
              {mode === "auto" && (
                <button
                  onClick={toggleAutoPlay}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${autoPlaying ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-emerald-50 border-emerald-300 text-emerald-700"}`}
                >
                  {autoPlaying ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Play</>}
                </button>
              )}
              <button
                onClick={() => { hardReset(); setTimeout(() => startDemo(), 100) }}
                className="p-2 rounded-xl bg-white border border-stone-200 text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer shadow-xs"
                title="Replay"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Phone Frame */}
          <div className="w-full max-w-[360px] bg-black rounded-[42px] p-3 shadow-2xl ring-1 ring-black/10">
            <div className="w-full bg-[#EFEAE2] rounded-[32px] overflow-hidden flex flex-col border border-stone-800/40" style={{ height: 580 }}>

              {/* Status bar */}
              <div className="bg-[#075E54] text-white px-5 pt-2.5 pb-1 flex items-center justify-between text-[11px] font-semibold shrink-0">
                <span>9:41</span>
                <div className="w-16 h-3 bg-black/40 rounded-full mx-auto" />
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Chat header */}
              <div className="bg-[#075E54] text-white px-3 py-2 flex items-center justify-between shadow-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronLeft className="h-5 w-5 shrink-0 opacity-80" />
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-700 border border-white/20 flex items-center justify-center font-bold text-base shadow-xs">
                      {template.emoji || "🤖"}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#075E54] rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-bold text-xs truncate max-w-[130px] leading-tight">
                        {template.name.replace(/—.*/, "").trim()}
                      </p>
                      <CheckCircle2 className="h-3 w-3 text-emerald-300 shrink-0 fill-emerald-300 stroke-[#075E54]" />
                    </div>
                    <p className="text-[10px] text-emerald-100/90 leading-tight">
                      {isTyping ? "typing…" : "Official Business Account"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-white/90 shrink-0">
                  <Video className="h-4 w-4 opacity-80" />
                  <Phone className="h-4 w-4 opacity-80" />
                  <MoreVertical className="h-4 w-4 opacity-80" />
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#EFEAE2]">
                {/* Encryption notice */}
                <div className="mx-auto max-w-[260px] bg-[#FFEECD] rounded-lg p-2 text-center shadow-2xs border border-[#F4E1B5]">
                  <p className="text-[9px] text-[#5E523A] leading-tight flex items-center justify-center gap-1">
                    <span>🔒</span>
                    <span>Messages and calls are end-to-end encrypted. No one outside of this chat can read them.</span>
                  </p>
                </div>

                {/* Date pill */}
                <div className="text-center">
                  <span className="bg-white/80 text-[#54656F] text-[10px] font-semibold px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-2xs">Today</span>
                </div>

                {/* Message bubbles */}
                {messages.map((msg) => {
                  const isBot = msg.sender === "bot"
                  return (
                    <div key={msg.id} className="space-y-1 animate-in fade-in-50 duration-150">
                      <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[88%] rounded-2xl p-2.5 text-xs shadow-xs relative ${
                            isBot
                              ? "bg-white text-stone-900 rounded-tl-none border border-stone-200/40"
                              : "bg-[#DCF8C6] text-stone-900 rounded-tr-none border border-[#c3f0a5]"
                          }`}
                        >
                          <div
                            className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed break-words"
                            dangerouslySetInnerHTML={{ __html: formatWhatsApp(msg.text) }}
                          />
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-stone-400">
                            <span>{msg.timestamp}</span>
                            {!isBot && <CheckCheck className="h-3 w-3 text-sky-500" />}
                            {isBot && <CheckCheck className="h-3 w-3 text-sky-400" />}
                          </div>
                        </div>
                      </div>

                      {/* Quick-reply buttons — shown BELOW the specific bot message */}
                      {isBot && msg.buttons && msg.buttons.length > 0 && (
                        <div className="space-y-1 pl-1 max-w-[90%]">
                          {msg.buttons.map((btn, bi) => {
                            const picked = selectedButtons.has(btn)
                            return (
                              <button
                                key={bi}
                                type="button"
                                disabled={picked || inputDisabled || autoPlaying}
                                onClick={() => handleButtonClick(btn)}
                                className={`w-full text-center py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-default ${
                                  picked
                                    ? "bg-emerald-600 text-white ring-1 ring-emerald-700"
                                    : "bg-white text-[#00A884] hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 disabled:opacity-60"
                                }`}
                              >
                                {picked ? <Check className="h-3 w-3" /> : <span className="w-2 h-2 rounded-full border-2 border-current" />}
                                {btn}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* List rows */}
                      {isBot && msg.listRows && msg.listRows.length > 0 && (
                        <div className="space-y-0.5 pl-1 max-w-[90%]">
                          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
                            <div className="bg-stone-50 px-3 py-1.5 text-[11px] font-bold text-stone-600 border-b border-stone-100 flex items-center gap-1">
                              <span>📋</span><span>{msg.listButton || "Menu Options"}</span>
                            </div>
                            {msg.listRows.map((row, ri) => {
                              const picked = selectedButtons.has(row.title)
                              return (
                                <button
                                  key={ri}
                                  type="button"
                                  disabled={picked || inputDisabled || autoPlaying}
                                  onClick={() => handleButtonClick(row.title)}
                                  className={`w-full text-left p-2.5 text-xs transition flex flex-col gap-0.5 cursor-pointer border-b border-stone-50 last:border-0 disabled:cursor-default ${picked ? "bg-emerald-50 font-bold text-emerald-900" : "hover:bg-stone-50 text-stone-800 disabled:opacity-60"}`}
                                >
                                  <span className="font-semibold">{row.title}</span>
                                  {row.description && <span className="text-[10px] text-stone-500">{row.description}</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start animate-in fade-in-50 duration-150">
                    <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-xs border border-stone-200/50 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* ── Chat Input Bar ── */}
              <div className="bg-[#F0F2F5] border-t border-stone-300/50 shrink-0">
                {/* Quick reply buttons from LAST bot message — pinned above input */}
                {activeButtons && mode === "manual" && (
                  <div className="px-2 pt-2 pb-1 flex flex-wrap gap-1.5">
                    {activeButtons.map((btn, bi) => (
                      <button
                        key={bi}
                        onClick={() => handleButtonClick(btn)}
                        disabled={selectedButtons.has(btn) || inputDisabled}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white text-[#00A884] border border-[#00A884]/30 rounded-full text-[11px] font-semibold hover:bg-emerald-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-default shadow-xs"
                      >
                        <ChevronUp className="h-3 w-3" />
                        {btn}
                      </button>
                    ))}
                  </div>
                )}
                {activeList && mode === "manual" && (
                  <div className="px-2 pt-2 pb-1 flex flex-wrap gap-1.5">
                    {activeList.listRows!.map((row, ri) => (
                      <button
                        key={ri}
                        onClick={() => handleButtonClick(row.title)}
                        disabled={selectedButtons.has(row.title) || inputDisabled}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white text-[#00A884] border border-[#00A884]/30 rounded-full text-[11px] font-semibold hover:bg-emerald-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-default shadow-xs"
                      >
                        <ChevronUp className="h-3 w-3" />
                        {row.title}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 px-2 py-2">
                  {/* Emoji placeholder */}
                  <div className="text-stone-400 text-base px-1">😊</div>

                  {mode === "manual" ? (
                    <>
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isTyping || inputDisabled}
                        placeholder={isTyping ? "Bot is typing…" : inputDisabled ? "Wait…" : "Type a message…"}
                        className="flex-1 bg-white rounded-full px-3.5 py-2 text-xs text-stone-700 border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-400/40 placeholder:text-stone-400 disabled:opacity-60"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isTyping || inputDisabled}
                        className="w-9 h-9 rounded-full bg-[#00A884] text-white flex items-center justify-center shadow hover:bg-emerald-600 transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-[11px] text-stone-500 italic px-2">
                        {autoPlaying ? "Auto-playing flow…" : "Press Play to auto-demo →"}
                      </span>
                      <button
                        onClick={toggleAutoPlay}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${autoPlaying ? "bg-amber-500 text-white" : "bg-[#00A884] text-white hover:bg-emerald-600"}`}
                      >
                        {autoPlaying ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Play</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* iPhone home indicator */}
              <div className="bg-[#F0F2F5] py-2 flex justify-center shrink-0">
                <div className="w-20 h-1 bg-stone-400/50 rounded-full" />
              </div>
            </div>
          </div>

          {/* Template navigation */}
          {allTemplates && allTemplates.length > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 w-full max-w-[360px]">
              <button
                onClick={() => navigate("prev")}
                disabled={!canGoPrev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span className="text-[11px] text-stone-500 font-medium">{currentIndex + 1} / {allTemplates.length}</span>
              <button
                onClick={() => navigate("next")}
                disabled={!canGoNext}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs transition"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ─── RIGHT: Flow Architecture & CTAs ──────────────────────────────── */}
        <div className="lg:w-[420px] p-6 lg:p-7 flex flex-col justify-between overflow-y-auto bg-white space-y-6">
          <div className="space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl p-2 bg-stone-100 rounded-xl shadow-xs border border-stone-200">
                  {template.emoji}
                </span>
                <div>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border-emerald-200">
                    {template.category}
                  </Badge>
                  <h3 className="font-extrabold text-lg text-stone-900 leading-snug mt-1">{template.name}</h3>
                </div>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed mt-2">{template.description}</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Response Speed</p>
                <p className="text-sm font-black text-emerald-700 mt-0.5">&lt; 1 Second</p>
                <p className="text-[10.5px] text-stone-500 mt-0.5">24/7 instant replies</p>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Efficiency Gain</p>
                <p className="text-sm font-black text-stone-900 mt-0.5">Zero Code</p>
                <p className="text-[10.5px] text-stone-500 mt-0.5">Ready to deploy</p>
              </div>
            </div>

            {/* Flow specs */}
            <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Trigger Event:</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-[11px] text-stone-800">{template.trigger}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Total Flow Nodes:</span>
                <span className="font-bold text-stone-900">{Array.isArray(template.nodes) ? template.nodes.length : 4} Steps</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Channel Compatibility:</span>
                <span className="font-bold text-emerald-800">WhatsApp, Instagram, FB, Web</span>
              </div>
            </div>

            {/* Step architecture */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">Step-by-Step Architecture</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {(template.nodes as any[]).map((node, nIdx) => (
                  <div key={nIdx} className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 border border-stone-100 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">{nIdx + 1}</span>
                    <span className="font-bold text-stone-700 uppercase text-[10px]">{node.type || "STEP"}</span>
                    <span className="text-stone-500 truncate text-[11px]">
                      {node.data?.text ? String(node.data.text).slice(0, 32) + "…" : "Node configuration"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-2 pt-4 border-t border-stone-200">
            {onApply ? (
              <Button
                onClick={() => { onApply(template); onClose() }}
                className="w-full bg-[#00E785] hover:bg-[#00B96A] text-stone-950 font-bold rounded-xl h-11 text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                Load Flow into Bot Studio
              </Button>
            ) : (
              <Button asChild className="w-full bg-[#00E785] hover:bg-[#00B96A] text-stone-950 font-bold rounded-xl h-11 text-sm shadow-sm cursor-pointer">
                <a href={signupUrl || `/signup?template=${template.id}`}>
                  Use This Flow in Workspace
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { hardReset(); setTimeout(() => startDemo(), 100) }}
                className="flex-1 text-xs font-semibold h-9 rounded-xl text-stone-700 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Replay Demo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyTemplateJson}
                className="flex-1 text-xs font-semibold h-9 rounded-xl text-stone-700 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy JSON
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
