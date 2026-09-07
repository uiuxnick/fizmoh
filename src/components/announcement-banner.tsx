"use client"

import { useEffect, useState } from "react"
import { Megaphone, AlertTriangle, Info, Wrench, Sparkles, X } from "lucide-react"

interface Announcement {
  id: string
  title: string
  body: string
  type: string
  publishedAt: string
}

const TYPE_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  INFO: {
    bg: "bg-blue-600",
    text: "text-white",
    icon: <Info className="h-4 w-4 shrink-0 text-white" />,
  },
  WARNING: {
    bg: "bg-amber-500",
    text: "text-amber-950",
    icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-950" />,
  },
  MAINTENANCE: {
    bg: "bg-stone-800",
    text: "text-stone-100",
    icon: <Wrench className="h-4 w-4 shrink-0 text-stone-200" />,
  },
  FEATURE: {
    bg: "bg-emerald-600",
    text: "text-white",
    icon: <Sparkles className="h-4 w-4 shrink-0 text-white" />,
  },
}

export function PlatformAnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/announcements/active")
      .then(r => r.json())
      .then(d => {
        if (d.announcements && Array.isArray(d.announcements)) {
          setAnnouncements(d.announcements)
        }
      })
      .catch(() => {})
  }, [])

  const active = announcements.filter(a => !dismissed.has(a.id))
  if (active.length === 0) return null

  const current = active[0]
  const style = TYPE_STYLES[current.type] || TYPE_STYLES.INFO

  return (
    <div className={`${style.bg} ${style.text} px-4 py-2 flex items-center justify-between gap-3 text-xs shadow-xs transition-all`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {style.icon}
        <span className="font-bold tracking-tight">{current.title}:</span>
        <span className="truncate opacity-95">{current.body}</span>
      </div>
      <button
        onClick={() => setDismissed(prev => new Set(prev).add(current.id))}
        className="shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
        title="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
