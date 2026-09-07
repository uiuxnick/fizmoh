"use client"

import React, { useState, useMemo, useEffect } from "react"
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  X,
  Check,
  Bell,
  Utensils,
  Receipt,
  Sparkles,
  Info,
  MapPin,
  Phone,
  Flame,
  Leaf,
  Globe,
  Loader2,
  ArrowRight,
  ChevronDown,
} from "lucide-react"

export interface MenuItemData {
  id: string
  name: string
  nameAr?: string | null
  description?: string | null
  descriptionAr?: string | null
  price: number
  salePrice?: number | null
  imageUrl?: string | null
  allergens?: string | null
  isVegetarian?: boolean
  isVegan?: boolean
  isGlutenFree?: boolean
  isSoldOut?: boolean
  isFeatured?: boolean
  prepTimeMinutes?: number
  calories?: number | null
  tagsJson?: string | null
  variantsJson?: string | null
  modifiersJson?: string | null
}

export interface MenuCategoryData {
  id: string
  name: string
  nameAr?: string | null
  description?: string | null
  descriptionAr?: string | null
  imageUrl?: string | null
  icon?: string | null
  items: MenuItemData[]
}

export interface BranchData {
  id: string
  name: string
  nameAr?: string | null
  slug: string
  businessType?: string
  currency?: string
  taxRate?: number
  serviceChargeRate?: number
  deliveryFee?: number
  address?: string | null
  phone?: string | null
}

export interface TableData {
  id: string
  number: string
  name?: string | null
  area?: string
  type?: string
  roomNumber?: string | null
  branchId?: string | null
  branchSlug?: string | null
}

export interface CartItem {
  id: string
  menuItemId: string
  name: string
  nameAr?: string | null
  price: number
  qty: number
  variant?: { id: string; name: string; nameAr?: string | null; price: number } | null
  modifiers: Array<{ id: string; name: string; nameAr?: string | null; price: number }>
  notes?: string | null
}

interface CustomerMenuProps {
  tenant: {
    id: string
    name: string
    slug: string
    logoUrl?: string | null
    currency: string
    phone?: string | null
  }
  branches: BranchData[]
  activeBranch: BranchData | null
  table: TableData | null
  categories: MenuCategoryData[]
  discounts: Array<{ code: string; name: string; kind: string; value: number }>
  tableToken?: string
}

export default function CustomerMenu({
  tenant,
  branches,
  activeBranch,
  table,
  categories,
  discounts,
  tableToken,
}: CustomerMenuProps) {
  const [lang, setLang] = useState<"en" | "ar">("en")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || "")
  const [customizingItem, setCustomizingItem] = useState<MenuItemData | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false)

  // Item customization modal state
  const [chosenVariantId, setChosenVariantId] = useState<string | null>(null)
  const [chosenModifierIds, setChosenModifierIds] = useState<string[]>([])
  const [itemNotes, setItemNotes] = useState("")
  const [itemQty, setItemQty] = useState(1)

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [discountCode, setDiscountCode] = useState("")
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; name?: string; kind: string; value: number } | null>(null)
  const [discountError, setDiscountError] = useState("")

  // Checkout order info
  const isRoom = table?.type === "ROOM" || Boolean(table?.roomNumber)
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ROOM_SERVICE">(
    isRoom ? "ROOM_SERVICE" : table ? "DINE_IN" : "TAKEAWAY"
  )
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [roomNumber, setRoomNumber] = useState(table?.roomNumber || "")
  const [specialNotes, setSpecialNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD_AT_VENUE" | "ROOM_CHARGE">("CASH")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  // Waiter call state
  const [waiterRequestType, setWaiterRequestType] = useState<"WATER" | "BILL" | "CUTLERY" | "CLEAN_TABLE" | "ASSISTANCE">("WATER")
  const [waiterMessage, setWaiterMessage] = useState("")
  const [waiterCalling, setWaiterCalling] = useState(false)
  const [waiterSuccessMsg, setWaiterSuccessMsg] = useState("")

  const currency = activeBranch?.currency || tenant.currency || "OMR"
  const isRtl = lang === "ar"

  // Open item customization dialog
  const openCustomization = (item: MenuItemData) => {
    setCustomizingItem(item)
    setItemQty(1)
    setItemNotes("")
    setChosenModifierIds([])

    // Select default variant if variants exist
    if (item.variantsJson) {
      try {
        const variants = JSON.parse(item.variantsJson)
        if (Array.isArray(variants) && variants.length > 0) {
          setChosenVariantId(variants[0].id)
        } else {
          setChosenVariantId(null)
        }
      } catch {
        setChosenVariantId(null)
      }
    } else {
      setChosenVariantId(null)
    }
  }

  // Parse variants and modifiers of active item
  const currentVariants = useMemo(() => {
    if (!customizingItem?.variantsJson) return []
    try {
      return JSON.parse(customizingItem.variantsJson) as Array<{ id: string; name: string; nameAr?: string; price: number }>
    } catch {
      return []
    }
  }, [customizingItem])

  const currentModifierGroups = useMemo(() => {
    if (!customizingItem?.modifiersJson) return []
    try {
      return JSON.parse(customizingItem.modifiersJson) as Array<{
        id: string
        name: string
        nameAr?: string
        required?: boolean
        min?: number
        max?: number
        options: Array<{ id: string; name: string; nameAr?: string; price: number }>
      }>
    } catch {
      return []
    }
  }, [customizingItem])

  // Compute live price inside customization modal
  const modalUnitPrice = useMemo(() => {
    if (!customizingItem) return 0
    let price = customizingItem.salePrice || customizingItem.price
    if (chosenVariantId && currentVariants.length > 0) {
      const v = currentVariants.find((x) => x.id === chosenVariantId)
      if (v) price = v.price
    }
    for (const group of currentModifierGroups) {
      for (const opt of group.options || []) {
        if (chosenModifierIds.includes(opt.id)) {
          price += opt.price || 0
        }
      }
    }
    return price
  }, [customizingItem, chosenVariantId, chosenModifierIds, currentVariants, currentModifierGroups])

  // Add customized item to cart
  const handleAddToCart = () => {
    if (!customizingItem) return

    let variantObj: any = null
    if (chosenVariantId && currentVariants.length > 0) {
      const match = currentVariants.find((v) => v.id === chosenVariantId)
      if (match) variantObj = match
    }

    const modifierObjs: Array<{ id: string; name: string; nameAr?: string | null; price: number }> = []
    for (const group of currentModifierGroups) {
      for (const opt of group.options || []) {
        if (chosenModifierIds.includes(opt.id)) {
          modifierObjs.push(opt)
        }
      }
    }

    const newItem: CartItem = {
      id: `${customizingItem.id}_${Date.now()}`,
      menuItemId: customizingItem.id,
      name: customizingItem.name,
      nameAr: customizingItem.nameAr,
      price: modalUnitPrice,
      qty: itemQty,
      variant: variantObj,
      modifiers: modifierObjs,
      notes: itemNotes.trim() || null,
    }

    setCart((prev) => [...prev, newItem])
    setCustomizingItem(null)
  }

  // Cart operations
  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.qty + delta
            return nextQty > 0 ? { ...item, qty: nextQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  // Subtotal & Calculations
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)

  let discountAmount = 0
  if (appliedDiscount) {
    if (appliedDiscount.kind === "PERCENT") {
      discountAmount = (subtotal * appliedDiscount.value) / 100
    } else {
      discountAmount = Math.min(subtotal, appliedDiscount.value)
    }
  }

  const taxRate = activeBranch?.taxRate || 0.05
  const serviceRate =
    orderType === "DINE_IN" || orderType === "ROOM_SERVICE" ? (activeBranch?.serviceChargeRate || 0) : 0
  const deliveryFee = orderType === "DELIVERY" ? (activeBranch?.deliveryFee || 1.5) : 0

  const taxableAmount = Math.max(0, subtotal - discountAmount)
  const taxAmount = taxableAmount * taxRate
  const serviceChargeAmount = subtotal * serviceRate
  const grandTotal = taxableAmount + taxAmount + serviceChargeAmount + deliveryFee

  // Handle coupon apply
  const handleApplyCoupon = () => {
    setDiscountError("")
    if (!discountCode.trim()) return
    const match = discounts.find((d) => d.code.toUpperCase() === discountCode.trim().toUpperCase())
    if (match) {
      setAppliedDiscount(match)
    } else {
      setDiscountError(isRtl ? "رمز الخصم غير صالح أو منتهي الصلاحية" : "Invalid or expired promo code")
    }
  }

  // Handle Order Submit
  const handlePlaceOrder = async () => {
    setSubmitError("")
    if (cart.length === 0) return

    if (orderType === "DELIVERY" && !deliveryAddress.trim()) {
      setSubmitError(isRtl ? "يرجى كتابة عنوان التوصيل" : "Please provide a delivery address")
      return
    }

    if (orderType === "ROOM_SERVICE" && !roomNumber.trim()) {
      setSubmitError(isRtl ? "يرجى تحديد رقم الغرفة" : "Please provide your room number")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/restaurant/public/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: tenant.slug,
          branchSlug: activeBranch?.slug,
          tableToken,
          roomNumber: orderType === "ROOM_SERVICE" ? roomNumber : undefined,
          orderType,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          deliveryAddress: deliveryAddress.trim() || undefined,
          specialNotes: specialNotes.trim() || undefined,
          discountCode: appliedDiscount?.code,
          paymentMethod,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            qty: c.qty,
            variantId: c.variant?.id,
            modifierOptionIds: c.modifiers.map((m) => m.id),
            notes: c.notes,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to place order")
      }

      // Redirect to live order tracking page
      window.location.href = data.trackingUrl || `/order/${data.publicToken}`
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong placing your order")
      setIsSubmitting(false)
    }
  }

  // Handle Waiter Call
  const handleCallWaiter = async () => {
    setWaiterCalling(true)
    setWaiterSuccessMsg("")
    try {
      const res = await fetch("/api/restaurant/public/waiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: tenant.slug,
          tableToken,
          roomNumber: table?.roomNumber || roomNumber || undefined,
          requestType: waiterRequestType,
          message: waiterMessage.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")

      setWaiterSuccessMsg(
        isRtl ? "تم إخطار فريق العمل وسيقومون بخدمتكم فوراً" : "Staff has been notified and will attend to you shortly!"
      )
      setTimeout(() => {
        setIsWaiterModalOpen(false)
        setWaiterSuccessMsg("")
        setWaiterMessage("")
      }, 2500)
    } catch {
      setWaiterSuccessMsg(isRtl ? "تعذر إرسال الطلب، يرجى المحاولة لاحقاً" : "Could not notify staff. Please try again.")
    } finally {
      setWaiterCalling(false)
    }
  }

  // Filtered categories and dishes
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const q = searchQuery.toLowerCase()

    return categories
      .map((cat) => {
        const matchingItems = cat.items.filter((item) => {
          const nameMatch = item.name.toLowerCase().includes(q) || (item.nameAr && item.nameAr.includes(q))
          const descMatch = item.description?.toLowerCase().includes(q) || (item.descriptionAr && item.descriptionAr.includes(q))
          const tagMatch = item.tagsJson?.toLowerCase().includes(q)
          return nameMatch || descMatch || tagMatch
        })
        return matchingItems.length > 0 ? { ...cat, items: matchingItems } : null
      })
      .filter(Boolean) as MenuCategoryData[]
  }, [categories, searchQuery])

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-50 text-slate-900 pb-32 selection:bg-emerald-500 selection:text-white"
    >
      {/* ─── Top Header & Hero ─── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                {tenant.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-bold text-slate-900 leading-tight flex items-center gap-2">
                <span>{tenant.name}</span>
                {activeBranch && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                    {isRtl && activeBranch.nameAr ? activeBranch.nameAr : activeBranch.name}
                  </span>
                )}
              </h1>
              {table && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium mt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {table.type === "ROOM" || table.roomNumber
                      ? `${isRtl ? "غرفة" : "Room"} ${table.roomNumber || table.number}`
                      : `${isRtl ? "طاولة" : "Table"} ${table.number}`}
                  </span>
                  {table.area && (
                    <span className="text-slate-400 font-normal">
                      • {table.area}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Waiter Bell (if table QR or room) */}
            {table && (
              <button
                type="button"
                onClick={() => setIsWaiterModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition"
              >
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">{isRtl ? "طلب نادل" : "Call Waiter"}</span>
              </button>
            )}

            {/* Language toggle */}
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === "en" ? "عربي" : "EN"}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search
              className={`absolute top-2.5 w-4 h-4 text-slate-400 ${
                isRtl ? "right-3" : "left-3"
              }`}
            />
            <input
              type="text"
              placeholder={isRtl ? "ابحث في قائمة الطعام..." : "Search menu, dishes, or ingredients..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full py-2 bg-slate-100/80 rounded-xl text-sm border-0 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition ${
                isRtl ? "pr-9 pl-4" : "pl-9 pr-4"
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className={`absolute top-2.5 text-slate-400 hover:text-slate-600 ${
                  isRtl ? "left-3" : "right-3"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Sticky Categories */}
        <div className="max-w-3xl mx-auto px-4 overflow-x-auto no-scrollbar flex items-center gap-2 pb-2.5 pt-1">
          {categories.map((cat) => {
            const isActive = selectedCategoryId === cat.id
            const label = isRtl && cat.nameAr ? cat.nameAr : cat.name
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategoryId(cat.id)
                  const el = document.getElementById(`category-${cat.id}`)
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </header>

      {/* ─── Promotions Banner ─── */}
      {discounts.length > 0 && !searchQuery && (
        <div className="max-w-3xl mx-auto px-4 pt-3">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <p className="text-xs text-emerald-100 font-medium">
                  {isRtl ? "عروض حصرية اليوم" : "Special Offers"}
                </p>
                <h4 className="font-bold text-sm sm:text-base">
                  {discounts[0].name}
                </h4>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs bg-white text-emerald-800 font-mono font-bold px-2.5 py-1 rounded-lg">
                {discounts[0].code}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Menu Categories & Dishes List ─── */}
      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-8">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Utensils className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-base">
              {isRtl ? "لم يتم العثور على أطباق مطابقة للبحث" : "No dishes found matching your search"}
            </p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} id={`category-${category.id}`} className="scroll-mt-36">
              <div className="mb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>{isRtl && category.nameAr ? category.nameAr : category.name}</span>
                  <span className="text-xs font-normal text-slate-400">
                    ({category.items.length})
                  </span>
                </h2>
                {(category.description || category.descriptionAr) && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRtl && category.descriptionAr ? category.descriptionAr : category.description}
                  </p>
                )}
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {category.items.map((dish) => {
                  const dishTitle = isRtl && dish.nameAr ? dish.nameAr : dish.name
                  const dishDesc = isRtl && dish.descriptionAr ? dish.descriptionAr : dish.description
                  const displayPrice = dish.salePrice || dish.price

                  let tags: string[] = []
                  if (dish.tagsJson) {
                    try {
                      tags = JSON.parse(dish.tagsJson)
                    } catch {}
                  }

                  return (
                    <div
                      key={dish.id}
                      onClick={() => openCustomization(dish)}
                      className="bg-white rounded-2xl p-3 border border-slate-200/80 hover:border-emerald-300 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                    >
                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            {dish.isVegetarian && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-green-50 text-green-700 text-[10px] font-semibold border border-green-200">
                                <Leaf className="w-2.5 h-2.5" />
                                {isRtl ? "نباتي" : "Veg"}
                              </span>
                            )}
                            {dish.isFeatured && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                                <Flame className="w-2.5 h-2.5" />
                                {isRtl ? "مميز" : "Special"}
                              </span>
                            )}
                            {tags.map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition">
                            {dishTitle}
                          </h3>

                          {dishDesc && (
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                              {dishDesc}
                            </p>
                          )}
                        </div>

                        {dish.imageUrl ? (
                          <img
                            src={dish.imageUrl}
                            alt={dishTitle}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0 border border-slate-100"
                          />
                        ) : (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-300">
                            <Utensils className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-emerald-700 text-sm">
                            {currency} {displayPrice.toFixed(2)}
                          </span>
                          {dish.salePrice && dish.price > dish.salePrice && (
                            <span className="text-xs text-slate-400 line-through">
                              {currency} {dish.price.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isRtl ? "إضافة" : "Add"}</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* ─── Sticky Bottom Cart Bar ─── */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl px-5 py-3.5 shadow-xl shadow-emerald-600/30 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                  {cartItemCount}
                </div>
                <span className="font-bold text-sm">
                  {isRtl ? "عرض الطلب والسلة" : "View Cart & Checkout"}
                </span>
              </div>
              <span className="font-mono font-bold text-base">
                {currency} {grandTotal.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Dish Customization Modal (Bottom Sheet on Mobile) ─── */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {isRtl && customizingItem.nameAr ? customizingItem.nameAr : customizingItem.name}
              </h3>
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {customizingItem.imageUrl && (
                <img
                  src={customizingItem.imageUrl}
                  alt={customizingItem.name}
                  className="w-full h-44 rounded-2xl object-cover"
                />
              )}

              {(customizingItem.description || customizingItem.descriptionAr) && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isRtl && customizingItem.descriptionAr
                    ? customizingItem.descriptionAr
                    : customizingItem.description}
                </p>
              )}

              {/* Portion Variants */}
              {currentVariants.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    {isRtl ? "اختر الحجم" : "Choose Size / Portion"}
                  </label>
                  <div className="space-y-1.5">
                    {currentVariants.map((v) => (
                      <label
                        key={v.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium cursor-pointer transition ${
                          chosenVariantId === v.id
                            ? "border-emerald-600 bg-emerald-50/50 text-emerald-900"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="dishVariant"
                            checked={chosenVariantId === v.id}
                            onChange={() => setChosenVariantId(v.id)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{isRtl && v.nameAr ? v.nameAr : v.name}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-700">
                          {currency} {v.price.toFixed(2)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifier Groups */}
              {currentModifierGroups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      {isRtl && group.nameAr ? group.nameAr : group.name}
                    </label>
                    {group.required && (
                      <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                        {isRtl ? "مطلوب" : "Required"}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {group.options.map((opt) => {
                      const isSelected = chosenModifierIds.includes(opt.id)
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium cursor-pointer transition ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/50 text-emerald-900"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setChosenModifierIds((prev) => [...prev, opt.id])
                                } else {
                                  setChosenModifierIds((prev) => prev.filter((id) => id !== opt.id))
                                }
                              }}
                              className="rounded-md text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{isRtl && opt.nameAr ? opt.nameAr : opt.name}</span>
                          </div>
                          {opt.price > 0 && (
                            <span className="font-mono text-slate-600">
                              +{currency} {opt.price.toFixed(2)}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Special Cooking Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  {isRtl ? "ملاحظات التحضير (اختياري)" : "Special Instructions (Optional)"}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isRtl
                      ? "مثال: بدون بصل، صوص إضافي..."
                      : "e.g. Less spicy, dressing on the side..."
                  }
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Footer with Qty & Add Button */}
            <div className="p-4 border-t border-slate-100 flex items-center gap-3">
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 px-2 py-1">
                <button
                  type="button"
                  onClick={() => setItemQty((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-bold text-sm">
                  {itemQty}
                </span>
                <button
                  type="button"
                  onClick={() => setItemQty((q) => q + 1)}
                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 px-4 font-bold text-sm shadow-md transition flex items-center justify-between"
              >
                <span>{isRtl ? "أضف إلى الطلب" : "Add to Order"}</span>
                <span className="font-mono">
                  {currency} {(modalUnitPrice * itemQty).toFixed(2)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Slide-Up Cart & Checkout Drawer ─── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {isRtl ? "سلة الطلبات" : "Your Order"} ({cartItemCount})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Order Items & Forms */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Items List */}
              <div className="divide-y divide-slate-100">
                {cart.map((item) => (
                  <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-slate-900">
                        {isRtl && item.nameAr ? item.nameAr : item.name}
                      </h4>
                      {item.variant && (
                        <p className="text-[11px] text-emerald-700 font-medium">
                          {isRtl && item.variant.nameAr ? item.variant.nameAr : item.variant.name}
                        </p>
                      )}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-[10px] text-slate-500">
                          +{item.modifiers.map((m) => (isRtl && m.nameAr ? m.nameAr : m.name)).join(", ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-slate-400 italic">
                          "{item.notes}"
                        </p>
                      )}
                      <p className="font-mono font-bold text-xs text-slate-800 mt-1">
                        {currency} {(item.price * item.qty).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 px-1 py-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-xs">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Mode Toggle */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700">
                  {isRtl ? "نوع الطلب" : "Order Mode"}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { mode: "DINE_IN", en: "Dine In", ar: "تناول بالمطعم" },
                    { mode: "TAKEAWAY", en: "Takeaway", ar: "سفري / استلام" },
                    { mode: isRoom ? "ROOM_SERVICE" : "DELIVERY", en: isRoom ? "Room Service" : "Delivery", ar: isRoom ? "خدمة الغرف" : "توصيل" },
                  ].map((btn) => (
                    <button
                      key={btn.mode}
                      type="button"
                      onClick={() => setOrderType(btn.mode as any)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        orderType === btn.mode
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {isRtl ? btn.ar : btn.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guest Information */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700">
                  {isRtl ? "بيانات التواصل" : "Customer Details"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={isRtl ? "الاسم" : "Your Name"}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="tel"
                    placeholder={isRtl ? "رقم الواتساب" : "WhatsApp Number"}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {orderType === "ROOM_SERVICE" && (
                  <input
                    type="text"
                    placeholder={isRtl ? "رقم الغرفة (إلزامي)" : "Room Number (Required)"}
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                )}

                {orderType === "DELIVERY" && (
                  <textarea
                    rows={2}
                    placeholder={isRtl ? "عنوان التوصيل بالتفصيل..." : "Full delivery address / building / flat..."}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* Promo Code Input */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={isRtl ? "رمز القسيمة أو الخصم" : "Coupon / Promo Code"}
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    className="flex-1 p-2 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3.5 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
                  >
                    {isRtl ? "تطبيق" : "Apply"}
                  </button>
                </div>
                {appliedDiscount && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    ✓ {appliedDiscount.name || appliedDiscount.code} ({appliedDiscount.code})
                  </p>
                )}
                {discountError && (
                  <p className="text-[11px] text-red-500 font-medium mt-1">
                    {discountError}
                  </p>
                )}
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700">
                  {isRtl ? "طريقة الدفع" : "Payment Option"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition ${
                      paymentMethod === "CASH"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {isRtl ? "الدفع عند الاستلام / كاش" : "Pay at Counter / Cash"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod(isRoom ? "ROOM_CHARGE" : "CARD_AT_VENUE")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition ${
                      paymentMethod === "CARD_AT_VENUE" || paymentMethod === "ROOM_CHARGE"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {isRoom
                      ? isRtl
                        ? "تحميل على حساب الغرفة"
                        : "Charge to Room"
                      : isRtl
                      ? "بطاقة بنكية عند الحضور"
                      : "Card Machine at Venue"}
                  </button>
                </div>
              </div>

              {/* Price Calculation Summary */}
              <div className="bg-slate-50 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>{isRtl ? "المجموع الفرعي" : "Subtotal"}</span>
                  <span className="font-mono">{currency} {subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>{isRtl ? "الخصم" : "Discount"}</span>
                    <span className="font-mono">-{currency} {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {serviceChargeAmount > 0 && (
                  <div className="flex justify-between">
                    <span>{isRtl ? "رسوم الخدمة" : "Service Charge"}</span>
                    <span className="font-mono">{currency} {serviceChargeAmount.toFixed(2)}</span>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>{isRtl ? "رسوم التوصيل" : "Delivery Fee"}</span>
                    <span className="font-mono">{currency} {deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>{isRtl ? "ضريبة القيمة المضافة (VAT)" : "VAT / Tax"}</span>
                    <span className="font-mono">{currency} {taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                  <span>{isRtl ? "الإجمالي النهائي" : "Grand Total"}</span>
                  <span className="font-mono text-emerald-700">{currency} {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {submitError}
                </div>
              )}
            </div>

            {/* Footer Checkout Action */}
            <div className="p-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePlaceOrder}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl py-3.5 px-4 font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isRtl ? "جاري تأكيد طلبك..." : "Confirming Order..."}</span>
                  </>
                ) : (
                  <>
                    <span>{isRtl ? "تأكيد وإرسال الطلب للمطبخ" : "Send Order to Kitchen"}</span>
                    <span className="font-mono">• {currency} {grandTotal.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Waiter Call Modal ─── */}
      {isWaiterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {isRtl ? "طلب نادل / مساعدة" : "Call Waiter"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWaiterModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {isRtl
                ? "اختر نوع الخدمة وسيصل النادل إلى طاولتك مباشرة:"
                : "Select assistance needed and our staff will arrive promptly:"}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { type: "WATER", en: "Water", ar: "ماء" },
                { type: "BILL", en: "Request Bill", ar: "طلب الفاتورة" },
                { type: "CUTLERY", en: "Cutlery", ar: "أدوات طعام" },
                { type: "CLEAN_TABLE", en: "Clean Table", ar: "تنظيف الطاولة" },
              ].map((btn) => (
                <button
                  key={btn.type}
                  type="button"
                  onClick={() => setWaiterRequestType(btn.type as any)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                    waiterRequestType === btn.type
                      ? "border-amber-500 bg-amber-50 text-amber-900 font-bold"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {isRtl ? btn.ar : btn.en}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder={isRtl ? "ملاحظة إضافية (اختياري)..." : "Extra note (optional)..."}
              value={waiterMessage}
              onChange={(e) => setWaiterMessage(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400"
            />

            {waiterSuccessMsg && (
              <p className="text-xs text-emerald-700 font-semibold text-center bg-emerald-50 p-2 rounded-xl">
                {waiterSuccessMsg}
              </p>
            )}

            <button
              type="button"
              disabled={waiterCalling}
              onClick={handleCallWaiter}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              {waiterCalling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>{isRtl ? "إرسال التنبيه للنادل" : "Notify Waiter"}</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
