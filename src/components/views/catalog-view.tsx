"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ShoppingBag, RefreshCw, Plus, Search, ExternalLink, Send, CheckCircle2, Sparkles, Store, Edit2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { WhatsAppCatalogCard } from "@/components/views/whatsapp-catalog-card"

interface ProductItem {
  id: string
  name: string
  price: number
  currency: string
  category: string
  description?: string
  imageUrl?: string
  retailerId: string
  inStock: boolean
}

export function CatalogView() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")

  // Add Product Dialog State
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newCategory, setNewCategory] = useState("Packages")
  const [newImageUrl, setNewImageUrl] = useState("")
  const [newDescription, setNewDescription] = useState("")

  const loadCatalog = async () => {
    setLoading(true)
    try {
      const [toursRes, menuRes] = await Promise.all([
        fetch("/api/tours").then(r => r.json()).catch(() => ({})),
        fetch("/api/restaurant/menu").then(r => r.json()).catch(() => ({})),
      ])

      const list: ProductItem[] = []

      if (Array.isArray(toursRes.tours)) {
        toursRes.tours.forEach((t: any) => {
          list.push({
            id: `tour_${t.id}`,
            name: t.name,
            price: Number(t.price) || 0,
            currency: t.currency || "OMR",
            category: "Tours & Experiences",
            description: t.description || "",
            imageUrl: t.media?.[0]?.url || t.imageUrl,
            retailerId: t.slug || t.id,
            inStock: true,
          })
        })
      }

      if (Array.isArray(menuRes.items)) {
        menuRes.items.forEach((m: any) => {
          list.push({
            id: `menu_${m.id}`,
            name: m.name,
            price: Number(m.price) || 0,
            currency: "OMR",
            category: m.category?.name || "Food & Beverages",
            description: m.description || "",
            imageUrl: m.image,
            retailerId: m.id,
            inStock: m.available !== false,
          })
        })
      }

      setProducts(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCatalog()
  }, [])

  const handleAddProduct = () => {
    if (!newTitle.trim() || !newPrice) {
      toast.error("Please provide title and price")
      return
    }

    const newItem: ProductItem = {
      id: `custom_${Date.now()}`,
      name: newTitle.trim(),
      price: parseFloat(newPrice),
      currency: "OMR",
      category: newCategory,
      description: newDescription,
      imageUrl: newImageUrl,
      retailerId: `prod_${Date.now()}`,
      inStock: true,
    }

    setProducts(prev => [newItem, ...prev])
    toast.success("Product added to local catalog!")
    setAddOpen(false)
    setNewTitle("")
    setNewPrice("")
    setNewImageUrl("")
    setNewDescription("")
  }

  const categories = ["ALL", ...Array.from(new Set(products.map(p => p.category)))]

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.retailerId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = selectedCategory === "ALL" || p.category === selectedCategory
    return matchesSearch && matchesCat
  })

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <ShoppingBag className="h-7 w-7 text-purple-600" />
            Meta WhatsApp Catalog & Store Manager
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage your store inventory, sync with Meta Commerce Manager, and send interactive WhatsApp product catalogs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 h-9">
                <Plus className="h-4 w-4" /> Add Catalog Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md p-5">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-purple-600" /> Add Catalog Product
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 mt-2">
                <div>
                  <Label className="text-xs font-semibold">Product Title</Label>
                  <Input
                    placeholder="e.g. Muscat Sunset Cruise"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">Price (OMR)</Label>
                    <Input
                      type="number"
                      placeholder="25.00"
                      value={newPrice}
                      onChange={e => setNewPrice(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Category</Label>
                    <Input
                      placeholder="e.g. Tour Packages"
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Image URL</Label>
                  <Input
                    placeholder="https://..."
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Description</Label>
                  <Input
                    placeholder="Short product summary for Meta catalog..."
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <Button
                  onClick={handleAddProduct}
                  className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium mt-2"
                >
                  Save Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={loadCatalog}
            disabled={loading}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Meta WhatsApp Catalog Sync Integration Card */}
      <WhatsAppCatalogCard />

      {/* Product Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search catalog items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(p => (
          <Card key={p.id} className="overflow-hidden border hover:border-purple-300 transition-all group">
            <div className="h-40 bg-stone-100 relative overflow-hidden">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400">
                  <ShoppingBag className="h-10 w-10 stroke-1" />
                </div>
              )}
              <Badge className="absolute top-2 right-2 bg-white/90 text-stone-800 text-[10px] backdrop-blur font-semibold border-stone-200">
                {p.category}
              </Badge>
            </div>

            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{p.name}</h3>
                <span className="text-sm font-bold text-purple-700 shrink-0">
                  {p.price} {p.currency}
                </span>
              </div>

              {p.description && (
                <p className="text-xs text-stone-500 line-clamp-2">{p.description}</p>
              )}

              <div className="flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t font-mono">
                <span>Retailer ID: {p.retailerId}</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Meta Feed Ready
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
