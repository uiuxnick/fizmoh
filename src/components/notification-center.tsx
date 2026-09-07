"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { Bell, CheckCheck, PhoneCall, CreditCard, Ticket, Volume2, VolumeX, BellRing } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { timeAgo } from "@/lib/helpers"
import { useApp } from "@/lib/store"
import { useRealtime } from "@/lib/use-realtime"
import {
  playAlert, startRinging, stopRinging, readSoundPreference, writeSoundPreference,
  type SoundPreference,
} from "@/lib/ringtone"

interface Notification {
  id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string
  data?: string | Record<string, unknown> | null
}

/** Notifications carry the id of whatever they are about, as JSON. */
function targetOf(notification: Notification): { kind: "order" | "conversation"; id: string } | null {
  const raw = notification.data
  const parsed = typeof raw === "string" ? (() => { try { return JSON.parse(raw) } catch { return null } })() : raw
  if (!parsed || typeof parsed !== "object") return null
  const data = parsed as Record<string, unknown>
  if (typeof data.orderId === "string") return { kind: "order", id: data.orderId }
  if (typeof data.conversationId === "string") return { kind: "conversation", id: data.conversationId }
  return null
}

const TYPE_ICONS: Record<string, any> = {
  NEW_BOOKING: Ticket,
  PAYMENT_SUBMITTED: CreditCard,
  PAYMENT_APPROVED: CreditCard,
  NEW_MESSAGE: WhatsAppIcon,
  INCOMING_CALL: PhoneCall,
}

export function NotificationCenter() {
  const { setView, setFocus } = useApp()
  const [items, setItems] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [live, setLive] = useState(false)
  const [sound, setSound] = useState<SoundPreference>(() => readSoundPreference())
  const [ringing, setRinging] = useState(false)
  const [, setPermission] = useState<string>("default")

  const alert = useCallback((kind: "message" | "call" | "notification") => {
    if (!sound.enabled) return
    // A single chime is easy to miss. An unanswered customer message keeps
    // ringing until an agent acknowledges it.
    if (sound.repeat && kind !== "notification") {
      setRinging(true)
      startRinging(kind, sound.volume)
    } else {
      playAlert(kind, sound.volume)
    }
  }, [sound])

  const silence = useCallback(() => { stopRinging(); setRinging(false) }, [])

  // Opening the inbox or the panel means the alert has been seen.
  useEffect(() => {
    if (!ringing) return
    const onActivity = () => silence()
    window.addEventListener("focus", onActivity)
    document.addEventListener("visibilitychange", onActivity)
    return () => {
      window.removeEventListener("focus", onActivity)
      document.removeEventListener("visibilitychange", onActivity)
    }
  }, [ringing, silence])

  const load = useCallback(() => {
    fetch("/api/notifications")
      .then(r => r.json())
      .then(d => setItems(d.notifications || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    // Backstop only: the stream carries the live updates.
    const timer = setInterval(load, 120_000)
    return () => clearInterval(timer)
  }, [load])

  const unread = items.filter(n => !n.isRead).length

  // The tab title carries the count so an agent working in another tab can see
  // that something arrived without switching to this one.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "")
    document.title = unread > 0 ? `(${unread}) ${base}` : base
  }, [unread])

  useRealtime(event => {
    setLive(true)
    if (event.type === "message" && event.direction === "INBOUND") {
      alert("message")
      toast.message("New WhatsApp message", {
        description: event.preview,
        action: { label: "Open inbox", onClick: () => setView("inbox") },
      })
      notifyOnDesktop("New WhatsApp message", event.preview)
    }
    if (event.type === "notification") {
      alert("notification")
      toast.message(event.title, { description: event.message })
      notifyOnDesktop(event.title, event.message)
    }
    if (event.type === "call") {
      alert("call")
      toast.message(`Call ${event.status.toLowerCase()}`, {
        action: { label: "Open inbox", onClick: () => setView("inbox") },
      })
    }
    load()
  })

  const markAll = async () => {
    setItems(prev => prev.map(n => ({ ...n, isRead: true })))
    await fetch("/api/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }),
    }).catch(() => {})
  }

  const markOne = async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)))
    await fetch("/api/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title={live ? "Live" : "Connecting…"}
          onClick={silence}
        >
          {ringing
            ? <BellRing className="h-5 w-5 text-rose-500 animate-pulse" />
            : <Bell className="h-5 w-5 text-stone-500" />}
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[22rem] p-0 overflow-hidden flex flex-col max-h-[min(30rem,calc(100vh-6rem))]">
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0 bg-white">
          <div className="text-sm font-semibold">Notifications</div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={sound.enabled ? "Mute alerts" : "Unmute alerts"}
              onClick={() => {
                const next = { ...sound, enabled: !sound.enabled }
                setSound(next)
                writeSoundPreference(next)
                if (!next.enabled) silence()
                else playAlert("notification", next.volume)
              }}
            >
              {sound.enabled ? <Volume2 className="h-3.5 w-3.5 text-stone-500" /> : <VolumeX className="h-3.5 w-3.5 text-stone-400" />}
            </Button>
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAll}>
                <CheckCheck className="h-3.5 w-3.5 mr-1" />Mark all read
              </Button>
            )}
          </div>
        </div>
        {typeof Notification !== "undefined" && Notification.permission === "default" && (
          <button
            onClick={() => Notification.requestPermission().then(() => setPermission(Notification.permission))}
            className="w-full px-3 py-2 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 text-left"
          >
            Turn on desktop alerts →
          </button>
        )}
        {typeof Notification !== "undefined" && Notification.permission === "denied" && (
          <div className="px-3 py-2 bg-stone-50 text-[11px] text-stone-500">
            Desktop alerts are blocked for this site. Re-enable them in the browser's site settings.
          </div>
        )}
        {ringing && (
          <button onClick={silence} className="w-full px-3 py-2 bg-rose-50 text-rose-700 text-xs font-medium hover:bg-rose-100">
            Ringing — click to silence
          </button>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-stone-400">Nothing yet.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {items.map(n => {
                const Icon = TYPE_ICONS[n.type] || Bell
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      markOne(n.id)
                      const target = targetOf(n)
                      if (target?.kind === "order") { setFocus(target); setView("bookings") }
                      else if (target?.kind === "conversation") { setFocus(target); setView("inbox") }
                      else if (n.type === "NEW_MESSAGE") setView("inbox")
                      else return
                      setOpen(false)
                    }}
                    className={`w-full flex gap-2 px-3 py-2.5 text-left hover:bg-stone-50 ${n.isRead ? "" : "bg-emerald-50/60"}`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${n.isRead ? "text-stone-300" : "text-emerald-600"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-stone-800 truncate">{n.title}</div>
                      <div className="text-[11px] text-stone-500 line-clamp-2 break-words">{n.message}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.isRead && <Badge className="h-1.5 w-1.5 p-0 rounded-full bg-emerald-500 shrink-0 mt-1.5" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Desktop notification for when the tab is in the background. Permission is
 * requested on the first event rather than at load, so the browser prompt
 * follows something the user can connect it to.
 */
function notifyOnDesktop(title: string, body: string) {
  // Shown whenever permission has been granted, not only when the tab is
  // hidden: an agent with the panel open behind another window still needs the
  // desktop alert, and the browser suppresses duplicates for a focused tab
  // itself.
  if (typeof Notification === "undefined") return
  const show = () => {
    try {
      new Notification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        // Replaces the previous alert rather than stacking one per message.
        tag: "wptour-alert",
        renotify: true,
      } as NotificationOptions & { renotify: boolean })
    } catch {
      /* denied or unsupported */
    }
  }
  if (Notification.permission === "granted") show()
  else if (Notification.permission === "default") Notification.requestPermission().then(p => { if (p === "granted") show() })
}
