"use client"

import { useState, useEffect, useMemo } from "react"
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
  Sparkles,
  ArrowRight,
  Copy,
  Zap,
  Bot,
  ExternalLink,
  ShieldCheck,
  Layers,
  MessageSquare,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"

interface VisualDemoProps {
  template: FlowTemplate
  isOpen: boolean
  onClose: () => void
  onApply?: (template: FlowTemplate) => void
  signupUrl?: string
  /** Full list of templates to enable prev/next browsing inside the modal */
  allTemplates?: FlowTemplate[]
  /** Index of `template` within `allTemplates` */
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
  mediaUrl?: string
  timestamp: string
}

/** Formats WhatsApp markdown (*bold*, _italic_, ~strike~) */
function formatWhatsApp(text: string): string {
  if (!text) return ""
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/~([^~]+)~/g, "<del>$1</del>")
    .replace(/\n/g, "<br/>")
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
  // Conversational sequence state
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  const canGoPrev = allTemplates && currentIndex > 0
  const canGoNext = allTemplates && currentIndex < allTemplates.length - 1

  const navigate = (dir: "prev" | "next") => {
    if (!allTemplates || !onNavigate) return
    const nextIdx = dir === "prev" ? currentIndex - 1 : currentIndex + 1
    if (nextIdx < 0 || nextIdx >= allTemplates.length) return
    setMessages([])
    setSelectedOptions([])
    setStepIndex(0)
    onNavigate(allTemplates[nextIdx], nextIdx)
  }

  // Parse template nodes into a conversational script
  const conversationScript = useMemo(() => {
    const rawNodes = (template.nodes || []) as any[]
    const script: DemoMessage[] = []

    // 1. Initial Customer Trigger
    let triggerKeyword = "Hello! 👋"
    if (template.triggerConfig?.keywords && Array.isArray(template.triggerConfig.keywords) && template.triggerConfig.keywords.length > 0) {
      triggerKeyword = String(template.triggerConfig.keywords[0])
    }
    script.push({
      id: "trig-customer-0",
      sender: "customer",
      text: triggerKeyword,
      timestamp: "10:30 AM",
    })

    // 2. Map Bot responses from nodes
    rawNodes.forEach((node, i) => {
      if (node.type === "TRIGGER") return

      let text = ""
      let buttons: string[] | undefined
      let listButton: string | undefined
      let listRows: any[] | undefined

      if (node.type === "SEND_TEXT") {
        text = String(node.data?.text || "")
      } else if (node.type === "QUICK_REPLY") {
        text = String(node.data?.text || "Please choose one of the options below:")
        if (Array.isArray(node.data?.buttons)) {
          buttons = node.data.buttons
        }
      } else if (node.type === "LIST") {
        text = String(node.data?.text || "Select an option from the menu:")
        listButton = node.data?.listButton || "View Menu"
        if (Array.isArray(node.data?.rows)) {
          listRows = node.data.rows
        }
      } else if (node.type === "QUESTION") {
        text = String(node.data?.text || "Please reply with your details:")
      } else if (node.type === "AI") {
        text = "🤖 *AI Intelligent Assistant*\n" + (node.data?.instruction || "I'm ready to answer any questions about our products, services, and policies.")
      } else if (node.type === "HANDOFF") {
        text = "👨‍💼 *Live Specialist Handover*\nConnecting you with a senior specialist now. Estimated wait time: < 1 minute."
      }

      if (text.trim()) {
        const min = 31 + i
        const timeStr = `10:${min < 10 ? "0" + min : min} AM`
        script.push({
          id: `bot-node-${node.id || i}`,
          sender: "bot",
          text,
          buttons,
          listButton,
          listRows,
          timestamp: timeStr,
        })
      }
    })

    return script
  }, [template])

  // Reset conversation to initial trigger + first bot reply
  const resetDemo = () => {
    setSelectedOptions([])
    if (conversationScript.length === 0) return

    const initialCustomerMsg = conversationScript[0]
    const initialBotMsg = conversationScript[1]

    setMessages([initialCustomerMsg])
    setStepIndex(1)
    setIsTyping(true)

    setTimeout(() => {
      if (initialBotMsg) {
        setMessages([initialCustomerMsg, initialBotMsg])
        setStepIndex(2)
      }
      setIsTyping(false)
    }, 400)
  }

  // Load initial messages on open
  useEffect(() => {
    if (isOpen) {
      resetDemo()
    }
  }, [isOpen, conversationScript])

  // Handle clicking interactive buttons inside WhatsApp phone
  const handleButtonClick = (buttonText: string) => {
    if (isTyping) return
    setSelectedOptions((prev) => [...prev, buttonText])

    // 1. Add customer selection bubble
    const customerReply: DemoMessage = {
      id: `customer-${Date.now()}`,
      sender: "customer",
      text: buttonText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, customerReply])
    setIsTyping(true)

    // 2. Simulate next bot response
    setTimeout(() => {
      setIsTyping(false)
      if (stepIndex < conversationScript.length) {
        const nextBotMsg = conversationScript[stepIndex]
        setMessages((prev) => [...prev, nextBotMsg])
        setStepIndex((prev) => prev + 1)
      } else {
        // Fallback confirmation when flow reaches the end
        const doneMsg: DemoMessage = {
          id: `bot-done-${Date.now()}`,
          sender: "bot",
          text: "✅ *Step Completed Successfully!*\nYour choice was processed by the bot flow automation engine. You can now load this template into your workspace.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
        setMessages((prev) => [...prev, doneMsg])
      }
    }, 500)
  }

  const copyTemplateJson = () => {
    navigator.clipboard.writeText(JSON.stringify(template, null, 2))
    toast.success("Template architecture JSON copied to clipboard")
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col lg:flex-row overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button top-right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-stone-400 hover:text-stone-700 p-2 rounded-full hover:bg-stone-100 transition cursor-pointer"
          title="Close preview"
        >
          <X className="h-5 w-5" />
        </button>

        {/* LEFT / CENTER: Authentic WhatsApp Phone Simulator */}
        <div className="flex-1 bg-stone-100 p-4 sm:p-6 lg:p-8 flex items-center justify-center overflow-y-auto border-b lg:border-b-0 lg:border-r border-stone-200">
          <div className="w-full max-w-[360px] bg-black rounded-[42px] p-3 shadow-2xl ring-1 ring-black/10">
            {/* Phone Screen Frame */}
            <div className="w-full bg-[#EFEAE2] rounded-[32px] overflow-hidden flex flex-col h-[600px] relative border border-stone-800/40">
              {/* WhatsApp Status Bar */}
              <div className="bg-[#075E54] text-white px-5 pt-2.5 pb-1 flex items-center justify-between text-[11px] font-semibold">
                <span>9:41</span>
                {/* Notch / Dynamic Island */}
                <div className="w-16 h-3 bg-black/40 rounded-full mx-auto" />
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* WhatsApp Chat App Header */}
              <div className="bg-[#075E54] text-white px-3 py-2 flex items-center justify-between shadow-xs">
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
                  <Video className="h-4 w-4 opacity-80 hover:opacity-100" />
                  <Phone className="h-4 w-4 opacity-80 hover:opacity-100" />
                  <MoreVertical className="h-4 w-4 opacity-80 hover:opacity-100" />
                </div>
              </div>

              {/* Live Chat Wallpaper Area */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#EFEAE2]">
                {/* Encryption Pill */}
                <div className="mx-auto max-w-[270px] bg-[#FFEECD] rounded-lg p-2 text-center shadow-2xs border border-[#F4E1B5]">
                  <p className="text-[10px] text-[#5E523A] leading-tight flex items-center justify-center gap-1">
                    <span>🔒</span>
                    <span>Messages and calls are end-to-end encrypted. No one outside of this chat can read them.</span>
                  </p>
                </div>

                {/* Date separator */}
                <div className="text-center">
                  <span className="bg-white/80 backdrop-blur-xs text-[#54656F] text-[10px] font-semibold px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-2xs">
                    Today
                  </span>
                </div>

                {/* Message Bubbles Stream */}
                {messages.map((msg) => {
                  const isBot = msg.sender === "bot"

                  return (
                    <div key={msg.id} className="space-y-1.5 animate-in fade-in-50 duration-200">
                      {/* Message Bubble Container */}
                      <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl p-2.5 text-xs shadow-xs relative ${
                            isBot
                              ? "bg-white text-stone-900 rounded-tl-none border border-stone-200/40"
                              : "bg-[#DCF8C6] text-stone-900 rounded-tr-none border border-[#c3f0a5]"
                          }`}
                        >
                          {/* Text Body */}
                          <div
                            className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed break-words"
                            dangerouslySetInnerHTML={{ __html: formatWhatsApp(msg.text) }}
                          />

                          {/* Time & Double Checkmark */}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-stone-400">
                            <span>{msg.timestamp}</span>
                            {isBot ? (
                              <CheckCheck className="h-3 w-3 text-sky-500" />
                            ) : (
                              <Check className="h-3 w-3 text-stone-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Interactive Quick Reply Buttons */}
                      {isBot && msg.buttons && msg.buttons.length > 0 && (
                        <div className="space-y-1 pl-1 max-w-[88%]">
                          {msg.buttons.map((btn, bIdx) => {
                            const isSelected = selectedOptions.includes(btn)
                            return (
                              <button
                                key={bIdx}
                                type="button"
                                onClick={() => handleButtonClick(btn)}
                                className={`w-full text-center py-2 px-3 rounded-xl text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700"
                                    : "bg-white text-[#00A884] hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200"
                                }`}
                              >
                                <span>🔘 {btn}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Interactive List Menu Rows */}
                      {isBot && msg.listRows && msg.listRows.length > 0 && (
                        <div className="space-y-1 pl-1 max-w-[88%]">
                          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden divide-y divide-stone-100 shadow-xs">
                            <div className="bg-stone-50 px-3 py-1.5 text-[11px] font-bold text-stone-600 flex items-center gap-1">
                              <span>📋</span>
                              <span>{msg.listButton || "Menu Options"}</span>
                            </div>
                            {msg.listRows.map((row, rIdx) => {
                              const isSelected = selectedOptions.includes(row.title)
                              return (
                                <button
                                  key={rIdx}
                                  type="button"
                                  onClick={() => handleButtonClick(row.title)}
                                  className={`w-full text-left p-2.5 transition flex flex-col gap-0.5 cursor-pointer ${
                                    isSelected
                                      ? "bg-emerald-50 text-emerald-950 font-bold"
                                      : "hover:bg-stone-50 text-stone-800"
                                  }`}
                                >
                                  <span className="text-xs font-semibold">{row.title}</span>
                                  {row.description && (
                                    <span className="text-[10px] text-stone-500 leading-tight">
                                      {row.description}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Animated Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-xs border border-stone-200/50 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar (Read-only simulation) */}
              <div className="bg-stone-100 p-2 border-t border-stone-200 flex items-center justify-between gap-2">
                <div className="flex-1 bg-white rounded-full px-3.5 py-1.5 text-xs text-stone-400 border border-stone-200">
                  Tap buttons above to test flow…
                </div>
                <button
                  onClick={resetDemo}
                  className="p-1.5 rounded-full bg-white hover:bg-stone-200 text-stone-600 border border-stone-200 shadow-xs cursor-pointer"
                  title="Restart Live Demo"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              {/* iPhone Home Indicator */}
              <div className="bg-stone-100 py-2 flex justify-center">
                <div className="w-20 h-1 bg-stone-400/50 rounded-full" />
              </div>
            </div>
          </div>

          {/* Template Navigation Controls */}
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
              <span className="text-[11px] text-stone-500 font-medium">
                {currentIndex + 1} / {allTemplates.length}
              </span>
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

        {/* RIGHT: Flow Architecture, KPIs & 1-Click Install CTA */}
        <div className="lg:w-[420px] p-6 lg:p-7 flex flex-col justify-between overflow-y-auto bg-white space-y-6">
          <div className="space-y-5">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl p-2 bg-stone-100 rounded-xl shadow-xs border border-stone-200">
                  {template.emoji}
                </span>
                <div>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border-emerald-200">
                    {template.category}
                  </Badge>
                  <h3 className="font-extrabold text-lg text-stone-900 leading-snug mt-1">
                    {template.name}
                  </h3>
                </div>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed mt-2">
                {template.description}
              </p>
            </div>

            {/* Key Business Value Indicators */}
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

            {/* Flow Specifications Summary */}
            <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Trigger Event:</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border text-[11px] text-stone-800">
                  {template.trigger}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Total Flow Nodes:</span>
                <span className="font-bold text-stone-900">
                  {Array.isArray(template.nodes) ? template.nodes.length : 4} Steps
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Channel Compatibility:</span>
                <span className="font-bold text-emerald-800">WhatsApp, Instagram, FB, Web</span>
              </div>
            </div>

            {/* Step Sequence Timeline */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">
                Step-by-Step Architecture
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {(template.nodes as any[]).slice(0, 5).map((node, nIdx) => (
                  <div
                    key={nIdx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 border border-stone-100 text-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {nIdx + 1}
                    </span>
                    <span className="font-bold text-stone-700 uppercase text-[10px]">
                      {node.type || "STEP"}
                    </span>
                    <span className="text-stone-500 truncate text-[11px]">
                      {node.data?.text ? String(node.data.text).slice(0, 35) + "…" : "Node configuration"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-4 border-t border-stone-200">
            {onApply ? (
              <Button
                onClick={() => {
                  onApply(template)
                  onClose()
                }}
                className="w-full bg-[#00E785] hover:bg-[#00B96A] text-stone-950 font-bold rounded-xl h-11 text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                <span>Load Flow into Bot Studio</span>
              </Button>
            ) : (
              <Button
                asChild
                className="w-full bg-[#00E785] hover:bg-[#00B96A] text-stone-950 font-bold rounded-xl h-11 text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <a href={signupUrl || `/signup?template=${template.id}`}>
                  <span>Use This Flow in Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetDemo}
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
