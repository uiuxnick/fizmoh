"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import {
  Store, RefreshCw, Copy, Check, ExternalLink, Zap, ShieldCheck, ShoppingBag, Loader2,
  Package, ShoppingCart, Users, Plus, Search, Trash2, Edit, Eye, Tag, Filter, CheckCircle2, BookOpen, Key, ArrowRight, Info, Upload, Image as ImageIcon, X
} from "lucide-react"
import { toast } from "sonner"

export function WooCommerceView() {
  const [activeTab, setActiveTab] = useState<"products" | "orders" | "customers" | "settings">("products")

  // Settings State
  const [storeUrl, setStoreUrl] = useState("")
  const [consumerKey, setConsumerKey] = useState("")
  const [consumerSecret, setConsumerSecret] = useState("")
  const [autoSync, setAutoSync] = useState(true)
  const [syncOrders, setSyncOrders] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [connected, setConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [guideModalOpen, setGuideModalOpen] = useState(false)

  // Categories State
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Products State
  const [products, setProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [createProdOpen, setCreateProdOpen] = useState(false)

  // Create Product Form Fields
  const [newProdName, setNewProdName] = useState("")
  const [newProdRegPrice, setNewProdRegPrice] = useState("")
  const [newProdSalePrice, setNewProdSalePrice] = useState("")
  const [newProdSku, setNewProdSku] = useState("")
  const [newProdCategory, setNewProdCategory] = useState("")
  const [newProdManageStock, setNewProdManageStock] = useState(false)
  const [newProdStockQty, setNewProdStockQty] = useState("")
  const [newProdStockStatus, setNewProdStockStatus] = useState("instock")
  const [newProdImage, setNewProdImage] = useState("")
  const [newProdDesc, setNewProdDesc] = useState("")
  const [creatingProd, setCreatingProd] = useState(false)

  // Edit Product Form Fields
  const [editingProd, setEditingProd] = useState<any | null>(null)
  const [editProdName, setEditProdName] = useState("")
  const [editProdRegPrice, setEditProdRegPrice] = useState("")
  const [editProdSalePrice, setEditProdSalePrice] = useState("")
  const [editProdSku, setEditProdSku] = useState("")
  const [editProdCategory, setEditProdCategory] = useState("")
  const [editProdManageStock, setEditProdManageStock] = useState(false)
  const [editProdStockQty, setEditProdStockQty] = useState("")
  const [editProdStockStatus, setEditProdStockStatus] = useState("instock")
  const [editProdImage, setEditProdImage] = useState("")
  const [editProdDesc, setEditProdDesc] = useState("")
  const [updatingProd, setUpdatingProd] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "new" | "edit") => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      if (target === "new") {
        setNewProdImage(data.url)
      } else {
        setEditProdImage(data.url)
      }
      toast.success("Product image uploaded successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  // Orders State
  const [orders, setOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orderStatusFilter, setOrderStatusFilter] = useState("any")
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [updatingOrder, setUpdatingOrder] = useState(false)
  const [newOrderStatus, setNewOrderStatus] = useState("")
  const [orderNote, setOrderNote] = useState("")
  const [notifyCustomer, setNotifyCustomer] = useState(true)

  // Customers State
  const [customers, setCustomers] = useState<any[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")

  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : "https://app.fizmoh.cloud"}/api/woocommerce/webhook`

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/woocommerce/config")
      const data = await res.json()
      if (res.ok) {
        setStoreUrl(data.storeUrl || "")
        setConsumerKey(data.consumerKey || "")
        setConsumerSecret(data.consumerSecret || "")
        setAutoSync(data.autoSync !== false)
        setSyncOrders(data.syncOrders !== false)
        if (data.storeUrl && data.consumerKey) setConnected(true)
      }
    } catch {}
  }

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/woocommerce/categories")
      const data = await res.json()
      if (res.ok) setCategories(data.categories || [])
    } catch {}
  }

  const loadProducts = async () => {
    setLoadingProducts(true)
    try {
      const params = new URLSearchParams()
      if (productSearch) params.set("search", productSearch)
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory)

      const res = await fetch(`/api/woocommerce/products?${params.toString()}`)
      const data = await res.json()
      if (res.ok) setProducts(data.products || [])
      else toast.error(data.error || "Failed to load products")
    } catch {
      toast.error("Failed to load products")
    } finally {
      setLoadingProducts(false)
    }
  }

  const loadOrders = async () => {
    setLoadingOrders(true)
    try {
      const query = orderStatusFilter !== "any" ? `?status=${orderStatusFilter}` : ""
      const res = await fetch(`/api/woocommerce/orders${query}`)
      const data = await res.json()
      if (res.ok) setOrders(data.orders || [])
      else toast.error(data.error || "Failed to load orders")
    } catch {
      toast.error("Failed to load orders")
    } finally {
      setLoadingOrders(false)
    }
  }

  const loadCustomers = async () => {
    setLoadingCustomers(true)
    try {
      const query = customerSearch ? `?search=${encodeURIComponent(customerSearch)}` : ""
      const res = await fetch(`/api/woocommerce/customers${query}`)
      const data = await res.json()
      if (res.ok) setCustomers(data.customers || [])
      else toast.error(data.error || "Failed to load customers")
    } catch {
      toast.error("Failed to load customers")
    } finally {
      setLoadingCustomers(false)
    }
  }

  useEffect(() => {
    loadConfig()
    loadCategories()
    loadProducts()
    loadOrders()
    loadCustomers()
  }, [])

  useEffect(() => {
    loadProducts()
  }, [selectedCategory])

  useEffect(() => {
    if (activeTab === "products") loadProducts()
    if (activeTab === "orders") loadOrders()
    if (activeTab === "customers") loadCustomers()
  }, [activeTab, orderStatusFilter])

  const handleSaveSettings = async () => {
    if (!storeUrl.trim()) return toast.error("Please enter your WooCommerce Store URL")
    setSavingSettings(true)
    try {
      const res = await fetch("/api/woocommerce/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeUrl, consumerKey, consumerSecret, autoSync, syncOrders }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save settings")
      toast.success("WooCommerce credentials saved!")
      setConnected(true)
      loadCategories()
      loadProducts()
      loadOrders()
      loadCustomers()
    } catch (e: any) {
      toast.error(e.message || "Failed to save WooCommerce settings")
    } finally {
      setSavingSettings(false)
    }
  }

  const handleCreateProduct = async () => {
    if (!newProdName || !newProdRegPrice) return toast.error("Provide product name and regular price")
    setCreatingProd(true)
    try {
      const res = await fetch("/api/woocommerce/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProdName,
          regular_price: newProdRegPrice,
          sale_price: newProdSalePrice,
          sku: newProdSku,
          categories: newProdCategory ? [{ id: Number(newProdCategory) }] : [],
          manage_stock: newProdManageStock,
          stock_quantity: newProdStockQty,
          stock_status: newProdStockStatus,
          description: newProdDesc,
          images: newProdImage ? [{ src: newProdImage }] : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create product")
      toast.success("Product created in WooCommerce!")
      setCreateProdOpen(false)
      setNewProdName("")
      setNewProdRegPrice("")
      setNewProdSalePrice("")
      setNewProdSku("")
      setNewProdCategory("")
      setNewProdManageStock(false)
      setNewProdStockQty("")
      setNewProdStockStatus("instock")
      setNewProdImage("")
      setNewProdDesc("")
      loadProducts()
    } catch (e: any) {
      toast.error(e.message || "Failed to create product")
    } finally {
      setCreatingProd(false)
    }
  }

  const handleOpenEditProduct = (p: any) => {
    setEditingProd(p)
    setEditProdName(p.name || "")
    setEditProdRegPrice(p.regular_price || p.price || "")
    setEditProdSalePrice(p.sale_price || "")
    setEditProdSku(p.sku || "")
    setEditProdCategory(p.categories?.[0]?.id ? String(p.categories[0].id) : "")
    setEditProdManageStock(Boolean(p.manage_stock))
    setEditProdStockQty(p.stock_quantity !== null && p.stock_quantity !== undefined ? String(p.stock_quantity) : "")
    setEditProdStockStatus(p.stock_status || "instock")
    setEditProdImage(p.images?.[0]?.src || "")
    setEditProdDesc(p.description || "")
  }

  const handleUpdateProduct = async () => {
    if (!editingProd) return
    setUpdatingProd(true)
    try {
      const res = await fetch(`/api/woocommerce/products/${editingProd.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editProdName,
          regular_price: editProdRegPrice,
          sale_price: editProdSalePrice,
          sku: editProdSku,
          categories: editProdCategory ? [{ id: Number(editProdCategory) }] : [],
          manage_stock: editProdManageStock,
          stock_quantity: editProdStockQty,
          stock_status: editProdStockStatus,
          description: editProdDesc,
          images: editProdImage ? [{ src: editProdImage }] : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update product")
      toast.success("WooCommerce product updated!")
      setEditingProd(null)
      loadProducts()
    } catch (e: any) {
      toast.error(e.message || "Failed to update product")
    } finally {
      setUpdatingProd(false)
    }
  }

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product from WooCommerce?")) return
    try {
      const res = await fetch(`/api/woocommerce/products/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Product deleted from WooCommerce!")
        loadProducts()
      } else {
        toast.error("Failed to delete product")
      }
    } catch {
      toast.error("Failed to delete product")
    }
  }

  const handleUpdateOrderStatus = async () => {
    if (!selectedOrder || !newOrderStatus) return
    setUpdatingOrder(true)
    try {
      const res = await fetch(`/api/woocommerce/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newOrderStatus,
          note: orderNote,
          notifyCustomer,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update order")
      toast.success(`Order #${selectedOrder.number} status updated to ${newOrderStatus.toUpperCase()}`)
      setSelectedOrder(null)
      loadOrders()
    } catch (e: any) {
      toast.error(e.message || "Failed to update order status")
    } finally {
      setUpdatingOrder(false)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Store className="h-7 w-7 text-indigo-600" />
            WooCommerce Realtime Store Module
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage products by categories, prices (regular & sale), stock inventory, live orders, and customer directory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Guide Modal Trigger */}
          <Dialog open={guideModalOpen} onOpenChange={setGuideModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-xs gap-1.5 text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 font-semibold">
                <BookOpen className="h-4 w-4 text-indigo-600" /> Setup & Integration Guide
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" /> WooCommerce Integration Guide for Tenants
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  Follow these 3 steps to connect your WooCommerce store and enable realtime WhatsApp automation.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-3">
                {/* Step 1 */}
                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                    <span className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                    Step 1: Generate WooCommerce REST API Keys
                  </div>
                  <ol className="list-decimal list-inside text-xs text-stone-700 space-y-1 pl-2">
                    <li>Log into your WordPress Dashboard (`/wp-admin`).</li>
                    <li>Go to <b>WooCommerce &gt; Settings &gt; Advanced &gt; REST API</b>.</li>
                    <li>Click <b>Add key</b>.</li>
                    <li>Enter Description e.g. <code className="bg-white px-1 py-0.5 rounded border text-indigo-800">Fizmoh Integration</code>.</li>
                    <li>Set Permissions to <b>Read/Write</b> and click <b>Generate API key</b>.</li>
                    <li>Copy your <b>Consumer Key</b> (`ck_...`) and <b>Consumer Secret</b> (`cs_...`).</li>
                  </ol>
                </div>

                {/* Step 2 */}
                <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                    <span className="h-5 w-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">2</span>
                    Step 2: Connect Store Credentials in Fizmoh
                  </div>
                  <ul className="list-disc list-inside text-xs text-stone-700 space-y-1 pl-2">
                    <li>On this page, click the <b>API Settings & Webhooks</b> tab.</li>
                    <li>Enter your WooCommerce Store URL e.g. <code className="bg-white px-1 py-0.5 rounded border text-purple-800">https://yourstore.com</code>.</li>
                    <li>Paste your Consumer Key (`ck_...`) and Consumer Secret (`cs_...`).</li>
                    <li>Click <b>Save Credentials</b>. Your store will connect instantly!</li>
                  </ul>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <span className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                    Step 3: Create Webhooks for Realtime WhatsApp Sync
                  </div>
                  <p className="text-xs text-stone-700">
                    In WordPress, go to <b>WooCommerce &gt; Settings &gt; Advanced &gt; Webhooks</b> and create these 4 webhooks using Delivery URL:
                  </p>
                  <div className="p-2.5 bg-white rounded border border-emerald-200 font-mono text-[11px] text-emerald-900 break-all select-all">
                    {webhookUrl}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 bg-white rounded border text-stone-800">
                      <div className="font-bold text-emerald-800">1. order.created</div>
                      <div className="text-[10px] text-stone-500">Topic: <b>Order created</b></div>
                    </div>
                    <div className="p-2 bg-white rounded border text-stone-800">
                      <div className="font-bold text-emerald-800">2. order.updated</div>
                      <div className="text-[10px] text-stone-500">Topic: <b>Order updated</b></div>
                    </div>
                    <div className="p-2 bg-white rounded border text-stone-800">
                      <div className="font-bold text-emerald-800">3. customer.created</div>
                      <div className="text-[10px] text-stone-500">Topic: <b>Customer created</b></div>
                    </div>
                    <div className="p-2 bg-white rounded border text-stone-800">
                      <div className="font-bold text-emerald-800">4. product.updated</div>
                      <div className="text-[10px] text-stone-500">Topic: <b>Product updated</b></div>
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-500 italic pt-1">
                    Note: Leave the <b>Secret</b> field blank in WooCommerce during webhook setup!
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {connected ? (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 px-3 py-1 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5" /> WooCommerce Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 gap-1 px-3 py-1 text-xs">
              Not Connected
            </Badge>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === "products"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          <Package className="h-4 w-4" /> Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === "orders"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          <ShoppingCart className="h-4 w-4" /> Live Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === "customers"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          <Users className="h-4 w-4" /> Customers & CRM ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === "settings"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          <Zap className="h-4 w-4" /> API Settings & Webhooks
        </button>
      </div>

      {/* ── TAB 1: PRODUCTS ── */}
      {activeTab === "products" && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-stone-400 font-medium flex items-center gap-1 text-[11px] mr-1 shrink-0">
                <Filter className="h-3 w-3" /> Category:
              </span>
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                }`}
              >
                All Products
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(String(cat.id))}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all shrink-0 flex items-center gap-1 ${
                    selectedCategory === String(cat.id)
                      ? "bg-indigo-50 text-indigo-700 border-indigo-300 font-semibold shadow-xs"
                      : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-70">({cat.count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && loadProducts()}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {/* Category Dropdown */}
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="h-9 text-xs border rounded-md px-2 bg-stone-50 font-medium"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Dialog open={createProdOpen} onOpenChange={setCreateProdOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 h-9">
                    <Plus className="h-4 w-4" /> Add WooCommerce Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg p-5 max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-bold flex items-center gap-2">
                      <Package className="h-4 w-4 text-indigo-600" /> Add Product to WooCommerce Store
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3 mt-2">
                    <div>
                      <Label className="text-xs font-semibold">Product Name *</Label>
                      <Input
                        placeholder="e.g. Omani Desert Tour Hoodie"
                        value={newProdName}
                        onChange={e => setNewProdName(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>

                    {/* Category Selection */}
                    {categories.length > 0 && (
                      <div>
                        <Label className="text-xs font-semibold">Product Category</Label>
                        <select
                          value={newProdCategory}
                          onChange={e => setNewProdCategory(e.target.value)}
                          className="w-full h-8 text-xs border rounded-md px-2 bg-white mt-1"
                        >
                          <option value="">Select Category...</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold">Regular Price (OMR) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="25.00"
                          value={newProdRegPrice}
                          onChange={e => setNewProdRegPrice(e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Sale Price (OMR)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="19.99 (Optional)"
                          value={newProdSalePrice}
                          onChange={e => setNewProdSalePrice(e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold">SKU</Label>
                        <Input
                          placeholder="e.g. HOOD-DES-001"
                          value={newProdSku}
                          onChange={e => setNewProdSku(e.target.value)}
                          className="h-8 text-xs mt-1 font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Stock Status</Label>
                        <select
                          value={newProdStockStatus}
                          onChange={e => setNewProdStockStatus(e.target.value)}
                          className="w-full h-8 text-xs border rounded-md px-2 bg-white mt-1"
                        >
                          <option value="instock">In Stock</option>
                          <option value="outofstock">Out of Stock</option>
                          <option value="onbackorder">On Backorder</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Manage Stock Quantity?</Label>
                        <Switch checked={newProdManageStock} onCheckedChange={setNewProdManageStock} />
                      </div>
                      {newProdManageStock && (
                        <div>
                          <Label className="text-xs text-stone-600">Stock Quantity</Label>
                          <Input
                            type="number"
                            placeholder="e.g. 50"
                            value={newProdStockQty}
                            onChange={e => setNewProdStockQty(e.target.value)}
                            className="h-8 text-xs mt-1 bg-white"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Product Image</Label>
                        <label className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          {uploadingImage ? "Uploading..." : "Upload File"}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleFileUpload(e, "new")}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div className="flex gap-2 items-center mt-1">
                        <Input
                          placeholder="https://... or click Upload File"
                          value={newProdImage}
                          onChange={e => setNewProdImage(e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                        {newProdImage && (
                          <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-stone-200 shrink-0 bg-stone-50">
                            <img src={newProdImage} alt="Preview" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setNewProdImage("")}
                              className="absolute top-0 right-0 bg-black/60 text-white rounded-bl p-0.5"
                              title="Remove image"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Description</Label>
                      <Input
                        placeholder="Detailed product specifications..."
                        value={newProdDesc}
                        onChange={e => setNewProdDesc(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>

                    <Button
                      onClick={handleCreateProduct}
                      disabled={creatingProd}
                      className="w-full h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold mt-2"
                    >
                      {creatingProd ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Create Product in WooCommerce
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={loadProducts} disabled={loadingProducts} className="text-xs gap-1.5 h-9">
                <RefreshCw className={`h-3.5 w-3.5 ${loadingProducts ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </div>

          {/* Edit Product Modal */}
          {editingProd && (
            <Dialog open={Boolean(editingProd)} onOpenChange={open => !open && setEditingProd(null)}>
              <DialogContent className="max-w-lg p-5 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-sm font-bold flex items-center gap-2">
                    <Edit className="h-4 w-4 text-indigo-600" /> Edit WooCommerce Product #{editingProd.id}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 mt-2">
                  <div>
                    <Label className="text-xs font-semibold">Product Name</Label>
                    <Input
                      value={editProdName}
                      onChange={e => setEditProdName(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  {/* Category Selection */}
                  {categories.length > 0 && (
                    <div>
                      <Label className="text-xs font-semibold">Product Category</Label>
                      <select
                        value={editProdCategory}
                        onChange={e => setEditProdCategory(e.target.value)}
                        className="w-full h-8 text-xs border rounded-md px-2 bg-white mt-1"
                      >
                        <option value="">Select Category...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Regular Price (OMR)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editProdRegPrice}
                        onChange={e => setEditProdRegPrice(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Sale Price (OMR)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Sale price..."
                        value={editProdSalePrice}
                        onChange={e => setEditProdSalePrice(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">SKU</Label>
                      <Input
                        value={editProdSku}
                        onChange={e => setEditProdSku(e.target.value)}
                        className="h-8 text-xs mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Stock Status</Label>
                      <select
                        value={editProdStockStatus}
                        onChange={e => setEditProdStockStatus(e.target.value)}
                        className="w-full h-8 text-xs border rounded-md px-2 bg-white mt-1"
                      >
                        <option value="instock">In Stock</option>
                        <option value="outofstock">Out of Stock</option>
                        <option value="onbackorder">On Backorder</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Manage Stock Quantity?</Label>
                      <Switch checked={editProdManageStock} onCheckedChange={setEditProdManageStock} />
                    </div>
                    {editProdManageStock && (
                      <div>
                        <Label className="text-xs text-stone-600">Stock Quantity</Label>
                        <Input
                          type="number"
                          value={editProdStockQty}
                          onChange={e => setEditProdStockQty(e.target.value)}
                          className="h-8 text-xs mt-1 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Product Image</Label>
                      <label className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        {uploadingImage ? "Uploading..." : "Upload New Image"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleFileUpload(e, "edit")}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="flex gap-2 items-center mt-1">
                      <Input
                        placeholder="https://... or upload new image"
                        value={editProdImage}
                        onChange={e => setEditProdImage(e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                      {editProdImage && (
                        <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-stone-200 shrink-0 bg-stone-50">
                          <img src={editProdImage} alt="Preview" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setEditProdImage("")}
                            className="absolute top-0 right-0 bg-black/60 text-white rounded-bl p-0.5"
                            title="Remove image"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Description</Label>
                    <Input
                      value={editProdDesc}
                      onChange={e => setEditProdDesc(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleUpdateProduct}
                    disabled={updatingProd}
                    className="w-full h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold mt-2"
                  >
                    {updatingProd ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save Changes to WooCommerce Store
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Products Grid */}
          {loadingProducts ? (
            <div className="p-8 text-center text-stone-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> Loading products from WooCommerce store...
            </div>
          ) : products.length === 0 ? (
            <Card className="p-8 text-center text-stone-500">
              No products found for category selection. Click "Add WooCommerce Product" above.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => {
                const onSale = Boolean(p.sale_price && Number(p.sale_price) > 0)
                const categoryName = p.categories?.[0]?.name
                return (
                  <Card key={p.id} className="overflow-hidden border hover:border-indigo-300 transition-all group">
                    <div className="h-40 bg-stone-100 relative overflow-hidden">
                      {p.images?.[0]?.src ? (
                        <img src={p.images[0].src} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">
                          <Package className="h-8 w-8 stroke-1" />
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                        {onSale && (
                          <Badge className="bg-rose-600 text-white text-[10px] font-bold shadow-sm">
                            <Tag className="h-3 w-3 mr-0.5" /> SALE
                          </Badge>
                        )}
                        {categoryName && (
                          <Badge variant="outline" className="bg-white/90 text-stone-800 text-[9px] backdrop-blur font-semibold border-stone-200">
                            {categoryName}
                          </Badge>
                        )}
                      </div>

                      <Badge className={`absolute top-2 right-2 text-[10px] font-semibold border backdrop-blur ${
                        p.stock_status === "instock" ? "bg-emerald-50/90 text-emerald-800 border-emerald-300" : "bg-rose-50/90 text-rose-800 border-rose-300"
                      }`}>
                        {p.manage_stock && p.stock_quantity !== null ? `${p.stock_quantity} in Stock` : p.stock_status === "instock" ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </div>

                    <CardContent className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold text-stone-900 line-clamp-1">{p.name}</h3>
                        {p.permalink && (
                          <a href={p.permalink} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-indigo-600 shrink-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Pricing Display */}
                      <div className="flex items-baseline gap-2">
                        {onSale ? (
                          <>
                            <span className="text-xs font-bold text-rose-600">{p.sale_price} OMR</span>
                            <span className="text-[11px] text-stone-400 line-through">{p.regular_price || p.price} OMR</span>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-indigo-700">{p.regular_price || p.price} OMR</span>
                        )}
                      </div>

                      {p.sku && <div className="text-[10px] font-mono text-stone-400">SKU: {p.sku}</div>}

                      <div className="flex items-center justify-between border-t pt-2 mt-2 text-[11px]">
                        <span className="text-stone-400 font-mono text-[10px]">ID: #{p.id}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-stone-500 hover:text-indigo-600"
                            onClick={() => handleOpenEditProduct(p)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-stone-500 hover:text-rose-600"
                            onClick={() => handleDeleteProduct(p.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: LIVE ORDERS ── */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-700">Filter by Status:</span>
              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                className="h-8 text-xs border rounded-md px-2 bg-stone-50 font-medium"
              >
                <option value="any">All Statuses</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending Payment</option>
                <option value="on-hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <Button variant="outline" onClick={loadOrders} disabled={loadingOrders} className="text-xs gap-1.5 h-8">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingOrders ? "animate-spin" : ""}`} /> Refresh Orders
            </Button>
          </div>

          {/* Order Details & Status Update Dialog */}
          {selectedOrder && (
            <Dialog open={Boolean(selectedOrder)} onOpenChange={open => !open && setSelectedOrder(null)}>
              <DialogContent className="max-w-lg p-5">
                <DialogHeader>
                  <DialogTitle className="text-sm font-bold flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-indigo-600" /> WooCommerce Order #{selectedOrder.number || selectedOrder.id}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 mt-2">
                  <div className="p-3 bg-stone-50 rounded-lg border text-xs space-y-1">
                    <div className="font-semibold text-stone-900">
                      Customer: {selectedOrder.billing?.first_name} {selectedOrder.billing?.last_name}
                    </div>
                    <div className="text-stone-500">Phone: {selectedOrder.billing?.phone || "N/A"}</div>
                    <div className="text-stone-500">Email: {selectedOrder.billing?.email || "N/A"}</div>
                    <div className="font-bold text-indigo-700 pt-1">Total: {selectedOrder.total} {selectedOrder.currency}</div>
                  </div>

                  {/* Line Items */}
                  <div>
                    <Label className="text-xs font-semibold block mb-1">Order Items</Label>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {selectedOrder.line_items?.map((item: any) => (
                        <div key={item.id} className="p-2 border rounded bg-white text-xs flex justify-between">
                          <span>{item.name} × {item.quantity}</span>
                          <span className="font-semibold">{item.total} {selectedOrder.currency}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Update Status Control */}
                  <div className="border-t pt-2 space-y-2">
                    <Label className="text-xs font-semibold">Update Order Status</Label>
                    <select
                      value={newOrderStatus}
                      onChange={e => setNewOrderStatus(e.target.value)}
                      className="w-full h-8 text-xs border rounded-md px-2 bg-white font-medium"
                    >
                      <option value="processing">PROCESSING</option>
                      <option value="completed">COMPLETED</option>
                      <option value="on-hold">ON HOLD</option>
                      <option value="cancelled">CANCELLED</option>
                      <option value="refunded">REFUNDED</option>
                    </select>

                    <Label className="text-xs font-semibold block mt-2">Customer Order Note (Optional)</Label>
                    <Input
                      placeholder="Add note e.g. Shipped via DHL Tracking #12345"
                      value={orderNote}
                      onChange={e => setOrderNote(e.target.value)}
                      className="h-8 text-xs"
                    />

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="notifyWhatsApp"
                        checked={notifyCustomer}
                        onChange={e => setNotifyCustomer(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <label htmlFor="notifyWhatsApp" className="text-xs text-stone-700 cursor-pointer">
                        Send instant WhatsApp update message to customer
                      </label>
                    </div>

                    <Button
                      onClick={handleUpdateOrderStatus}
                      disabled={updatingOrder}
                      className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium mt-2"
                    >
                      {updatingOrder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Update Order Status & Send Alert
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Orders Table */}
          {loadingOrders ? (
            <div className="p-8 text-center text-stone-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> Loading orders from WooCommerce...
            </div>
          ) : orders.length === 0 ? (
            <Card className="p-8 text-center text-stone-500">
              No WooCommerce orders found for status filter "{orderStatusFilter}".
            </Card>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b text-stone-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Total</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-stone-50/50">
                      <td className="p-3 font-bold text-stone-900">#{o.number || o.id}</td>
                      <td className="p-3">
                        <div className="font-semibold text-stone-800">{o.billing?.first_name} {o.billing?.last_name}</div>
                        <div className="text-[10px] text-stone-400">{o.billing?.phone}</div>
                      </td>
                      <td className="p-3 text-stone-500">{new Date(o.date_created).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Badge className={`text-[10px] uppercase ${
                          o.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                          o.status === "processing" ? "bg-blue-100 text-blue-800" :
                          o.status === "cancelled" ? "bg-rose-100 text-rose-800" : "bg-stone-100 text-stone-700"
                        }`}>
                          {o.status}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold text-indigo-700">{o.total} {o.currency}</td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1"
                          onClick={() => {
                            setSelectedOrder(o)
                            setNewOrderStatus(o.status)
                            setOrderNote("")
                          }}
                        >
                          <Eye className="h-3 w-3" /> View & Update
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: CUSTOMERS & CRM ── */}
      {activeTab === "customers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Search customers..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadCustomers()}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <Button variant="outline" onClick={loadCustomers} disabled={loadingCustomers} className="text-xs gap-1.5 h-8">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingCustomers ? "animate-spin" : ""}`} /> Refresh Customers
            </Button>
          </div>

          {loadingCustomers ? (
            <div className="p-8 text-center text-stone-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <Card className="p-8 text-center text-stone-500">
              No WooCommerce customers found.
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map(c => (
                <Card key={c.id} className="p-4 border hover:border-indigo-300 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-stone-900">{c.first_name || c.username} {c.last_name}</div>
                    <Badge className="bg-purple-100 text-purple-800 text-[9px]">ID #{c.id}</Badge>
                  </div>
                  <div className="text-xs text-stone-500 truncate">{c.email}</div>
                  <div className="text-xs text-stone-500">{c.billing?.phone || c.shipping?.phone || "No Phone"}</div>

                  <div className="flex items-center justify-between border-t pt-2 mt-2 text-[10px] text-stone-400 font-mono">
                    <span>Orders: {c.orders_count || 0}</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> CRM Synced
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: SETTINGS & WEBHOOKS ── */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Quick Setup Banner */}
          <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/50">
            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-indigo-600" /> Need Help Connecting WooCommerce?
                </h3>
                <p className="text-[11px] text-stone-600">
                  Follow our step-by-step guide to generate REST API keys (`ck_...`, `cs_...`) and configure webhooks.
                </p>
              </div>

              <Button
                onClick={() => setGuideModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 h-8 shrink-0"
              >
                <BookOpen className="h-3.5 w-3.5" /> View Setup Instructions
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm border-indigo-100">
              <CardHeader className="bg-gradient-to-r from-indigo-50/60 to-purple-50/40 border-b pb-4">
                <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-indigo-600" /> WooCommerce REST API Configuration
                </CardTitle>
                <CardDescription className="text-xs">
                  Enter your WooCommerce Store URL, Consumer Key, and Consumer Secret.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-stone-700">WooCommerce Store URL</Label>
                  <Input
                    placeholder="https://kawashioman.com"
                    value={storeUrl}
                    onChange={e => setStoreUrl(e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-stone-700">Consumer Key (ck_...)</Label>
                    <Input
                      placeholder="ck_1234567890abcdef..."
                      value={consumerKey}
                      onChange={e => setConsumerKey(e.target.value)}
                      className="h-9 text-xs mt-1 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-stone-700">Consumer Secret (cs_...)</Label>
                    <Input
                      type="password"
                      placeholder="cs_1234567890abcdef..."
                      value={consumerSecret}
                      onChange={e => setConsumerSecret(e.target.value)}
                      className="h-9 text-xs mt-1 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-stone-800">Auto Sync Products to Catalog</div>
                      <div className="text-[11px] text-stone-500">Automatically push products to Meta WhatsApp Catalog</div>
                    </div>
                    <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-stone-800">WhatsApp Order Alerts</div>
                      <div className="text-[11px] text-stone-500">Send WhatsApp updates when orders are placed or changed</div>
                    </div>
                    <Switch checked={syncOrders} onCheckedChange={setSyncOrders} />
                  </div>
                </div>

                <Button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
                >
                  {savingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save Credentials
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-purple-100 bg-purple-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-purple-600" /> WooCommerce Webhook Endpoint
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-2 bg-white rounded border border-purple-200 font-mono text-[10px] break-all text-purple-900">
                  {webhookUrl}
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl)
                    setCopied(true)
                    toast.success("Webhook URL copied!")
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="w-full h-8 text-xs bg-white text-purple-700 border border-purple-300 hover:bg-purple-100 font-medium gap-1.5"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy Webhook URL"}
                </Button>

                <div className="border-t border-purple-200/80 pt-3 space-y-2 text-xs">
                  <div className="font-bold text-stone-800 text-[11px]">Recommended Webhooks to Create in WooCommerce:</div>
                  <div className="space-y-1.5 text-[11px] text-stone-600">
                    <div className="p-2 bg-white rounded border border-purple-100 space-y-0.5">
                      <div className="font-bold text-purple-900 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> 1. Order Created (`order.created`)
                      </div>
                      <div className="text-[10px] text-stone-500">Topic: <b>Order created</b> — Triggers automated WhatsApp purchase confirmations.</div>
                    </div>

                    <div className="p-2 bg-white rounded border border-purple-100 space-y-0.5">
                      <div className="font-bold text-purple-900 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> 2. Order Updated (`order.updated`)
                      </div>
                      <div className="text-[10px] text-stone-500">Topic: <b>Order updated</b> — Sends WhatsApp status updates (Processing, Completed, etc.).</div>
                    </div>

                    <div className="p-2 bg-white rounded border border-purple-100 space-y-0.5">
                      <div className="font-bold text-purple-900 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> 3. Customer Created (`customer.created`)
                      </div>
                      <div className="text-[10px] text-stone-500">Topic: <b>Customer created</b> — Auto-syncs WooCommerce customers to CRM contacts.</div>
                    </div>

                    <div className="p-2 bg-white rounded border border-purple-100 space-y-0.5">
                      <div className="font-bold text-purple-900 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> 4. Product Updated (`product.updated`)
                      </div>
                      <div className="text-[10px] text-stone-500">Topic: <b>Product updated</b> — Keeps stock & Meta WhatsApp Catalog in sync.</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
