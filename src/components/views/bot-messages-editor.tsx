"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { MessageSquareText, RotateCcw, Save } from "lucide-react"

type Row = {
  key: string
  group: string
  label: string
  vars: string[]
  defaultEn: string
  defaultAr: string
  en: string
  ar: string
}

/**
 * What the bot says, editable by the business that owns it.
 *
 * Every field is empty by default and shows the built-in wording as its
 * placeholder, so "unset" and "set to the default text" stay distinguishable:
 * clearing a box restores the default rather than sending an empty message.
 */
export function BotMessagesEditor() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/bot-messages")
      const data = await res.json()
      setRows(Array.isArray(data.messages) ? data.messages : [])
    } catch {
      toast.error("Could not load the bot's messages")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const update = (key: string, lang: "en" | "ar", value: string) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, [lang]: value } : r)))

  const save = async () => {
    setSaving(true)
    try {
      const messages: Record<string, { en?: string; ar?: string }> = {}
      for (const r of rows) messages[r.key] = { en: r.en, ar: r.ar }
      const res = await fetch("/api/bot-messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not save")
      toast.success("Saved — the next customer sees the new wording")
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton className="h-96 rounded-xl" />

  const groups = [...new Set(rows.map(r => r.group))]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-stone-900 flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-emerald-600" /> What the bot says
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Leave a box empty to keep the built-in wording shown in grey. Changes apply to the next conversation.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
          <Save className="h-4 w-4 mr-1.5" />{saving ? "Saving…" : "Save messages"}
        </Button>
      </div>

      {groups.map(group => (
        <Card key={group}>
          <CardHeader className="pb-3"><CardTitle className="text-sm">{group}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {rows.filter(r => r.group === group).map(r => (
              <div key={r.key} className="rounded-xl border border-stone-200 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-stone-700">{r.label}</span>
                  <div className="flex items-center gap-1.5">
                    {r.vars.map(v => (
                      <Badge key={v} variant="outline" className="font-mono text-[10px]">{`{${v}}`}</Badge>
                    ))}
                    {(r.en || r.ar) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] text-stone-500"
                        onClick={() => { update(r.key, "en", ""); update(r.key, "ar", "") }}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />Reset
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <textarea
                    value={r.en}
                    onChange={e => update(r.key, "en", e.target.value)}
                    placeholder={r.defaultEn}
                    rows={Math.min(6, Math.max(2, r.defaultEn.split("\n").length))}
                    className="w-full rounded-lg border border-stone-200 bg-white p-2 text-xs text-stone-800 placeholder:text-stone-400"
                  />
                  <textarea
                    value={r.ar}
                    onChange={e => update(r.key, "ar", e.target.value)}
                    placeholder={r.defaultAr}
                    dir="rtl"
                    rows={Math.min(6, Math.max(2, r.defaultAr.split("\n").length))}
                    className="w-full rounded-lg border border-stone-200 bg-white p-2 text-xs text-stone-800 placeholder:text-stone-400"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
