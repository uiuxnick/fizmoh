"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Smartphone, RefreshCw, ShoppingBag, ExternalLink } from "lucide-react"
import { toast } from "sonner"

export function WhatsAppCatalogCard() {
  const [catalogId, setCatalogId] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [testPhone, setTestPhone] = useState("")
  const [sendingTest, setSendingTest] = useState(false)
  const [feedCount, setFeedCount] = useState<number | null>(null)

  const loadFeedInfo = async () => {
    try {
      const res = await fetch("/api/whatsapp/catalog/sync")
      const data = await res.json()
      if (data.success) {
        setFeedCount(data.totalItems)
      }
    } catch {
      // Best-effort
    }
  }

  useEffect(() => {
    loadFeedInfo()
  }, [])

  const handleSync = async () => {
    if (!catalogId.trim()) {
      toast.error("Please enter your Meta Catalog ID from Commerce Manager")
      return
    }
    setSyncing(true)
    try {
      const res = await fetch("/api/whatsapp/catalog/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogId: catalogId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to sync with Meta Catalog")
      toast.success(`Successfully synced ${data.syncedCount || data.totalItems || 0} items to Meta Commerce Catalog!`)
    } catch (e: any) {
      toast.error(e.message || "Catalog sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      toast.error("Please enter a recipient phone number (e.g. +96891234567)")
      return
    }
    setSendingTest(true)
    try {
      const res = await fetch("/api/whatsapp/catalog/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testPhone.trim(),
          catalogId: catalogId.trim() || undefined,
          type: "multi",
          headerText: "🛍️ Featured Catalog Showcase",
          bodyText: "Explore our items and order directly inside WhatsApp!",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send WhatsApp Catalog message")
      toast.success("WhatsApp Interactive Catalog Showcase sent!")
    } catch (e: any) {
      toast.error(e.message || "Failed to send catalog message")
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-950 font-bold">
            <ShoppingBag className="h-5 w-5 text-emerald-600" />
            Meta WhatsApp Catalog & Commerce Integration
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/whatsapp/catalog/sync"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-medium bg-white px-2.5 py-1 rounded border border-emerald-200"
            >
              <ExternalLink className="h-3 w-3" /> Catalog Feed JSON
            </a>
            {feedCount !== null && (
              <Badge variant="outline" className="bg-emerald-100/80 text-emerald-800 border-emerald-300 font-semibold">
                {feedCount} items ready
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-stone-700 leading-relaxed">
          Sync your live restaurant menu dishes and tour packages directly into <strong>Meta Commerce Manager</strong> so customers can browse your catalog, add items to their WhatsApp cart, and place incoming WhatsApp orders automatically.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2.5 p-3.5 bg-white rounded-lg border border-stone-200 shadow-2xs">
            <Label className="text-xs font-semibold text-stone-800">1. Meta Commerce Catalog ID</Label>
            <Input
              value={catalogId}
              onChange={(e) => setCatalogId(e.target.value)}
              placeholder="e.g. 1234567890 (from Meta Commerce Manager)"
              className="text-xs font-mono bg-stone-50/50"
            />
            <Button
              onClick={handleSync}
              disabled={syncing}
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs"
            >
              {syncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              {syncing ? "Syncing to Meta..." : "Sync Items to Meta Catalog"}
            </Button>
          </div>

          <div className="space-y-2.5 p-3.5 bg-white rounded-lg border border-stone-200 shadow-2xs">
            <Label className="text-xs font-semibold text-stone-800">2. Test Interactive Catalog Showcase</Label>
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+96891234567"
              className="text-xs font-mono bg-stone-50/50"
            />
            <Button
              onClick={handleSendTest}
              disabled={sendingTest}
              size="sm"
              variant="outline"
              className="w-full border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-medium"
            >
              {sendingTest ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Smartphone className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />}
              {sendingTest ? "Sending..." : "Send Interactive Catalog Showcase"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
