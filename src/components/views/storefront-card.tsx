"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, Copy, Check, ExternalLink, Share2 } from "lucide-react"

/**
 * The address to give a customer.
 *
 * Every workspace has a public storefront at /<slug>, and nothing in the panel
 * ever showed it — so the one link a business actually hands out was something
 * they had to be told by us. Shown once, plainly, with the two things anybody
 * does with a link: open it, or send it to someone.
 */
export function StorefrontCard() {
  const [slug, setSlug] = useState<string | null>(null)
  const [name, setName] = useState<string>("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch("/api/workspaces", { headers: { Accept: "application/json" } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.current?.slug) { setSlug(d.current.slug); setName(d.current.name || "") }
      })
      .catch(() => {})
  }, [])

  if (!slug) return null

  // Built from the browser's own origin so it stays right on any deployment,
  // rather than hardcoding the production domain into a link people will send.
  const origin = typeof window === "undefined" ? "" : window.location.origin
  const url = `${origin}/${slug}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard is blocked on insecure origins and in some browsers. The URL
      // is on screen and selectable, so there is nothing to recover from.
    }
  }

  const share = `https://wa.me/?text=${encodeURIComponent(`${name ? name + " — " : ""}book with us here: ${url}`)}`

  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
              <Globe className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold text-stone-900">Your customer website</p>
          </div>
          <p className="mt-2 truncate font-mono text-sm text-emerald-800" title={url}>{url}</p>
          <p className="mt-1 text-xs text-stone-600">
            Share this with customers — they can browse and book without WhatsApp.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-9 bg-white" onClick={copy}>
            {copied ? <><Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Copied</> : <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</>}
          </Button>
          <a href={share} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="h-9 bg-white">
              <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
            </Button>
          </a>
          <a href={url} target="_blank" rel="noreferrer">
            <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
