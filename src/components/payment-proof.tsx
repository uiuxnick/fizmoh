"use client"

import { useState } from "react"
import { ImageOff, ZoomIn } from "lucide-react"

/**
 * The payment proof a customer sent.
 *
 * WhatsApp screenshots are stored as data URIs, because Meta's media URLs need
 * a bearer token and expire within minutes. Older web uploads are stored as
 * paths, and `whatsapp_media://` is the marker written when the download itself
 * failed, so there is nothing to show.
 *
 * Shared because the finance queue was rendering a grey placeholder icon
 * captioned "Simulation" instead of the image — the proof was in the database
 * the whole time, and the one screen whose entire job is to check it could not
 * see it.
 */
export function PaymentProof({ url, className = "" }: { url: string | null; className?: string }) {
  const [broken, setBroken] = useState(false)
  const [zoomed, setZoomed] = useState(false)

  if (!url) return null

  const renderable = url.startsWith("data:") || url.startsWith("http") || url.startsWith("/")
  if (!renderable || broken) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-stone-500">
        <ImageOff className="h-3.5 w-3.5" />
        The customer sent a proof, but the image is no longer retrievable.
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        className={`group relative block w-full rounded-lg border overflow-hidden hover:ring-2 hover:ring-emerald-400 ${className}`}
        title="Click to enlarge"
      >
        <img
          src={url}
          alt="Payment proof"
          onError={() => setBroken(true)}
          className="w-full max-h-72 object-contain bg-stone-100"
        />
        <span className="absolute top-1.5 right-1.5 rounded bg-black/50 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="h-3.5 w-3.5 text-white" />
        </span>
      </button>

      {zoomed && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-6"
          onClick={e => { e.stopPropagation(); setZoomed(false) }}
        >
          <img src={url} alt="Payment proof" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </>
  )
}
