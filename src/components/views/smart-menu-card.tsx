"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Utensils, ChefHat, ExternalLink, ArrowRight, Sparkles, QrCode } from "lucide-react"
import { useApp } from "@/lib/store"

export function SmartMenuCard() {
  const [slug, setSlug] = useState<string | null>(null)
  const [stats, setStats] = useState<{ activeOrders: number; tablesCount: number } | null>(null)
  const { setView } = useApp()

  useEffect(() => {
    fetch("/api/workspaces", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.current?.slug) setSlug(d.current.slug)
      })
      .catch(() => {})

    fetch("/api/restaurant/analytics?period=today")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.metrics) {
          setStats({
            activeOrders: (d.metrics.liveOrdersCount ?? 0),
            tablesCount: (d.metrics.activeTablesCount ?? 0),
          })
        }
      })
      .catch(() => {})
  }, [])

  const origin = typeof window === "undefined" ? "" : window.location.origin
  const menuUrl = slug ? `${origin}/menu/${slug}` : ""

  return (
    <Card className="border-amber-200/90 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-amber-50/20 shadow-xs">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-600 text-white shadow-2xs">
              <Utensils className="h-4 w-4" />
            </span>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-stone-900">Smart Menu & Table Ordering</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300/80">
                Live Addon
              </span>
            </div>
          </div>
          {menuUrl ? (
            <p className="truncate font-mono text-xs text-amber-900 mt-1" title={menuUrl}>
              {menuUrl}
            </p>
          ) : (
            <p className="text-xs text-stone-500 mt-1">
              Multi-branch digital menus, QR ordering, KDS, waiter calls & live tracking.
            </p>
          )}
          <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-600">
            <span>• Bilingual (EN / AR RTL)</span>
            <span>• AI Menu Scanner</span>
            <span>• Fullscreen KDS</span>
            {stats && (stats.tablesCount > 0 || stats.activeOrders > 0) && (
              <span className="font-semibold text-amber-800">
                ({stats.tablesCount} Tables, {stats.activeOrders} Active Orders)
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 items-center">
          {menuUrl && (
            <a href={menuUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="h-9 bg-white border-amber-200 text-stone-700 hover:bg-amber-50">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> Open Menu
              </Button>
            </a>
          )}
          <a href="/dashboard/addons/smart-menu-ordering/kitchen" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="h-9 bg-white border-amber-200 text-stone-700 hover:bg-amber-50">
              <ChefHat className="mr-1.5 h-3.5 w-3.5 text-rose-500" /> Kitchen KDS
            </Button>
          </a>
          <Button
            size="sm"
            className="h-9 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            onClick={() => setView("restaurant")}
          >
            Manage Restaurant <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
