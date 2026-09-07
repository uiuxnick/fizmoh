"use client"

import React, { useState, useEffect } from "react"
import {
  Utensils, Plus, RefreshCw, CheckCircle2, Clock, Users, Calendar,
  ChefHat, Layers, Sparkles, Check, Download, Info, Tag, Edit2, Trash2,
  Image as ImageIcon, Upload, Eye, Bell, ExternalLink, QrCode, Receipt,
  Store, CreditCard, DollarSign, TrendingUp, Percent, MapPin, Phone,
  MessageSquare, ShieldCheck, Flame, Leaf, Volume2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import KitchenKds from "@/components/restaurant/kitchen-kds"
import AiImportDialog from "@/components/restaurant/ai-import-dialog"
import OrderDetailsDialog from "@/components/restaurant/order-details-dialog"

export function RestaurantView() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  // Data states
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL")
  const [categories, setCategories] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [waiterRequests, setWaiterRequests] = useState<any[]>([])
  const [coupons, setCoupons] = useState<any[]>([])
  const [imports, setImports] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)

  // Dialog states
  const [isAiImportOpen, setIsAiImportOpen] = useState(false)
  const [isAddTableOpen, setIsAddTableOpen] = useState(false)
  const [isAddDishOpen, setIsAddDishOpen] = useState(false)
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false)
  const [isAddCouponOpen, setIsAddCouponOpen] = useState(false)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [selectedTableQr, setSelectedTableQr] = useState<any | null>(null)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null)

  // Table form state
  const [tableNumber, setTableNumber] = useState("")
  const [tableArea, setTableArea] = useState("INDOOR")
  const [tableType, setTableType] = useState("TABLE")
  const [tableRoomNumber, setTableRoomNumber] = useState("")
  const [tableCapacity, setTableCapacity] = useState("4")
  const [tableBranchId, setTableBranchId] = useState("")

  // Dish form state
  const [dishId, setDishId] = useState<string | null>(null)
  const [dishCategoryId, setDishCategoryId] = useState("")
  const [dishName, setDishName] = useState("")
  const [dishNameAr, setDishNameAr] = useState("")
  const [dishPrice, setDishPrice] = useState("")
  const [dishSalePrice, setDishSalePrice] = useState("")
  const [dishDesc, setDishDesc] = useState("")
  const [dishImageUrl, setDishImageUrl] = useState("")
  const [dishPrepTime, setDishPrepTime] = useState("15")
  const [dishVeg, setDishVeg] = useState(false)
  const [dishGlutenFree, setDishGlutenFree] = useState(false)
  const [dishFeatured, setDishFeatured] = useState(false)

  // Branch form state
  const [branchName, setBranchName] = useState("")
  const [branchNameAr, setBranchNameAr] = useState("")
  const [branchBusinessType, setBranchBusinessType] = useState("RESTAURANT")
  const [branchAddress, setBranchAddress] = useState("")
  const [branchPhone, setBranchPhone] = useState("")
  const [branchTaxRate, setBranchTaxRate] = useState("0.05")
  const [branchServiceCharge, setBranchServiceCharge] = useState("0")
  const [branchDeliveryFee, setBranchDeliveryFee] = useState("1.5")
  const [branchCurrency, setBranchCurrency] = useState("OMR")

  // Category form state
  const [categoryName, setCategoryName] = useState("")
  const [categoryNameAr, setCategoryNameAr] = useState("")

  // Coupon form state
  const [couponCode, setCouponCode] = useState("")
  const [couponName, setCouponName] = useState("")
  const [couponKind, setCouponKind] = useState("PERCENT")
  const [couponValue, setCouponValue] = useState("10")

  // Load All Dashboard Data
  const loadAllData = async () => {
    setLoading(true)
    try {
      const [bRes, mRes, tRes, oRes, wRes, cRes, aRes, iRes] = await Promise.all([
        fetch("/api/restaurant/branches").then((r) => r.json()).catch(() => ({ branches: [] })),
        fetch("/api/restaurant/menu").then((r) => r.json()).catch(() => ({ categories: [] })),
        fetch("/api/restaurant/tables").then((r) => r.json()).catch(() => ({ tables: [] })),
        fetch("/api/restaurant/orders?limit=100").then((r) => r.json()).catch(() => ({ orders: [] })),
        fetch("/api/restaurant/waiter-requests?status=ALL").then((r) => r.json()).catch(() => ({ requests: [] })),
        fetch("/api/restaurant/coupons").then((r) => r.json()).catch(() => ({ coupons: [] })),
        fetch("/api/restaurant/analytics?period=today").then((r) => r.json()).catch(() => ({ metrics: null })),
        fetch("/api/restaurant/import").then((r) => r.json()).catch(() => ({ imports: [] })),
      ])

      if (bRes.branches) setBranches(bRes.branches)
      if (mRes.categories) setCategories(mRes.categories)
      if (tRes.tables) setTables(tRes.tables)
      if (oRes.orders) setOrders(oRes.orders)
      if (wRes.requests) setWaiterRequests(wRes.requests)
      if (cRes.coupons) setCoupons(cRes.coupons)
      if (aRes.metrics) setAnalytics(aRes)
      if (iRes.imports) setImports(iRes.imports)
    } catch (err) {
      console.error("Error loading restaurant data", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()

    // Listen to realtime staff events
    const eventSource = new EventSource("/api/realtime/stream")
    eventSource.addEventListener("restaurant_order", () => loadAllData())
    eventSource.addEventListener("restaurant_waiter_call", () => loadAllData())
    eventSource.addEventListener("restaurant_bill_request", () => loadAllData())

    // Listen to tab switches from sidebar submenu
    const handleTab = (e: any) => {
      if (e?.detail) {
        const d = String(e.detail)
        if (d === "waiter") {
          setActiveTab("waiter_requests")
        } else if (d === "import" || d === "ai" || d === "ai_import") {
          setActiveTab("ai_import")
          setIsAiImportOpen(true)
        } else if (d === "menus" || d === "dishes") {
          setActiveTab("menu")
        } else if (d === "kds") {
          setActiveTab("kitchen")
        } else {
          setActiveTab(d)
        }
      }
    }
    window.addEventListener("restaurant-tab", handleTab)

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get("tab")
      if (tabParam) {
        if (tabParam === "waiter") setActiveTab("waiter_requests")
        else if (tabParam === "import" || tabParam === "ai" || tabParam === "ai_import") {
          setActiveTab("ai_import")
          setIsAiImportOpen(true)
        } else if (tabParam === "menus" || tabParam === "dishes") setActiveTab("menu")
        else if (tabParam === "kds") setActiveTab("kitchen")
        else setActiveTab(tabParam)
      }
    }

    return () => {
      eventSource.close()
      window.removeEventListener("restaurant-tab", handleTab)
    }
  }, [])

  // Quick Seed Demo Data
  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch("/api/restaurant/seed", { method: "POST" })
      if (res.ok) await loadAllData()
    } finally {
      setSeeding(false)
    }
  }

  // Save Dish
  const handleSaveDish = async () => {
    if (!dishName || !dishPrice || !dishCategoryId) return
    const payload = {
      id: dishId || undefined,
      categoryId: dishCategoryId,
      name: dishName,
      nameAr: dishNameAr || null,
      price: parseFloat(dishPrice),
      salePrice: dishSalePrice ? parseFloat(dishSalePrice) : null,
      description: dishDesc || null,
      imageUrl: dishImageUrl || null,
      prepTimeMinutes: parseInt(dishPrepTime) || 15,
      isVegetarian: dishVeg,
      isGlutenFree: dishGlutenFree,
      isFeatured: dishFeatured,
    }

    const res = await fetch("/api/restaurant/menu", {
      method: dishId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setIsAddDishOpen(false)
      loadAllData()
    }
  }

  // Save Category
  const handleSaveCategory = async () => {
    if (!categoryName) return
    const res = await fetch("/api/restaurant/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "CATEGORY",
        name: categoryName,
        nameAr: categoryNameAr || null,
      }),
    })
    if (res.ok) {
      setIsAddCategoryOpen(false)
      setCategoryName("")
      setCategoryNameAr("")
      loadAllData()
    }
  }

  // Save Table
  const handleSaveTable = async () => {
    if (!tableNumber) return
    const res = await fetch("/api/restaurant/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: tableNumber,
        area: tableArea,
        type: tableType,
        roomNumber: tableType === "ROOM" ? tableRoomNumber : null,
        capacity: parseInt(tableCapacity) || 4,
        branchId: tableBranchId || undefined,
      }),
    })
    if (res.ok) {
      setIsAddTableOpen(false)
      setTableNumber("")
      setTableRoomNumber("")
      loadAllData()
    }
  }

  // Save Branch
  const handleSaveBranch = async () => {
    if (!branchName) return
    const res = await fetch("/api/restaurant/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: branchName,
        nameAr: branchNameAr || null,
        businessType: branchBusinessType,
        address: branchAddress || null,
        phone: branchPhone || null,
        taxRate: parseFloat(branchTaxRate) || 0.05,
        serviceChargeRate: parseFloat(branchServiceCharge) || 0,
        deliveryFee: parseFloat(branchDeliveryFee) || 0,
        currency: branchCurrency,
      }),
    })
    if (res.ok) {
      setIsAddBranchOpen(false)
      setBranchName("")
      loadAllData()
    }
  }

  // Save Coupon
  const handleSaveCoupon = async () => {
    if (!couponCode || !couponName) return
    const res = await fetch("/api/restaurant/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: couponCode,
        name: couponName,
        kind: couponKind,
        value: parseFloat(couponValue) || 10,
      }),
    })
    if (res.ok) {
      setIsAddCouponOpen(false)
      setCouponCode("")
      setCouponName("")
      loadAllData()
    }
  }

  // Resolve Waiter Request
  const handleResolveWaiter = async (requestId: string) => {
    await fetch("/api/restaurant/waiter-requests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: requestId, status: "RESOLVED" }),
    })
    loadAllData()
  }

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId: string, status: string, note?: string) => {
    const res = await fetch("/api/restaurant/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, status, note }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.order) {
        setSelectedOrderDetails((prev: any) => (prev && prev.id === orderId ? { ...prev, ...data.order } : prev))
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...data.order } : o)))
      }
    }
    loadAllData()
  }

  // Update Order Payment
  const handleUpdateOrderPayment = async (orderId: string, paymentStatus: string, paymentMethod?: string) => {
    const res = await fetch("/api/restaurant/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, paymentStatus, paymentMethod }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.order) {
        setSelectedOrderDetails((prev: any) => (prev && prev.id === orderId ? { ...prev, ...data.order } : prev))
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...data.order } : o)))
      }
    }
    loadAllData()
  }

  // Open QR Preview
  const handleOpenQr = async (tableId: string) => {
    const res = await fetch(`/api/restaurant/tables/${tableId}/qr`)
    if (res.ok) {
      const data = await res.json()
      setSelectedTableQr(data)
    }
  }

  const activeBranchList = selectedBranchId === "ALL"
    ? branches
    : branches.filter((b) => b.id === selectedBranchId)

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6 pb-24">
      {/* ─── Top Bar: Branch Switcher & Quick Actions ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              Restaurant Operations
            </h2>
            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px] font-semibold px-2 py-0.5">
              Live Addon
            </Badge>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Multi-branch dining, digital QR menus, kitchen display system & live orders
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {branches.length > 1 && (
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-[180px] h-9 text-xs rounded-xl bg-stone-50 border-stone-200">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Branches ({branches.length})</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAiImportOpen(true)}
            className="rounded-xl text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Menu Scanner</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/dashboard/addons/smart-menu-ordering/kitchen", "_blank")}
            className="rounded-xl text-xs gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Open KDS</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            className="rounded-xl text-xs gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ─── 12 Management Tabs ─── */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val)
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href)
            url.searchParams.set("tab", val)
            window.history.replaceState(window.history.state, "", url.toString())
            window.dispatchEvent(new CustomEvent("restaurant-tab", { detail: val }))
          }
        }}
        className="space-y-6"
      >
        <div className="overflow-x-auto no-scrollbar pb-1">
          <TabsList className="bg-white p-1 rounded-xl inline-flex gap-1 border border-stone-200 shadow-2xs">
            <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-stone-900 data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-stone-900 data-[state=active]:text-white flex items-center gap-1">
              <span>Orders</span>
              {orders.filter((o) => ["PENDING", "ACCEPTED", "PREPARING"].includes(o.status)).length > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {orders.filter((o) => ["PENDING", "ACCEPTED", "PREPARING"].includes(o.status)).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="menu" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-stone-900 data-[state=active]:text-white">Menu Catalog</TabsTrigger>
            <TabsTrigger value="tables" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-stone-900 data-[state=active]:text-white">Tables & QR</TabsTrigger>
            <TabsTrigger value="kitchen" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-stone-900 data-[state=active]:text-white">Kitchen KDS</TabsTrigger>
            <TabsTrigger value="waiter_requests" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-stone-900 data-[state=active]:text-white flex items-center gap-1">
              <span>Waiters</span>
              {waiterRequests.filter((w) => w.status === "PENDING").length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
                  {waiterRequests.filter((w) => w.status === "PENDING").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ai_import" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-stone-900 data-[state=active]:text-white">AI Imports</TabsTrigger>
            <TabsTrigger value="coupons" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-stone-900 data-[state=active]:text-white">Coupons</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-stone-900 data-[state=active]:text-white">Payments</TabsTrigger>
            <TabsTrigger value="customers" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-stone-900 data-[state=active]:text-white">Customers</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-stone-900 data-[state=active]:text-white">Analytics</TabsTrigger>
            <TabsTrigger value="branches" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-stone-900 data-[state=active]:text-white">Branches</TabsTrigger>
          </TabsList>
        </div>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-3xl border-slate-200 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Today's Sales</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  OMR {(analytics?.metrics?.totalRevenue || 0).toFixed(2)}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {analytics?.metrics?.totalOrders || orders.length} orders today
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Table Occupancy</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {tables.filter((t) => t.status === "OCCUPIED" || t.status === "BILL_REQUESTED").length} / {tables.length}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {tables.length > 0
                    ? Math.round((tables.filter((t) => t.status === "OCCUPIED").length / tables.length) * 100)
                    : 0}% currently dining
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Active In Kitchen</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ChefHat className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {orders.filter((o) => ["PENDING", "ACCEPTED", "PREPARING"].includes(o.status)).length}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Avg prep time: {analytics?.metrics?.avgPrepTime || 15} mins
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Waiter Alerts</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {waiterRequests.filter((w) => w.status === "PENDING").length}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Pending customer requests</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Setup / Seed prompt if menu empty */}
          {categories.length === 0 && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between shadow-md">
              <div>
                <h3 className="text-lg font-black">Your Restaurant Menu is Empty</h3>
                <p className="text-xs text-emerald-100 mt-1">
                  You can seed delicious Omani dining demo dishes or use AI import to scan your physical paper menu.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs rounded-xl"
                >
                  {seeding ? "Seeding Menu..." : "Seed Omani Menu"}
                </Button>
                <Button
                  onClick={() => setIsAiImportOpen(true)}
                  variant="outline"
                  className="bg-emerald-700/50 text-white border-white/30 hover:bg-emerald-700 font-bold text-xs rounded-xl"
                >
                  Upload Menu Scan
                </Button>
              </div>
            </div>
          )}

          {/* Top Selling Dishes & Live Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-3xl border-slate-200 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Popular Dishes Today</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.topDishes && analytics.topDishes.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {analytics.topDishes.slice(0, 5).map((dish: any, idx: number) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-5 font-bold text-slate-400 font-mono">#{idx + 1}</span>
                          <span className="font-bold text-slate-800">{dish.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-[10px]">{dish.count} ordered</Badge>
                          <span className="font-mono font-bold text-slate-700">OMR {dish.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-8 text-center">No orders recorded yet today</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Recent Orders</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {orders.slice(0, 5).map((o) => (
                      <div
                        key={o.id}
                        onClick={() => setSelectedOrderDetails(o)}
                        className="py-2.5 px-2 -mx-2 rounded-xl flex items-center justify-between text-xs hover:bg-slate-50 cursor-pointer transition"
                        title="Click to view full order details"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{o.orderNumber || `#${o.id.slice(-4)}`}</span>
                            <span className="text-slate-500">
                              {o.orderType === "DINE_IN" ? `Table ${o.tableNumber || "-"}` : o.orderType}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-[10px] ${
                              o.status === "READY"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : o.status === "PREPARING"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                            variant="outline"
                          >
                            {o.status}
                          </Badge>
                          <span className="font-mono font-bold text-slate-800">
                            OMR {o.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-8 text-center">No orders yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. ORDERS TAB */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Live Dining & Takeaway Orders</h3>
            <Button size="sm" onClick={loadAllData} variant="outline" className="rounded-xl text-xs gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Order #</th>
                    <th className="p-3.5">Type & Table</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Time</th>
                    <th className="p-3.5">Total</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderDetails(order)}
                      className="hover:bg-slate-50/80 cursor-pointer transition group"
                      title="Click to view full order details, bill & status change"
                    >
                      <td className="p-3.5 font-mono font-bold text-slate-900 group-hover:text-emerald-700 transition">
                        {order.orderNumber || `#${order.id.slice(-4)}`}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800">
                          {order.orderType === "DINE_IN" && order.tableNumber
                            ? `Table ${order.tableNumber}`
                            : order.orderType === "ROOM_SERVICE" && order.roomNumber
                            ? `Room ${order.roomNumber}`
                            : order.orderType}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <div className="font-medium text-slate-900">{order.customerName || "Guest Diner"}</div>
                        {order.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-mono">{order.customerPhone}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-700">
                        {order.currency || "OMR"} {order.totalAmount.toFixed(2)}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            order.status === "READY"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : order.status === "PREPARING"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : order.status === "PENDING"
                              ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                              : order.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedOrderDetails(order)}
                          className="h-7 px-2 text-[11px] rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>Details</span>
                        </Button>
                        {order.status === "PENDING" && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(order.id, "PREPARING")}
                            className="h-7 text-[11px] rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                          >
                            Cook
                          </Button>
                        )}
                        {order.status === "PREPARING" && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(order.id, "READY")}
                            className="h-7 text-[11px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            Ready
                          </Button>
                        )}
                        {order.status === "READY" && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOrderStatus(order.id, "COMPLETED")}
                            variant="outline"
                            className="h-7 text-[11px] rounded-lg"
                          >
                            Served
                          </Button>
                        )}
                        {order.publicToken && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/order/${order.publicToken}`, "_blank")}
                            className="h-7 w-7 p-0 rounded-lg text-slate-500"
                            title="Live Customer View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* 3. MENU CATALOG TAB */}
        <TabsContent value="menu" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Dishes & Menu Catalog</h3>
              <p className="text-xs text-slate-500">Manage categories, dishes, prices, and dietary flags</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddCategoryOpen(true)}
                className="rounded-xl text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setDishId(null)
                  setDishName("")
                  setDishPrice("")
                  setDishDesc("")
                  setDishCategoryId(categories[0]?.id || "")
                  setIsAddDishOpen(true)
                }}
                className="rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Dish</span>
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {categories.map((cat) => (
              <Card key={cat.id} className="rounded-3xl border-slate-200 shadow-xs">
                <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <span>{cat.name}</span>
                      {cat.nameAr && <span className="text-slate-400 font-normal">({cat.nameAr})</span>}
                    </CardTitle>
                    {cat.description && <CardDescription className="text-xs">{cat.description}</CardDescription>}
                  </div>
                  <Badge variant="secondary" className="text-xs">{cat.items?.length || 0} items</Badge>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(cat.items || []).map((dish: any) => (
                      <div
                        key={dish.id}
                        className="border border-slate-200 rounded-2xl p-3 bg-white flex gap-3 justify-between hover:border-emerald-300 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{dish.name}</h4>
                          {dish.nameAr && <p className="text-[11px] text-slate-400 truncate">{dish.nameAr}</p>}
                          <div className="flex items-center gap-1.5 mt-1">
                            {dish.isVegetarian && <Badge className="text-[9px] bg-green-50 text-green-700 border-green-200 px-1 py-0">Veg</Badge>}
                            {dish.isFeatured && <Badge className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 px-1 py-0">Special</Badge>}
                          </div>
                          <p className="font-mono font-bold text-xs text-emerald-700 mt-2">
                            {dish.currency || "OMR"} {dish.price.toFixed(2)}
                          </p>
                        </div>
                        {dish.imageUrl ? (
                          <img src={dish.imageUrl} alt={dish.name} className="w-16 h-16 rounded-xl object-cover shrink-0 border" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 shrink-0">
                            <Utensils className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 4. TABLES & QR TAB */}
        <TabsContent value="tables" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Visual Table & Room Layout</h3>
              <p className="text-xs text-slate-500">Live seating status, occupancy and cryptographic QR generation</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddTableOpen(true)}
              className="rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Table / Room</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tables.map((tbl) => {
              const isOccupied = tbl.status === "OCCUPIED"
              const isBill = tbl.status === "BILL_REQUESTED"

              return (
                <div
                  key={tbl.id}
                  className={`rounded-2xl border p-3.5 flex flex-col justify-between transition shadow-xs ${
                    isBill
                      ? "border-rose-400 bg-rose-50/50"
                      : isOccupied
                      ? "border-amber-400 bg-amber-50/40"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold ${
                          isBill
                            ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                            : isOccupied
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {tbl.status}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleOpenQr(tbl.id)}
                        className="text-slate-400 hover:text-slate-800"
                        title="View QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="font-black text-base text-slate-900">
                      {tbl.type === "ROOM" ? `Room ${tbl.roomNumber || tbl.number}` : `T-${tbl.number}`}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {tbl.area || "Main"} • {tbl.capacity} seats
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                    {tbl.token && (
                      <a
                        href={`/r/${tbl.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <span>Customer URL</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* 5. KITCHEN KDS TAB */}
        <TabsContent value="kitchen" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Kitchen Display System (KDS)</h3>
              <p className="text-xs text-slate-500">Embedded live touch screen with timers and alerts</p>
            </div>
            <Button
              size="sm"
              onClick={() => window.open("/dashboard/addons/smart-menu-ordering/kitchen", "_blank")}
              className="rounded-xl text-xs gap-1.5 bg-slate-900 text-white"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Dedicated Fullscreen KDS</span>
            </Button>
          </div>

          <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-xl max-h-[700px] overflow-y-auto">
            <KitchenKds />
          </div>
        </TabsContent>

        {/* 6. WAITER REQUESTS TAB */}
        <TabsContent value="waiter_requests" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Customer Waiter Calls & Bill Requests</h3>
              <p className="text-xs text-slate-500">Live service calls dispatched from customer smartphones</p>
            </div>
            <Button size="sm" onClick={loadAllData} variant="outline" className="rounded-xl text-xs gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Table / Room</th>
                  <th className="p-3.5">Request Type</th>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Message</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {waiterRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-900">
                      {req.roomNumber ? `Room ${req.roomNumber}` : `Table ${req.tableNumber || "-"}`}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          req.requestType === "BILL"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {req.requestType}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-3.5 text-slate-600">{req.message || "-"}</td>
                    <td className="p-3.5">
                      <span className={`font-bold ${req.status === "PENDING" ? "text-amber-600 animate-pulse" : "text-emerald-700"}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {req.status === "PENDING" && (
                        <Button
                          size="sm"
                          onClick={() => handleResolveWaiter(req.id)}
                          className="h-7 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          Resolve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 7. AI IMPORTS TAB */}
        <TabsContent value="ai_import" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">AI Printed Menu Import History</h3>
              <p className="text-xs text-slate-500">Scanned PDFs and photos processed with Claude & GPT-4o</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAiImportOpen(true)}
              className="rounded-xl text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New AI Import</span>
            </Button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="p-3.5">File Name</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Extracted</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {imports.map((imp) => (
                  <tr key={imp.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-900">{imp.fileName}</td>
                    <td className="p-3.5 text-slate-500">{imp.fileType}</td>
                    <td className="p-3.5 font-mono">
                      {imp.extractedProductsCount} dishes / {imp.extractedCategoriesCount} categories
                    </td>
                    <td className="p-3.5">
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                        {imp.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(imp.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 8. COUPONS TAB */}
        <TabsContent value="coupons" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Discounts & Promo Codes</h3>
              <p className="text-xs text-slate-500">Customer checkout discount vouchers</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddCouponOpen(true)}
              className="rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Coupon</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.map((coupon) => (
              <Card key={coupon.id} className="rounded-2xl border-slate-200 shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-sm bg-slate-100 px-2.5 py-1 rounded-lg text-slate-900">
                      {coupon.code}
                    </span>
                    <h4 className="font-bold text-xs text-slate-800 mt-2">{coupon.name}</h4>
                    <p className="text-xs text-emerald-700 font-bold mt-0.5">
                      {coupon.kind === "PERCENT" ? `${coupon.value}% OFF` : `OMR ${coupon.value} OFF`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Active</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 9. PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Order Payments & Settlements</h3>
              <p className="text-xs text-slate-500">Paymob, AmwalPay, Cash & Room charge reconciliation</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Order #</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Payment Status</th>
                  <th className="p-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{o.orderNumber || `#${o.id.slice(-4)}`}</td>
                    <td className="p-3.5 text-slate-700 font-semibold">{o.paymentMethod || "CASH"}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {o.currency || "OMR"} {o.totalAmount.toFixed(2)}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          o.paymentStatus === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {o.paymentStatus || "UNPAID"}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(o.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 10. CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Diner CRM Directory</h3>
              <p className="text-xs text-slate-500">Customer contacts and WhatsApp ordering history</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Phone (WhatsApp)</th>
                  <th className="p-3.5">Latest Order</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.filter((o) => o.customerPhone).slice(0, 30).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-bold text-slate-900">{o.customerName || "Diner"}</td>
                    <td className="p-3.5 font-mono text-emerald-700">{o.customerPhone}</td>
                    <td className="p-3.5 text-slate-500">
                      {o.orderNumber} ({new Date(o.createdAt).toLocaleDateString()})
                    </td>
                    <td className="p-3.5 text-right">
                      {o.customerPhone && (
                        <a
                          href={`https://wa.me/${o.customerPhone.replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition text-[11px]"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* 11. ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-3xl border-slate-200 shadow-xs">
              <CardContent className="p-5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Total Orders</span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">{analytics?.metrics?.totalOrders || orders.length}</h3>
                <p className="text-xs text-slate-500 mt-1">Orders processed</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-xs">
              <CardContent className="p-5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Avg Order Value</span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  OMR {(analytics?.metrics?.avgOrderValue || 0).toFixed(2)}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Per dining check</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-xs">
              <CardContent className="p-5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Avg Prep Speed</span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">{analytics?.metrics?.avgPrepTime || 15} mins</h3>
                <p className="text-xs text-slate-500 mt-1">Order to Ready</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 12. BRANCHES TAB */}
        <TabsContent value="branches" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Branches & Operations</h3>
              <p className="text-xs text-slate-500">Multi-location dining, tax rates & service charges</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddBranchOpen(true)}
              className="rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Branch</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b) => (
              <Card key={b.id} className="rounded-3xl border-slate-200 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold">{b.name}</CardTitle>
                    {b.isDefault && <Badge className="text-[10px] bg-emerald-100 text-emerald-800">Default</Badge>}
                  </div>
                  {b.nameAr && <CardDescription className="text-xs">{b.nameAr}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Type</span>
                    <span className="font-bold text-slate-800">{b.businessType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (VAT)</span>
                    <span className="font-mono">{((b.taxRate || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Charge</span>
                    <span className="font-mono">{((b.serviceChargeRate || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Currency</span>
                    <span className="font-mono font-bold">{b.currency || "OMR"}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── DIALOGS ─── */}

      {/* AI Import Modal */}
      <AiImportDialog
        isOpen={isAiImportOpen}
        onClose={() => setIsAiImportOpen(false)}
        onImportComplete={loadAllData}
        branchId={selectedBranchId !== "ALL" ? selectedBranchId : null}
      />

      {/* Add Table Modal */}
      <Dialog open={isAddTableOpen} onOpenChange={setIsAddTableOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add Table or Room</DialogTitle>
            <DialogDescription>Create a seating table or hotel room with a unique QR code.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label>Type</Label>
              <Select value={tableType} onValueChange={setTableType}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TABLE">Dining Table</SelectItem>
                  <SelectItem value="ROOM">Hotel Room / Suite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Table / Room Number</Label>
              <Input
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. 12 or 402"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Area / Section</Label>
              <Select value={tableArea} onValueChange={setTableArea}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDOOR">Indoor</SelectItem>
                  <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                  <SelectItem value="TERRACE">Terrace</SelectItem>
                  <SelectItem value="VIP">VIP Lounge</SelectItem>
                  <SelectItem value="ROOM">Guest Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveTable} className="bg-emerald-600 text-white rounded-xl">Create Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Modal */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add Menu Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label>Category Name (English)</Label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Appetizers"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Category Name (Arabic)</Label>
              <Input
                value={categoryNameAr}
                onChange={(e) => setCategoryNameAr(e.target.value)}
                placeholder="e.g. المقبلات"
                className="rounded-xl mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveCategory} className="bg-emerald-600 text-white rounded-xl">Save Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dish Modal */}
      <Dialog open={isAddDishOpen} onOpenChange={setIsAddDishOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dishId ? "Edit Dish" : "Add New Dish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label>Category</Label>
              <Select value={dishCategoryId} onValueChange={setDishCategoryId}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Dish Name (EN)</Label>
                <Input value={dishName} onChange={(e) => setDishName(e.target.value)} placeholder="e.g. Shuwa" className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>Dish Name (AR)</Label>
                <Input value={dishNameAr} onChange={(e) => setDishNameAr(e.target.value)} placeholder="e.g. شواء عماني" className="rounded-xl mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Price (OMR)</Label>
                <Input type="number" step="0.1" value={dishPrice} onChange={(e) => setDishPrice(e.target.value)} placeholder="3.500" className="rounded-xl mt-1 font-mono" />
              </div>
              <div>
                <Label>Sale Price (Optional)</Label>
                <Input type="number" step="0.1" value={dishSalePrice} onChange={(e) => setDishSalePrice(e.target.value)} placeholder="2.900" className="rounded-xl mt-1 font-mono" />
              </div>
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={dishImageUrl} onChange={(e) => setDishImageUrl(e.target.value)} placeholder="https://..." className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={dishDesc} onChange={(e) => setDishDesc(e.target.value)} placeholder="Tender slow-cooked spiced lamb..." className="rounded-xl mt-1" />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={dishVeg} onChange={(e) => setDishVeg(e.target.checked)} className="rounded" />
                <span>Vegetarian</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={dishFeatured} onChange={(e) => setDishFeatured(e.target.checked)} className="rounded" />
                <span>Featured / Chef Special</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveDish} className="bg-emerald-600 text-white rounded-xl">Save Dish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Branch Modal */}
      <Dialog open={isAddBranchOpen} onOpenChange={setIsAddBranchOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add Branch Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label>Branch Name</Label>
              <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g. Al Mouj Marina Branch" className="rounded-xl mt-1" />
            </div>
            <div>
              <Label>Business Type</Label>
              <Select value={branchBusinessType} onValueChange={setBranchBusinessType}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                  <SelectItem value="CAFE">Café / Lounge</SelectItem>
                  <SelectItem value="HOTEL">Hotel & Room Service</SelectItem>
                  <SelectItem value="CLOUD_KITCHEN">Cloud Kitchen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Address / City</Label>
              <Input value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} placeholder="Muscat, Oman" className="rounded-xl mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveBranch} className="bg-emerald-600 text-white rounded-xl">Save Branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Coupon Modal */}
      <Dialog open={isAddCouponOpen} onOpenChange={setIsAddCouponOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add Discount Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label>Coupon Code</Label>
              <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME10" className="rounded-xl mt-1 font-mono uppercase" />
            </div>
            <div>
              <Label>Name / Description</Label>
              <Input value={couponName} onChange={(e) => setCouponName(e.target.value)} placeholder="10% Welcome Discount" className="rounded-xl mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <Select value={couponKind} onValueChange={setCouponKind}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount (OMR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value</Label>
                <Input type="number" value={couponValue} onChange={(e) => setCouponValue(e.target.value)} className="rounded-xl mt-1 font-mono" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveCoupon} className="bg-emerald-600 text-white rounded-xl">Create Coupon</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table QR Preview Modal */}
      {selectedTableQr && (
        <Dialog open={Boolean(selectedTableQr)} onOpenChange={() => setSelectedTableQr(null)}>
          <DialogContent className="sm:max-w-sm rounded-3xl text-center">
            <DialogHeader>
              <DialogTitle>Table {selectedTableQr.tableNumber} QR Code</DialogTitle>
              <DialogDescription>Scan to open digital menu & order directly</DialogDescription>
            </DialogHeader>
            <div className="p-4 flex flex-col items-center">
              <img src={selectedTableQr.qrDataUrl} alt="QR Code" className="w-56 h-56 rounded-2xl border p-2 bg-white" />
              <p className="text-xs text-slate-500 mt-2 font-mono break-all">{selectedTableQr.url}</p>
            </div>
            <DialogFooter className="flex-row gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/restaurant/tables/${selectedTableQr.tableId}/qr?format=png`, "_blank")}
                className="rounded-xl text-xs"
              >
                Download PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/restaurant/tables/${selectedTableQr.tableId}/qr?format=svg`, "_blank")}
                className="rounded-xl text-xs"
              >
                Download SVG
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Order Details & Status Workflow Modal */}
      {selectedOrderDetails && (
        <OrderDetailsDialog
          order={selectedOrderDetails}
          isOpen={Boolean(selectedOrderDetails)}
          onClose={() => setSelectedOrderDetails(null)}
          onUpdateStatus={handleUpdateOrderStatus}
          onUpdatePayment={handleUpdateOrderPayment}
        />
      )}
    </div>
  )
}
