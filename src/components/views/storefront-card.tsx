"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, Copy, Check, ExternalLink, Share2, Utensils } from "lucide-react"

/**
 * The address to give a customer.
 */
export function StorefrontCard() {
  const [slug, setSlug] = useState<string | null>(null)
  const [name, setName] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [isRestaurant, setIsRestaurant] = useState(false)

  useEffect(() => {
    fetch("/api/workspaces", { headers: { Accept: "application/json" } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.current?.slug) { setSlug(d.current.slug); setName(d.current.name || "") }
      })
      .catch(() => {})

    fetch("/api/features")
      .then(r => (r.ok ? r.json() : null))
      .then(f => {
        if (f?.restaurant) setIsRestaurant(true)
      })
      .catch(() => {})
  }, [])

  if (!slug) return null

  // Built from the browser's own origin so it stays right on any deployment
  const origin = typeof window === "undefined" ? "" : window.location.origin
  const url = `${origin}/${slug}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const share = `https://wa.me/?text=${encodeURIComponent(`${name ? name + " — " : ""}${isRestaurant ? "view our menu and order here" : "book with us here"}: ${url}`)}`

  return (
    <Card className={isRestaurant ? "border-amber-300 bg-amber-50/50 shadow-xs" : "border-emerald-200 bg-emerald-50/40"}>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isRestaurant ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"}`}>
              {isRestaurant ? <Utensils className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
            </span>
            <p className="text-sm font-semibold text-stone-900">
              {isRestaurant ? "Your Restaurant Ordering Website & Digital Menu" : "Your customer website"}
            </p>
            {isRestaurant && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                Live Ordering
              </span>
            )}
          </div>
          <p className={`mt-2 truncate font-mono text-sm ${isRestaurant ? "text-amber-900 font-semibold" : "text-emerald-800"}`} title={url}>{url}</p>
          <p className="mt-1 text-xs text-stone-600">
            {isRestaurant
              ? "Share this with customers — they can view your digital menu, browse dishes, and order directly via WhatsApp or online."
              : "Share this with customers — they can browse and book without WhatsApp."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-9 bg-white" onClick={copy}>
            {copied ? <><Check className={`mr-1.5 h-3.5 w-3.5 ${isRestaurant ? "text-amber-600" : "text-emerald-600"}`} /> Copied</> : <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</>}
          </Button>
          <a href={share} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="h-9 bg-white">
              <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
            </Button>
          </a>
          <a href={url} target="_blank" rel="noreferrer">
            <Button size="sm" className={`h-9 text-white ${isRestaurant ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
