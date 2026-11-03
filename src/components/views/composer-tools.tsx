"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import {
  Paperclip, MapPin, Image as ImageIcon, FileText, Mic, Camera, X, Loader2, Square, Volume2, Sparkles,
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

/** Records a voice note in the browser with live visualizer, duration timer, and cancel option. */
export function VoiceRecorder({ onRecorded }: { onRecorded: (attachment: Attachment) => void }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [busy, setBusy] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [recording])

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      // Chrome and Firefox produce webm/opus; Safari produces mp4. Both are
      // accepted by WhatsApp, so whatever the browser gives us is used.
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
      const rec = new MediaRecorder(stream, { mimeType: mime })
      chunks.current = []
      rec.ondataavailable = event => { if (event.data.size > 0) chunks.current.push(event.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        // If aborted/cancelled, chunks will be emptied
        if (chunks.current.length === 0) return
        const blob = new Blob(chunks.current, { type: mime })
        if (blob.size === 0) { toast.error("Nothing was recorded"); return }
        setBusy(true)
        try {
          const file = new File([blob], `voice-note.${mime === "audio/webm" ? "webm" : "m4a"}`, { type: mime })
          const stored = await upload(file)
          if (stored) {
            onRecorded({ kind: "media", type: "audio", url: stored.url, filename: stored.filename })
            toast.success("Voice note attached")
          }
        } finally {
          setBusy(false)
        }
      }
      rec.start(250)
      recorder.current = rec
      setSeconds(0)
      setRecording(true)
    } catch {
      toast.error("Microphone permission was denied")
    }
  }

  const stop = () => {
    if (recorder.current && recorder.current.state !== "inactive") {
      recorder.current.stop()
    }
    recorder.current = null
    setRecording(false)
  }

  const cancel = () => {
    chunks.current = [] // Clear chunks so onstop does not upload
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (recorder.current && recorder.current.state !== "inactive") {
      recorder.current.stop()
    }
    recorder.current = null
    setRecording(false)
    setSeconds(0)
    toast.info("Recording discarded")
  }

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  if (busy) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
        <span className="font-medium text-[11px]">Saving voice note...</span>
      </div>
    )
  }

  if (recording) {
    return (
      <div className="flex items-center gap-1.5 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl px-2 py-1 shadow-xs animate-in fade-in duration-200">
        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-mono text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
          </span>
          <span>{formatDuration(seconds)}</span>
        </div>

        {/* Live Animated Audio Wave Bars */}
        <div className="flex items-center gap-0.5 h-4 px-1">
          {[40, 75, 30, 90, 60, 100, 45, 80, 50, 70].map((h, i) => (
            <span
              key={i}
              className="w-0.5 bg-rose-500 rounded-full animate-pulse"
              style={{
                height: `${h}%`,
                animationDelay: `${(i * 120) % 600}ms`,
                animationDuration: "800ms",
              }}
            />
          ))}
        </div>

        {/* Discard / Cancel button */}
        <button
          type="button"
          onClick={cancel}
          className="h-6 w-6 rounded-lg text-stone-500 hover:text-rose-700 hover:bg-rose-100/60 flex items-center justify-center transition-colors"
          title="Cancel recording"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Stop and Attach button */}
        <Button
          type="button"
          size="sm"
          onClick={stop}
          className="h-6 px-2 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs gap-1"
          title="Stop and attach"
        >
          <Square className="h-2.5 w-2.5 fill-white" />
          <span>Done</span>
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50"
      onClick={start}
      disabled={busy}
      title="Record voice note"
    >
      <Mic className="h-4 w-4" />
    </Button>
  )
}

/** Converts current reply text into an AI voice note attachment using OpenAI TTS */
export function AiVoiceReplyButton({
  text,
  onGenerated,
}: {
  text: string
  onGenerated: (attachment: Attachment) => void
}) {
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    const cleanText = text.trim()
    if (!cleanText) {
      toast.info("Please type or draft a reply message first to generate AI voice")
      return
    }

    setGenerating(true)
    try {
      const res = await fetch("/api/ai/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, voice: "alloy" }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        onGenerated({
          kind: "media",
          type: "audio",
          url: data.url,
          filename: "ai-voice-reply.ogg",
        })
        toast.success("AI Voice Note generated and attached!")
      } else {
        toast.error(data.error || "Could not generate AI voice note")
      }
    } catch {
      toast.error("Voice generation service unavailable")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleGenerate}
      disabled={generating}
      title="Generate AI Voice Note (Text-to-Speech)"
      className="h-8 w-8 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 relative"
    >
      {generating ? (
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  )
}

export function AttachmentChip({ attachment, onClear }: { attachment: Attachment; onClear: () => void }) {
  return (
    <Card className="flex items-center gap-2 px-2 py-1.5 mb-2 bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800">
      {attachment.kind === "media" && attachment.preview ? (
        <img src={attachment.preview} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
      ) : attachment.kind === "location" ? (
        <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
      ) : attachment.kind === "media" && attachment.type === "audio" ? (
        <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
          <Mic className="h-4 w-4" />
        </div>
      ) : (
        <Paperclip className="h-4 w-4 text-emerald-600 shrink-0" />
      )}
      <span className="text-xs text-stone-600 dark:text-stone-300 truncate flex-1 font-medium">
        {attachment.kind === "location"
          ? `${attachment.name || "Location"} · ${attachment.latitude}, ${attachment.longitude}`
          : attachment.kind === "media" && attachment.type === "audio"
          ? `Voice Note (${attachment.filename || "audio.m4a"})`
          : `${attachment.filename || attachment.type}`}
      </span>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-stone-700" onClick={onClear}>
        <X className="h-3 w-3" />
      </Button>
    </Card>
  )
}

/** Custom WhatsApp-style interactive voice note audio player */
export function VoiceNotePlayer({ url, outgoing }: { url: string; outgoing: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [hasError, setHasError] = useState(false)

  // Generate a deterministic waveform pattern from the URL string
  const waveformBars = useMemo(() => {
    let hash = 0
    for (let i = 0; i < url.length; i++) {
      hash = (hash << 5) - hash + url.charCodeAt(i)
      hash |= 0
    }
    const bars: number[] = []
    for (let i = 0; i < 24; i++) {
      const val = Math.abs(Math.sin((hash + i * 37) * 0.45))
      bars.push(Math.max(20, Math.round(val * 100)))
    }
    return bars
  }, [url])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const onError = () => setHasError(true)

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("error", onError)

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("error", onError)
    }
  }, [url])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setHasError(true))
    }
  }

  const cycleSpeed = () => {
    const audio = audioRef.current
    const next = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1
    setPlaybackSpeed(next)
    if (audio) audio.playbackRate = next
  }

  const handleSeek = (index: number) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const ratio = index / waveformBars.length
    const target = ratio * duration
    audio.currentTime = target
    setCurrentTime(target)
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00"
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  if (hasError) {
    return (
      <div className={`text-[11px] flex items-center gap-1.5 ${outgoing ? "text-emerald-100" : "text-stone-500"}`}>
        <Mic className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span>Voice note unavailable</span>
      </div>
    )
  }

  const progressRatio = duration > 0 ? currentTime / duration : 0
  const activeBarIndex = Math.floor(progressRatio * waveformBars.length)

  return (
    <div className={`flex items-center gap-2 p-1.5 rounded-xl min-w-[210px] max-w-[260px] select-none ${
      outgoing ? "bg-emerald-900/40 text-white" : "bg-stone-100/90 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100"
    }`}>
      {/* Hidden native audio tag */}
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs transition-transform active:scale-95 cursor-pointer ${
          outgoing
            ? "bg-white text-emerald-800 hover:bg-emerald-50"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
        title={isPlaying ? "Pause" : "Play voice note"}
      >
        {isPlaying ? (
          <Square className="h-3 w-3 fill-current" />
        ) : (
          <span className="ms-0.5 text-xs font-bold leading-none">▶</span>
        )}
      </button>

      {/* Waveform Scrubber Bars & Timing */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex items-end gap-[2px] h-6 px-0.5 cursor-pointer" title="Click waveform to seek">
          {waveformBars.map((heightPercent, idx) => {
            const isPlayed = idx <= activeBarIndex
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSeek(idx)}
                className="group relative flex-1 h-full flex items-end focus:outline-none"
              >
                <span
                  className={`w-full rounded-full transition-colors ${
                    isPlayed
                      ? outgoing
                        ? "bg-white"
                        : "bg-emerald-600"
                      : outgoing
                      ? "bg-emerald-400/40"
                      : "bg-stone-300 dark:bg-stone-600"
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono leading-none">
          <span className={outgoing ? "text-emerald-100" : "text-stone-500 dark:text-stone-400"}>
            {isPlaying || currentTime > 0 ? formatTime(currentTime) : formatTime(duration)}
          </span>

          <button
            type="button"
            onClick={cycleSpeed}
            className={`px-1 py-0.2 rounded text-[9px] font-bold tracking-tighter uppercase transition-colors cursor-pointer ${
              outgoing
                ? "bg-emerald-800/80 text-emerald-200 hover:bg-emerald-700"
                : "bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300"
            }`}
            title="Playback speed"
          >
            {playbackSpeed}x
          </button>
        </div>
      </div>
    </div>
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
    return <VoiceNotePlayer url={cleanUrl} outgoing={outgoing} />
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
