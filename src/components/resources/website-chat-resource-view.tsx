"use client"

import { useState } from "react"
import Link from "next/link"
import {
  MessageSquare,
  MessageCircle,
  Copy,
  Check,
  Sparkles,
  Bot,
  ExternalLink,
  Code2,
  ShieldCheck,
  Smartphone,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export function WebsiteChatResourceView() {
  const [color, setColor] = useState("#059669") // emerald-600
  const [title, setTitle] = useState("Chat with Fizmoh")
  const [subtitle, setSubtitle] = useState("Typically replies in under 1 minute")
  const [whatsappEnabled, setWhatsappEnabled] = useState(true)
  const [copied, setCopied] = useState(false)

  const embedScript = `<!-- Fizmoh Omnichannel Website Chat Widget -->
<script
  src="https://app.fizmoh.cloud/widget.js"
  data-workspace-id="ws_live_oman_prod"
  data-theme-color="${color}"
  data-whatsapp-enabled="${whatsappEnabled}"
  async>
</script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(embedScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const colors = [
    { name: "Emerald", hex: "#059669" },
    { name: "Indigo", hex: "#4f46e5" },
    { name: "Violet", hex: "#7c3aed" },
    { name: "Rose", hex: "#e11d48" },
    { name: "Slate", hex: "#0f172a" },
  ]

  return (
    <div className="mt-10 space-y-12">
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          Live Widget Studio & Embed Generator
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          Customize Your Website Chat Widget
        </h3>
        <p className="text-sm text-muted-foreground max-w-2xl mb-8">
          Preview changes in real time. Visitors can chat directly via web AI or handoff seamlessly to WhatsApp with their full context preserved.
        </p>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Controls */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Brand Accent Color
              </label>
              <div className="flex gap-3">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setColor(c.hex)}
                    className={`h-10 w-10 rounded-full border-2 transition-all cursor-pointer ${
                      color === c.hex ? "scale-110 border-foreground ring-2 ring-emerald-500/50 shadow-md" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    aria-label={`Select ${c.name} theme`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Header Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Subheadline
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsappEnabled}
                  onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-xs font-medium text-foreground">
                  Include Direct "Continue on WhatsApp" Button
                </span>
              </label>
            </div>

            {/* Embed Snippet Code Block */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono text-muted-foreground">HTML Embed Code</span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied to Clipboard" : "Copy Embed Script"}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto border border-border">
                <code>{embedScript}</code>
              </pre>
            </div>
          </div>

          {/* Live Mockup */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-xs rounded-3xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
              {/* Widget Header */}
              <div
                className="p-4 text-white flex items-center justify-between transition-colors"
                style={{ backgroundColor: color }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-xs">
                    FZ
                  </div>
                  <div>
                    <h5 className="font-bold text-xs leading-none">{title}</h5>
                    <span className="text-[10px] text-white/80 leading-none mt-1 block">{subtitle}</span>
                  </div>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              </div>

              {/* Chat Body */}
              <div className="p-4 bg-muted/20 space-y-3 min-h-[220px] text-xs">
                <div className="p-3 rounded-2xl rounded-tl-sm bg-card border border-border text-foreground">
                  <p>Marhaban! How can our team assist you today?</p>
                  <span className="text-[9px] text-muted-foreground block mt-1">Just now</span>
                </div>

                {whatsappEnabled && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    <p className="text-[11px] font-semibold mb-2 flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                      Prefer WhatsApp?
                    </p>
                    <button className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shadow-xs flex items-center justify-center gap-1 cursor-pointer">
                      <span>Chat on WhatsApp</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-border bg-card flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 text-xs p-1.5 bg-transparent border-0 focus:outline-hidden"
                  readOnly
                />
                <button
                  className="p-1.5 rounded-lg text-white"
                  style={{ backgroundColor: color }}
                  aria-label="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
