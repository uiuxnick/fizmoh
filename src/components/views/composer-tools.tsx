"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import {
  Paperclip, MapPin, Image as ImageIcon, FileText, Mic, Camera, X, Loader2, Square,
} from "lucide-react"

export type Attachment =
  | { kind: "media"; type: "image" | "document" | "video" | "audio"; url: string; filename?: string; preview?: string }
  | { kind: "location"; latitude: number; longitude: number; name?: string }

async function upload(file: File): Promise<{ url: string; category: string; filename: string } | null> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch("/api/media/upload", { method: "POST", body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    toast.error(data.error || "Upload failed")
    return null
  }
  return data
}

/**
 * Attach a file, take a photo, record a voice note, or share a location.
 *
 * This previously asked the agent to paste a public URL, which meant nothing on
 * their own device could be sent. Files are uploaded to the server, which then
 * hands WhatsApp a link it can fetch.
 */
export function ComposerAttachments({ onAttach }: { onAttach: (attachment: Attachment) => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const stored = await upload(file)
      if (!stored) return
      onAttach({
        kind: "media",
        type: stored.category as "image" | "document" | "video" | "audio",
        url: stored.url,
        filename: stored.filename,
        preview: stored.category === "image" ? stored.url : undefined,
      })
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const shareLocation = () => {
    if (!navigator.geolocation) { toast.error("This browser cannot share a location"); return }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      position => {
        setBusy(false)
        onAttach({
          kind: "location",
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          name: "Current location",
        })
        setOpen(false)
      },
      error => {
        setBusy(false)
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied"
            : "Could not get your location",
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <>
      {/* accept + capture let the phone offer camera, gallery and files directly */}
      <input ref={galleryInput} type="file" accept="image/*,video/*" hidden onChange={e => handleFiles(e.target.files)} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={e => handleFiles(e.target.files)} />
      <input ref={fileInput} type="file" hidden onChange={e => handleFiles(e.target.files)} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Attach">
            {busy ? <Loader2 className="h-4 w-4 animate-spin text-stone-500" /> : <Paperclip className="h-4 w-4 text-stone-500" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "Photo or video", icon: ImageIcon, action: () => galleryInput.current?.click() },
              { label: "Camera", icon: Camera, action: () => cameraInput.current?.click() },
              { label: "Document", icon: FileText, action: () => fileInput.current?.click() },
              { label: "Location", icon: MapPin, action: shareLocation },
            ].map(item => (
              <button
                key={item.label}
                disabled={busy}
                onClick={item.action}
                className="flex flex-col items-center gap-1 py-3 rounded-lg bg-stone-50 hover:bg-stone-100 disabled:opacity-50"
              >
                <item.icon className="h-4 w-4 text-emerald-600" />
                <span className="text-[10px] text-stone-600 text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-stone-400 mt-2 px-1">Up to 16 MB, in a format WhatsApp accepts.</p>
        </PopoverContent>
      </Popover>
    </>
  )
}

/** Records a voice note in the browser and uploads it. */
export function VoiceRecorder({ onRecorded }: { onRecorded: (attachment: Attachment) => void }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [busy, setBusy] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [recording])

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Chrome and Firefox produce webm/opus; Safari produces mp4. Both are
      // accepted by WhatsApp, so whatever the browser gives us is used.
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
      const rec = new MediaRecorder(stream, { mimeType: mime })
      chunks.current = []
      rec.ondataavailable = event => { if (event.data.size > 0) chunks.current.push(event.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        const blob = new Blob(chunks.current, { type: mime })
        if (blob.size === 0) { toast.error("Nothing was recorded"); return }
        setBusy(true)
        try {
          const file = new File([blob], `voice-note.${mime === "audio/webm" ? "webm" : "m4a"}`, { type: mime })
          const stored = await upload(file)
          if (stored) onRecorded({ kind: "media", type: "audio", url: stored.url, filename: stored.filename })
        } finally {
          setBusy(false)
        }
      }
      rec.start()
      recorder.current = rec
      setSeconds(0)
      setRecording(true)
    } catch {
      toast.error("Microphone permission was denied")
    }
  }

  const stop = () => {
    recorder.current?.stop()
    recorder.current = null
    setRecording(false)
  }

  if (recording) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-rose-600" onClick={stop} title="Stop and attach">
        <Square className="h-3.5 w-3.5 fill-rose-600" />
        <span className="sr-only">{seconds}s</span>
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={start} disabled={busy} title="Record a voice note">
      {busy ? <Loader2 className="h-4 w-4 animate-spin text-stone-500" /> : <Mic className="h-4 w-4 text-stone-500" />}
    </Button>
  )
}

export function AttachmentChip({ attachment, onClear }: { attachment: Attachment; onClear: () => void }) {
  return (
    <Card className="flex items-center gap-2 px-2 py-1.5 mb-2 bg-stone-50">
      {attachment.kind === "media" && attachment.preview ? (
        <img src={attachment.preview} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
      ) : attachment.kind === "location" ? (
        <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
      ) : (
        <Paperclip className="h-4 w-4 text-emerald-600 shrink-0" />
      )}
      <span className="text-xs text-stone-600 truncate flex-1">
        {attachment.kind === "location"
          ? `${attachment.name || "Location"} · ${attachment.latitude}, ${attachment.longitude}`
          : `${attachment.filename || attachment.type}`}
      </span>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClear}><X className="h-3 w-3" /></Button>
    </Card>
  )
}

/** Renders whatever a message carries: image, document, voice note or place. */
export function MessageMedia({ url, type, outgoing }: { url: string; type: string; outgoing: boolean }) {
  const [broken, setBroken] = useState(false)
  const kind = (type || "IMAGE").toUpperCase()

  let cleanUrl = String(url || "").trim()
  if (!cleanUrl) {
    return <div className={`text-[11px] ${outgoing ? "text-emerald-100" : "text-stone-400"}`}>Attachment unavailable</div>
  }

  // Normalize relative paths and direct filenames to valid media URLs
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://") && !cleanUrl.startsWith("data:") && !cleanUrl.startsWith("/")) {
    if (cleanUrl.startsWith("api/media/")) {
      cleanUrl = "/" + cleanUrl
    } else if (/^[a-f0-9-]{36}\.[a-z0-9]{1,5}$/i.test(cleanUrl)) {
      cleanUrl = `/api/media/${cleanUrl}`
    } else {
      cleanUrl = "/" + cleanUrl
    }
  }

  if (broken) {
    return <div className={`text-[11px] ${outgoing ? "text-emerald-100" : "text-stone-400"}`}>Attachment unavailable</div>
  }

  if (kind === "IMAGE" || kind === "STICKER" || /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(cleanUrl)) {
    return (
      <a href={cleanUrl} target="_blank" rel="noreferrer" className="block cursor-pointer">
        <img
          src={cleanUrl}
          alt="Attachment"
          onError={() => setBroken(true)}
          className="rounded-lg max-h-60 max-w-[260px] w-auto object-cover bg-black/10 hover:opacity-95 transition"
          loading="lazy"
        />
      </a>
    )
  }

  if (kind === "AUDIO" || kind === "VOICE" || /\.(mp3|ogg|wav|m4a|aac)($|\?)/i.test(cleanUrl)) {
    return <audio controls src={cleanUrl} className="max-w-[13rem] h-9" onError={() => setBroken(true)} />
  }

  if (kind === "VIDEO" || /\.(mp4|webm|mov|3gp)($|\?)/i.test(cleanUrl)) {
    return <video controls src={cleanUrl} className="rounded-lg max-h-56 max-w-[240px]" onError={() => setBroken(true)} />
  }

  return (
    <a
      href={cleanUrl}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-1.5 text-xs underline ${outgoing ? "text-emerald-50" : "text-emerald-700"}`}
    >
      <FileText className="h-3.5 w-3.5" />Open attachment
    </a>
  )
}
