"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Send,
  MessageCircle,
  ShieldCheck,
  Bot,
  Zap,
  ArrowRight,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export function TelegramResourceView() {
  const [copied, setCopied] = useState(false)
  const webhookCode = `{
  "update_id": 982145021,
  "message": {
    "message_id": 482,
    "from": {
      "id": 84729103,
      "first_name": "Hamad",
      "username": "hamad_om"
    },
    "chat": {
      "id": -1002948192,
      "title": "VIP Traders Muscat",
      "type": "supergroup"
    },
    "date": 1727448000,
    "text": "/balance"
  }
}`

  const copySnippet = () => {
    navigator.clipboard.writeText(webhookCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-10 space-y-12">
      {/* Visual Comparison Matrix */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400 mb-3">
          <Send className="h-3.5 w-3.5" />
          GCC Messaging Channel Architecture
        </div>
        <h3 className="text-2xl font-bold tracking-tight mb-2">
          WhatsApp Business Cloud vs. Telegram Bot API
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Understanding the right channel for high-conversion commercial operations in Oman and the GCC.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Evaluation Criteria</th>
                <th className="py-3 px-4 text-emerald-600">WhatsApp Business API</th>
                <th className="py-3 px-4 text-sky-600">Telegram Bot API</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-foreground">GCC Consumer Penetration</td>
                <td className="py-3.5 px-4 text-emerald-600 font-bold">96%+ of all smartphone users in Oman</td>
                <td className="py-3.5 px-4 text-muted-foreground">Specialized (Crypto, Gaming, Tech communities)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-foreground">Official Business Identity</td>
                <td className="py-3.5 px-4 text-emerald-600 font-bold">Meta Green Tick + Verified Landline (+968)</td>
                <td className="py-3.5 px-4 text-muted-foreground">Bot username handle (@botname)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-foreground">Payment Acceptance (OMR)</td>
                <td className="py-3.5 px-4 text-emerald-600 font-bold">Direct AmwalPay / Apple Pay integration</td>
                <td className="py-3.5 px-4 text-muted-foreground">Telegram Stars or third-party crypto/Stripe</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-foreground">Marketing Broadcasts</td>
                <td className="py-3.5 px-4 text-emerald-600 font-bold">High open rate (98%), Meta template compliance</td>
                <td className="py-3.5 px-4 text-muted-foreground">Channel broadcasts (Subject to muted channels)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-foreground">Fizmoh Support Status</td>
                <td className="py-3.5 px-4 text-emerald-600 font-bold">Native First-Class Channel</td>
                <td className="py-3.5 px-4 text-amber-600 font-medium">Enterprise Custom Webhook Bridge</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook Bridge Interactive Playground */}
      <div className="rounded-3xl border border-border bg-slate-950 text-white p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-sky-400" />
              <h4 className="font-bold text-base text-white">Custom Telegram Webhook Dispatcher</h4>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Route incoming Telegram bot updates through Fizmoh webhook processors.
            </p>
          </div>

          <button
            onClick={copySnippet}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied JSON" : "Copy Payload"}
          </button>
        </div>

        <pre className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-sky-300 overflow-x-auto">
          <code>{webhookCode}</code>
        </pre>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800 text-xs">
          <span className="text-slate-400">
            Need an enterprise Telegram-to-WhatsApp omnichannel sync?
          </span>
          <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer" asChild>
            <Link href="/book-demo">Request Custom Bridge Setup</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
