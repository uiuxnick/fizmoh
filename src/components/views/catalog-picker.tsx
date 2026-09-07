"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { ShoppingBag, Store, Send, Loader2, Check } from "lucide-react"

interface CatalogProduct {
  id: string
  name: string
  price: number
  currency?: string
  imageUrl?: string
  category?: string
  retailerId?: string
}

export function CatalogPicker({
  conversationId,
  onSent,
}: {
  conversationId: string
  onSent: () => void
}) {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const loadProducts = async () => {
    setLoading(true)
    try {
      const [toursRes, menuRes] = await Promise.all([
        fetch("/api/tours").then(r => r.json()).catch(() => ({})),
        fetch("/api/restaurant/menu").then(r => r.json()).catch(() => ({})),
      ])

      const list: CatalogProduct[] = []

      if (Array.isArray(toursRes.tours)) {
        toursRes.tours.forEach((t: any) => {
          list.push({
            id: t.id,
            name: t.name,
            price: Number(t.price) || 0,
            currency: t.currency || "OMR",
            category: "Tour Package",
            retailerId: t.slug || t.id,
            imageUrl: t.media?.[0]?.url || t.imageUrl,
          })
        })
      }

      if (Array.isArray(menuRes.items)) {
        menuRes.items.forEach((m: any) => {
          list.push({
            id: m.id,
            name: m.name,
            price: Number(m.price) || 0,
            currency: "OMR",
            category: m.category?.name || "Restaurant Item",
            retailerId: m.id,
            imageUrl: m.image,
          })
        })
      }

      setProducts(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) loadProducts()
  }, [open])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const sendCatalog = async (customItems?: CatalogProduct[]) => {
    setSending(true)
    const itemsToSend = customItems || products.filter(p => selectedIds.includes(p.id))

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: "OUTBOUND",
          type: "CATALOG",
          content: "🛍️ Check out our top tours and menu items available directly on WhatsApp!",
          headerText: "🛍️ Meta Catalog Showcase",
          items: itemsToSend.map(it => ({
            productRetailerId: it.retailerId || it.id,
            name: it.name,
            price: it.price,
            currency: it.currency || "OMR",
            imageUrl: it.imageUrl,
          })),
        }),
      })

      if (res.ok) {
        toast.success("Meta Catalog & Products sent!")
        setOpen(false)
        setSelectedIds([])
        onSent()
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || "Failed to send catalog")
      }
    } catch {
      toast.error("Failed to send catalog")
    } finally {
      setSending(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-stone-500 hover:text-purple-600"
          title="Send Meta Catalog & Ecommerce Products"
        >
          <ShoppingBag className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 p-3">
        <div className="flex items-center justify-between border-b pb-2 mb-2">
          <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <Store className="h-4 w-4 text-purple-600" />
            Meta Catalog & Products
          </span>
          <Badge className="text-[9px] bg-purple-100 text-purple-700 hover:bg-purple-100">
            WhatsApp Store
          </Badge>
        </div>

        <div className="space-y-2">
          {/* Quick full showcase button */}
          <Button
            size="sm"
            onClick={() => sendCatalog(products.slice(0, 10))}
            disabled={sending || loading}
            className="w-full h-8 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium gap-1.5 shadow-sm"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingBag className="h-3.5 w-3.5" />}
            1-Click Send Full Catalog Showcase
          </Button>

          <div className="text-[10px] text-stone-400 text-center font-medium border-t border-b py-1">
            Or select specific items to send:
          </div>

          {loading ? (
            <div className="p-4 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-purple-600" /> Loading store items...
            </div>
          ) : products.length === 0 ? (
            <div className="p-3 text-center text-xs text-stone-400">
              No products found. Make sure tours or restaurant items are configured.
            </div>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
              {products.map(p => {
                const selected = selectedIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleSelect(p.id)}
                    className={`w-full text-left p-1.5 rounded-md border text-xs flex items-center justify-between transition-all ${
                      selected
                        ? "bg-purple-50 border-purple-300 font-semibold"
                        : "bg-white border-stone-100 hover:bg-stone-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-stone-900 truncate font-medium">{p.name}</div>
                      <div className="text-[10px] text-stone-400">{p.category}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] font-bold text-purple-700">
                        {p.price} {p.currency}
                      </span>
                      {selected && <Check className="h-3.5 w-3.5 text-purple-600" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {selectedIds.length > 0 && (
            <Button
              size="sm"
              onClick={() => sendCatalog()}
              disabled={sending}
              className="w-full h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium gap-1"
            >
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Send Selected ({selectedIds.length})
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
