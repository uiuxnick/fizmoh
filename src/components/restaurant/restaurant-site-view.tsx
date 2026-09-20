"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  X,
  Check,
  Star,
  Clock,
  MapPin,
  Phone,
  Mail,
  Flame,
  Leaf,
  ShieldCheck,
  Award,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Trash2,
  Share2,
  Menu as MenuIcon,
  ChefHat,
  Utensils,
  Sparkles,
  Bike,
  Heart,
  Instagram,
  Facebook,
  Send,
  SlidersHorizontal,
  Info,
  CreditCard,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { toast } from "sonner"

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES & INTERFACES
─────────────────────────────────────────────────────────────────────────────── */

export interface RestaurantItem {
  id: string
  name: string
  nameAr?: string | null
  description?: string | null
  descriptionAr?: string | null
  price: number
  salePrice?: number | null
  imageUrl?: string | null
  category?: string | null
  categoryId?: string | null
  isPopular?: boolean
  isVegetarian?: boolean
  isVegan?: boolean
  isGlutenFree?: boolean
  isSpicy?: boolean
  isSoldOut?: boolean
  prepTimeMinutes?: number
  calories?: number | null
  allergens?: string | null
  variantsJson?: string | null
  modifiersJson?: string | null
}

export interface RestaurantCategory {
  id: string
  name: string
  nameAr?: string | null
  icon?: string | null
  slug?: string
}

export interface CartModifier {
  id: string
  name: string
  price: number
}

export interface RestaurantCartItem {
  id: string
  item: RestaurantItem
  qty: number
  selectedAddOns: CartModifier[]
  specialInstructions?: string
  unitPrice: number
  totalPrice: number
}

export interface RestaurantBranding {
  name?: string
  tagline?: string
  logoUrl?: string | null
  heroBannerUrl?: string | null
  heroEyebrow?: string
  heroHeadline?: string
  heroSubtitle?: string
  heroBadge?: string
  heroRating?: string
  offerHeadline?: string
  offerSubtext?: string
  offerBadge?: string
  offerCode?: string
  offerBannerUrl?: string | null
  storyEyebrow?: string
  storyTitle?: string
  storyText?: string
  storyImageUrl?: string | null
  phone?: string
  email?: string
  address?: string
  openingHours?: string
  currency?: string
  deliveryFee?: number
  minOrderDelivery?: number
  taxRate?: number
  socialInstagram?: string | null
  socialFacebook?: string | null
  socialTwitter?: string | null
  feature1Title?: string
  feature1Desc?: string
  feature2Title?: string
  feature2Desc?: string
  feature3Title?: string
  feature3Desc?: string
  feature4Title?: string
  feature4Desc?: string
}

interface RestaurantSiteViewProps {
  slug?: string
  tableToken?: string
  branchSlug?: string
  initialData?: {
    tenant?: any
    branding?: Record<string, string>
    categories?: any[]
    branches?: any[]
    activeBranch?: any
    table?: any
    tables?: any[]
    discounts?: any[]
    shop?: any
    restaurant?: {
      categories?: any[]
      branches?: any[]
      discounts?: any[]
      tables?: any[]
    }
  }
}

/**
 * Parses dynamic menu categories and items from the database.
 * Strictly includes only active categories and available items (isAvailable !== false).
 */
export function parseDynamicMenu(rawCats: any[]) {
  if (!rawCats || !Array.isArray(rawCats) || rawCats.length === 0) {
    return { categories: [], items: [] }
  }

  const dynamicCategories: RestaurantCategory[] = [
    { id: "all", name: "All", icon: "Utensils" },
  ]
  const dynamicItems: RestaurantItem[] = []
  let hasFeatured = false

  for (const cat of rawCats) {
    if (cat.isActive === false) continue

    const catItems = (cat.items || []).filter((item: any) => {
      return item.isAvailable !== false
    })

    if (catItems.length > 0) {
      dynamicCategories.push({
        id: cat.id,
        name: cat.name,
        nameAr: cat.nameAr,
        icon: cat.icon || "Utensils",
      })

      for (const item of catItems) {
        if (item.isFeatured) hasFeatured = true
        dynamicItems.push({
          id: item.id,
          name: item.name,
          nameAr: item.nameAr,
          description: item.description,
          price: Number(item.price) || 0,
          salePrice: item.salePrice ? Number(item.salePrice) : null,
          imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
          category: cat.id,
          isPopular: !!item.isFeatured,
          isVegetarian: !!item.isVegetarian,
          isVegan: !!item.isVegan,
          isGlutenFree: !!item.isGlutenFree,
          isSoldOut: !!item.isSoldOut,
          prepTimeMinutes: item.prepTimeMinutes || 15,
          calories: item.calories,
        })
      }
    }
  }

  if (hasFeatured) {
    dynamicCategories.splice(1, 0, { id: "popular", name: "Popular", icon: "Star" })
  }

  return { categories: dynamicCategories, items: dynamicItems }
}

/* ─────────────────────────────────────────────────────────────────────────────
   CURATED DEFAULT FALLBACK DATA (SAVORO BRAND)
─────────────────────────────────────────────────────────────────────────────── */

const DEFAULT_BRAND: RestaurantBranding = {
  name: "Savoro",
  tagline: "Good Food. Better Mood.",
  logoUrl: null,
  heroBannerUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85",
  heroEyebrow: "DELICIOUS FOOD • HAPPY PEOPLE",
  heroHeadline: "Good Food Brings People Together",
  heroSubtitle: "Order your favorite meals online and enjoy great taste at your doorstep.",
  heroBadge: "5,000+ Happy Customers",
  heroRating: "4.9 Rating",
  offerHeadline: "Get 20% Off",
  offerSubtext: "On your first order",
  offerBadge: "20% OFF",
  offerCode: "SAVORO20",
  offerBannerUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
  storyEyebrow: "FRESH & HEALTHY",
  storyTitle: "Made With Love & Care",
  storyText: "We use the freshest ingredients to serve you the best meals, prepared with passion and culinary excellence.",
  storyImageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
  phone: "+96898314456",
  email: "orders@savoro.com",
  address: "Shatti Al Qurum, Muscat, Sultanate of Oman",
  openingHours: "Mon - Sun: 11:00 AM - 11:30 PM",
  currency: "OMR",
  deliveryFee: 1.5,
  minOrderDelivery: 3.0,
  taxRate: 0.05,
  socialInstagram: "https://instagram.com",
  socialFacebook: "https://facebook.com",
  socialTwitter: "https://twitter.com",
  feature1Title: "Fast Delivery",
  feature1Desc: "Hot food at your door",
  feature2Title: "Fresh Ingredients",
  feature2Desc: "Always fresh & healthy",
  feature3Title: "Expert Chefs",
  feature3Desc: "Crafted with love",
  feature4Title: "Safe & Secure",
  feature4Desc: "100% secure ordering",
}

const DEFAULT_CATEGORIES: RestaurantCategory[] = [
  { id: "all", name: "All", icon: "Utensils" },
  { id: "popular", name: "Popular", icon: "Star" },
  { id: "appetizers", name: "Appetizers", icon: "Sparkles" },
  { id: "main-course", name: "Main Course", icon: "Flame" },
  { id: "pizza", name: "Pizza", icon: "Utensils" },
  { id: "burgers", name: "Burgers", icon: "Utensils" },
  { id: "pasta", name: "Pasta", icon: "Utensils" },
  { id: "desserts", name: "Desserts", icon: "Heart" },
  { id: "drinks", name: "Drinks", icon: "Sparkles" },
]

const DEFAULT_ITEMS: RestaurantItem[] = [
  {
    id: "item-1",
    name: "Classic Beef Burger",
    description: "Juicy beef patty with fresh lettuce, tomato, aged cheddar cheese and special house sauce in a brioche bun.",
    price: 3.5,
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    category: "burgers",
    isPopular: true,
    prepTimeMinutes: 15,
    calories: 680,
  },
  {
    id: "item-2",
    name: "Chicken Alfredo Pasta",
    description: "Creamy garlic parmesan Alfredo sauce with grilled chicken breast, fresh fettuccine, and parsley.",
    price: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80",
    category: "pasta",
    isPopular: true,
    prepTimeMinutes: 20,
    calories: 740,
  },
  {
    id: "item-3",
    name: "Margherita Pizza",
    description: "Classic Italian delight with San Marzano tomato sauce, fresh buffalo mozzarella, fragrant basil and extra virgin olive oil.",
    price: 4.2,
    imageUrl: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80",
    category: "pizza",
    isPopular: true,
    isVegetarian: true,
    prepTimeMinutes: 18,
    calories: 820,
  },
  {
    id: "item-4",
    name: "Chocolate Lava Cake",
    description: "Warm Belgian chocolate cake with a rich molten center, served with Madagascan vanilla bean ice cream and berries.",
    price: 2.8,
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80",
    category: "desserts",
    isPopular: true,
    prepTimeMinutes: 12,
    calories: 490,
  },
  {
    id: "item-5",
    name: "Grilled Ribeye Steak",
    description: "Prime grass-fed ribeye steak seared with garlic herb butter, roasted cherry tomatoes, grilled asparagus, and chimichurri.",
    price: 8.9,
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    category: "main-course",
    isPopular: true,
    prepTimeMinutes: 25,
    calories: 890,
  },
  {
    id: "item-6",
    name: "Crispy Truffle Fries",
    description: "Hand-cut golden fries tossed with white truffle oil, shaved parmesan cheese, fresh herbs, and garlic aioli dip.",
    price: 1.8,
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
    category: "appetizers",
    isVegetarian: true,
    prepTimeMinutes: 10,
    calories: 420,
  },
  {
    id: "item-7",
    name: "Signature Berry Mojito",
    description: "Refreshing crushed wild blackberries, fresh mint leaves, lime juice, sparkling soda water, and cane sugar.",
    price: 1.6,
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
    category: "drinks",
    prepTimeMinutes: 5,
    calories: 140,
  },
  {
    id: "item-8",
    name: "BBQ Smoked Bacon Burger",
    description: "Double beef patty, crispy beef bacon, melted cheddar, crispy onion rings, and smoky BBQ bourbon sauce.",
    price: 4.5,
    imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80",
    category: "burgers",
    isPopular: false,
    prepTimeMinutes: 15,
    calories: 910,
  },
  {
    id: "item-9",
    name: "Diavola Pepperoni Pizza",
    description: "Spicy beef pepperoni, crushed chili flakes, mozzarella cheese, and rich marinara sauce on sourdough crust.",
    price: 4.6,
    imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80",
    category: "pizza",
    isSpicy: true,
    prepTimeMinutes: 18,
    calories: 880,
  },
  {
    id: "item-10",
    name: "Classic Caesar Salad",
    description: "Crisp romaine lettuce, herb croutons, aged parmesan shavings, and house Caesar dressing with optional grilled chicken.",
    price: 2.9,
    imageUrl: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80",
    category: "appetizers",
    isVegetarian: true,
    prepTimeMinutes: 10,
    calories: 310,
  },
]

const GALLERY_IMAGES = [
  { url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80", title: "Signature Steaks" },
  { url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80", title: "Dining Ambiance" },
  { url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80", title: "Open Kitchen" },
  { url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80", title: "Artisanal Mocktails" },
  { url: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=80", title: "Fresh Salads" },
  { url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80", title: "Decadent Desserts" },
]

const TESTIMONIALS = [
  {
    name: "Rashid Al Habsi",
    role: "Food Connoisseur",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    text: "Absolutely delicious! The ribeye was cooked to perfection, the fries were crispy, and ordering via WhatsApp was effortlessly fast.",
    rating: 5,
  },
  {
    name: "Sarah Jenkins",
    role: "Verified Guest",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    text: "The Chicken Alfredo and Margherita pizza were divine. Everything arrived hot and beautifully packaged. Best dining experience in town!",
    rating: 5,
  },
  {
    name: "Mohammed Al Balushi",
    role: "Local Guide",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    text: "Warm restaurant vibe, fresh ingredients, and the chocolate lava cake is unforgettable. Their table QR ordering is smooth and modern.",
    rating: 5,
  },
]

const AVAILABLE_ADD_ONS: CartModifier[] = [
  { id: "extra-cheese", name: "Extra Cheese", price: 0.5 },
  { id: "extra-sauce", name: "House Special Sauce", price: 0.3 },
  { id: "extra-chicken", name: "Grilled Chicken Breast", price: 1.2 },
  { id: "spicy-boost", name: "Spicy Jalapeño Boost", price: 0.3 },
  { id: "truffle-drizzle", name: "Truffle Oil Drizzle", price: 0.8 },
]

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
─────────────────────────────────────────────────────────────────────────────── */

export default function RestaurantSiteView({
  slug,
  tableToken,
  branchSlug,
  initialData,
}: RestaurantSiteViewProps) {
  // Pre-parse dynamic categories and items if provided from SSR/server
  const initialRawCats = initialData?.categories || initialData?.restaurant?.categories || []
  const initialTables = initialData?.tables || initialData?.restaurant?.tables || []
  const initialParsed = parseDynamicMenu(initialRawCats)

  // State
  const [loading, setLoading] = useState(!initialData && initialRawCats.length === 0)
  const [branding, setBranding] = useState<RestaurantBranding>(DEFAULT_BRAND)
  const [categories, setCategories] = useState<RestaurantCategory[]>(
    initialParsed.categories.length > 0 ? initialParsed.categories : DEFAULT_CATEGORIES
  )
  const [items, setItems] = useState<RestaurantItem[]>(
    initialParsed.items.length > 0 ? initialParsed.items : DEFAULT_ITEMS
  )
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [tables, setTables] = useState<any[]>(initialTables)
  const [table, setTable] = useState<any>(initialData?.table || null)
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>(
    initialData?.table?.number || ""
  )
  const [selectedTableId, setSelectedTableId] = useState<string>(
    initialData?.table?.id || ""
  )

  // Cart & Modals
  const [cart, setCart] = useState<RestaurantCartItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`savoro-cart-${slug || "default"}`)
        return stored ? JSON.parse(stored) : []
      } catch {
        return []
      }
    }
    return []
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<RestaurantItem | null>(null)
  const [detailQty, setDetailQty] = useState(1)
  const [selectedAddOns, setSelectedAddOns] = useState<CartModifier[]>([])
  const [specialInstructions, setSpecialInstructions] = useState("")

  // Checkout Modal State
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [orderType, setOrderType] = useState<"DELIVERY" | "TAKEAWAY" | "DINE_IN">(
    tableToken || initialData?.table ? "DINE_IN" : "DELIVERY"
  )
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [building, setBuilding] = useState("")
  const [apartment, setApartment] = useState("")
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD_AT_VENUE" | "AMWALPAY_ONLINE" | "WHATSAPP">("CASH")
  const [discountCode, setDiscountCode] = useState("")
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null)
  const [availableDiscounts, setAvailableDiscounts] = useState<any[]>([])
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<any>(null)

  // Mobile navigation
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Save cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem(`savoro-cart-${slug || "default"}`, JSON.stringify(cart))
    } catch {}
  }, [cart, slug])

  // Pre-load from initialData if supplied
  useEffect(() => {
    if (initialData) {
      const s = initialData.branding || {}
      const t = initialData.tenant || initialData.shop || {}
      const b = initialData.activeBranch || (initialData.branches && initialData.branches[0]) || (initialData.restaurant?.branches && initialData.restaurant.branches[0]) || {}

      const rawCats = initialData.categories || initialData.restaurant?.categories
      if (rawCats && Array.isArray(rawCats) && rawCats.length > 0) {
        const { categories: dCats, items: dItems } = parseDynamicMenu(rawCats)
        if (dItems.length > 0) {
          setCategories(dCats)
          setItems(dItems)
        }
      }

      const rawTables = initialData.tables || initialData.restaurant?.tables
      if (rawTables && Array.isArray(rawTables) && rawTables.length > 0) {
        setTables(rawTables)
      }

      if (initialData.table) {
        setTable(initialData.table)
        setSelectedTableNumber(initialData.table.number || "")
        setSelectedTableId(initialData.table.id || "")
        setOrderType("DINE_IN")
      }

      setBranding({
        name: s.restaurant_name || s.business_name || t.name || DEFAULT_BRAND.name,
        tagline: s.restaurant_tagline || DEFAULT_BRAND.tagline,
        logoUrl: s.website_logo_url || t.logoUrl || null,
        heroBannerUrl: s.restaurant_hero_banner_url || DEFAULT_BRAND.heroBannerUrl,
        heroEyebrow: s.restaurant_eyebrow || DEFAULT_BRAND.heroEyebrow,
        heroHeadline: s.restaurant_headline || DEFAULT_BRAND.heroHeadline,
        heroSubtitle: s.restaurant_subheadline || DEFAULT_BRAND.heroSubtitle,
        heroBadge: s.restaurant_hero_badge || DEFAULT_BRAND.heroBadge,
        heroRating: s.restaurant_hero_rating || DEFAULT_BRAND.heroRating,
        offerHeadline: s.restaurant_offer_headline || DEFAULT_BRAND.offerHeadline,
        offerSubtext: s.restaurant_offer_subtext || DEFAULT_BRAND.offerSubtext,
        offerBadge: s.restaurant_offer_badge || DEFAULT_BRAND.offerBadge,
        offerCode: s.restaurant_offer_code || DEFAULT_BRAND.offerCode,
        offerBannerUrl: s.restaurant_offer_banner_url || DEFAULT_BRAND.offerBannerUrl,
        storyEyebrow: s.restaurant_story_eyebrow || DEFAULT_BRAND.storyEyebrow,
        storyTitle: s.restaurant_story_title || DEFAULT_BRAND.storyTitle,
        storyText: s.restaurant_story_text || DEFAULT_BRAND.storyText,
        storyImageUrl: s.restaurant_story_image_url || DEFAULT_BRAND.storyImageUrl,
        phone: s.restaurant_whatsapp_phone || b.phone || s.business_phone || DEFAULT_BRAND.phone,
        email: s.business_email || DEFAULT_BRAND.email,
        address: b.address || s.business_address || DEFAULT_BRAND.address,
        openingHours: s.restaurant_hours || DEFAULT_BRAND.openingHours,
        currency: b.currency || t.currency || s.currency || DEFAULT_BRAND.currency,
        deliveryFee: typeof b.deliveryFee === "number" ? b.deliveryFee : DEFAULT_BRAND.deliveryFee,
        minOrderDelivery: typeof b.minOrderDelivery === "number" ? b.minOrderDelivery : DEFAULT_BRAND.minOrderDelivery,
        taxRate: typeof b.taxRate === "number" ? b.taxRate : DEFAULT_BRAND.taxRate,
        socialInstagram: s.social_instagram || DEFAULT_BRAND.socialInstagram,
        socialFacebook: s.social_facebook || DEFAULT_BRAND.socialFacebook,
        socialTwitter: s.social_twitter || DEFAULT_BRAND.socialTwitter,
        feature1Title: s.restaurant_feature1_title || DEFAULT_BRAND.feature1Title,
        feature1Desc: s.restaurant_feature1_desc || DEFAULT_BRAND.feature1Desc,
        feature2Title: s.restaurant_feature2_title || DEFAULT_BRAND.feature2Title,
        feature2Desc: s.restaurant_feature2_desc || DEFAULT_BRAND.feature2Desc,
        feature3Title: s.restaurant_feature3_title || DEFAULT_BRAND.feature3Title,
        feature3Desc: s.restaurant_feature3_desc || DEFAULT_BRAND.feature3Desc,
        feature4Title: s.restaurant_feature4_title || DEFAULT_BRAND.feature4Title,
        feature4Desc: s.restaurant_feature4_desc || DEFAULT_BRAND.feature4Desc,
      })

      if (initialData.discounts) {
        setAvailableDiscounts(initialData.discounts)
      }
    }
  }, [initialData])

  // Fetch Dynamic Data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        let settings: any = {}
        let tenant: any = {}
        let activeBranch: any = {}
        let rawCats: any[] = []
        let rawDiscounts: any[] = []

        if (slug) {
          const queryParams = new URLSearchParams()
          if (tableToken) queryParams.set("tableToken", tableToken)
          if (branchSlug) queryParams.set("branch", branchSlug)

          const targetUrl = `/api/restaurant/public/menu/${encodeURIComponent(slug)}?${queryParams.toString()}`
          const res = await fetch(targetUrl)
          if (!res.ok) throw new Error("Failed to load restaurant data")
          const data = await res.json()
          settings = data.branding || data.settings || {}
          tenant = data.tenant || {}
          activeBranch = data.activeBranch || (data.branches && data.branches[0]) || {}
          rawCats = data.categories || []
          rawDiscounts = data.discounts || []

          if (data.tables && Array.isArray(data.tables)) {
            setTables(data.tables)
          }

          if (data.table) {
            setTable(data.table)
            setSelectedTableNumber(data.table.number || "")
            setSelectedTableId(data.table.id || "")
            setOrderType("DINE_IN")
          }
        } else {
          // Inside workspace context (admin preview)
          const [sRes, mRes, bRes, cRes, tRes] = await Promise.all([
            fetch("/api/settings").then((r) => r.json()).catch(() => ({ settings: {} })),
            fetch("/api/restaurant/menu").then((r) => r.json()).catch(() => ({ categories: [] })),
            fetch("/api/restaurant/branches").then((r) => r.json()).catch(() => ({ branches: [] })),
            fetch("/api/restaurant/coupons").then((r) => r.json()).catch(() => ({ coupons: [] })),
            fetch("/api/restaurant/tables").then((r) => r.json()).catch(() => ({ tables: [] })),
          ])
          settings = sRes.settings || {}
          tenant = { name: settings.restaurant_name || settings.tenant_name, currency: settings.currency }
          activeBranch = (bRes.branches && bRes.branches[0]) || {}
          rawCats = mRes.categories || []
          rawDiscounts = cRes.coupons || []
          if (tRes.tables && Array.isArray(tRes.tables)) {
            setTables(tRes.tables)
          }
        }

        if (rawDiscounts && rawDiscounts.length > 0) {
          setAvailableDiscounts(rawDiscounts)
        }

        const mergedBrand: RestaurantBranding = {
          name: settings.restaurant_name || settings.business_name || tenant.name || DEFAULT_BRAND.name,
          tagline: settings.restaurant_tagline || DEFAULT_BRAND.tagline,
          logoUrl: settings.website_logo_url || tenant.logoUrl || null,
          heroBannerUrl: settings.restaurant_hero_banner_url || DEFAULT_BRAND.heroBannerUrl,
          heroEyebrow: settings.restaurant_eyebrow || DEFAULT_BRAND.heroEyebrow,
          heroHeadline: settings.restaurant_headline || DEFAULT_BRAND.heroHeadline,
          heroSubtitle: settings.restaurant_subheadline || DEFAULT_BRAND.heroSubtitle,
          heroBadge: settings.restaurant_hero_badge || DEFAULT_BRAND.heroBadge,
          heroRating: settings.restaurant_hero_rating || DEFAULT_BRAND.heroRating,
          offerHeadline: settings.restaurant_offer_headline || DEFAULT_BRAND.offerHeadline,
          offerSubtext: settings.restaurant_offer_subtext || DEFAULT_BRAND.offerSubtext,
          offerBadge: settings.restaurant_offer_badge || DEFAULT_BRAND.offerBadge,
          offerCode: settings.restaurant_offer_code || DEFAULT_BRAND.offerCode,
          offerBannerUrl: settings.restaurant_offer_banner_url || DEFAULT_BRAND.offerBannerUrl,
          storyEyebrow: settings.restaurant_story_eyebrow || DEFAULT_BRAND.storyEyebrow,
          storyTitle: settings.restaurant_story_title || DEFAULT_BRAND.storyTitle,
          storyText: settings.restaurant_story_text || DEFAULT_BRAND.storyText,
          storyImageUrl: settings.restaurant_story_image_url || DEFAULT_BRAND.storyImageUrl,
          phone: settings.restaurant_whatsapp_phone || activeBranch.phone || settings.business_phone || DEFAULT_BRAND.phone,
          email: settings.business_email || DEFAULT_BRAND.email,
          address: activeBranch.address || settings.business_address || DEFAULT_BRAND.address,
          openingHours: settings.restaurant_hours || DEFAULT_BRAND.openingHours,
          currency: activeBranch.currency || tenant.currency || settings.currency || DEFAULT_BRAND.currency,
          deliveryFee: typeof activeBranch.deliveryFee === "number" ? activeBranch.deliveryFee : (parseFloat(settings.restaurant_delivery_fee) || DEFAULT_BRAND.deliveryFee),
          minOrderDelivery: typeof activeBranch.minOrderDelivery === "number" ? activeBranch.minOrderDelivery : (parseFloat(settings.restaurant_min_delivery) || DEFAULT_BRAND.minOrderDelivery),
          taxRate: typeof activeBranch.taxRate === "number" ? activeBranch.taxRate : (parseFloat(settings.restaurant_tax_rate) || DEFAULT_BRAND.taxRate),
          socialInstagram: settings.social_instagram || DEFAULT_BRAND.socialInstagram,
          socialFacebook: settings.social_facebook || DEFAULT_BRAND.socialFacebook,
          socialTwitter: settings.social_twitter || DEFAULT_BRAND.socialTwitter,
          feature1Title: settings.restaurant_feature1_title || DEFAULT_BRAND.feature1Title,
          feature1Desc: settings.restaurant_feature1_desc || DEFAULT_BRAND.feature1Desc,
          feature2Title: settings.restaurant_feature2_title || DEFAULT_BRAND.feature2Title,
          feature2Desc: settings.restaurant_feature2_desc || DEFAULT_BRAND.feature2Desc,
          feature3Title: settings.restaurant_feature3_title || DEFAULT_BRAND.feature3Title,
          feature3Desc: settings.restaurant_feature3_desc || DEFAULT_BRAND.feature3Desc,
          feature4Title: settings.restaurant_feature4_title || DEFAULT_BRAND.feature4Title,
          feature4Desc: settings.restaurant_feature4_desc || DEFAULT_BRAND.feature4Desc,
        }
        setBranding(mergedBrand)

        // Process categories and items if dynamic data exists in database
        if (rawCats && Array.isArray(rawCats) && rawCats.length > 0) {
          const { categories: dCats, items: dItems } = parseDynamicMenu(rawCats)
          if (dItems.length > 0) {
            setCategories(dCats)
            setItems(dItems)
          }
        }
      } catch (e) {
        console.error("Error loading restaurant data:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug, tableToken, branchSlug])

  // Format currency helper
  const currencySymbol = branding.currency || "OMR"
  const formatPrice = useCallback((amount: number) => {
    return `${amount.toFixed(currencySymbol === "OMR" ? 3 : 2)} ${currencySymbol}`
  }, [currencySymbol])

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items
    if (activeCategory === "popular") {
      result = result.filter(i => i.isPopular)
    } else if (activeCategory !== "all") {
      result = result.filter(i => i.category === activeCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          (i.nameAr && i.nameAr.includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q))
      )
    }

    return result
  }, [items, activeCategory, searchQuery])

  // Dynamic Gallery images: automatically showcases real menu dishes with photos
  const activeGallery = useMemo(() => {
    const dishImages = items.map((i) => i.imageUrl).filter(Boolean) as string[]
    const uniqueDishImgs = Array.from(new Set(dishImages))
    if (uniqueDishImgs.length >= 3) {
      return uniqueDishImgs.slice(0, 6).map((url, idx) => ({
        url,
        title: items.find((i) => i.imageUrl === url)?.name || `Culinary Special ${idx + 1}`,
      }))
    }
    return GALLERY_IMAGES
  }, [items])

  // Cart operations
  const cartTotalCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0)
  }, [cart])

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0)
  }, [cart])

  const discountAmount = useMemo(() => {
    if (!appliedDiscount) return 0
    if (appliedDiscount.kind === "PERCENTAGE") {
      return (cartSubtotal * appliedDiscount.value) / 100
    }
    return Math.min(cartSubtotal, appliedDiscount.value)
  }, [cartSubtotal, appliedDiscount])

  const deliveryCost = orderType === "DELIVERY" ? (branding.deliveryFee || 0) : 0
  const cartTotal = Math.max(0, cartSubtotal - discountAmount + deliveryCost)

  const handleAddToCart = (item: RestaurantItem, qty = 1, addOns: CartModifier[] = [], notes = "") => {
    const addOnsTotal = addOns.reduce((sum, a) => sum + a.price, 0)
    const unitPrice = (item.salePrice || item.price) + addOnsTotal
    const totalPrice = unitPrice * qty

    setCart(prev => {
      const existingIdx = prev.findIndex(
        ci =>
          ci.item.id === item.id &&
          ci.specialInstructions === notes &&
          JSON.stringify(ci.selectedAddOns.map(a => a.id).sort()) ===
            JSON.stringify(addOns.map(a => a.id).sort())
      )

      if (existingIdx > -1) {
        const updated = [...prev]
        const existing = updated[existingIdx]
        const newQty = existing.qty + qty
        updated[existingIdx] = {
          ...existing,
          qty: newQty,
          totalPrice: existing.unitPrice * newQty,
        }
        return updated
      } else {
        const newCartItem: RestaurantCartItem = {
          id: `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          item,
          qty,
          selectedAddOns: addOns,
          specialInstructions: notes,
          unitPrice,
          totalPrice,
        }
        return [...prev, newCartItem]
      }
    })

    toast.success(`Added ${qty}x ${item.name} to order!`)
    setDetailItem(null)
  }

  const handleUpdateQty = (cartId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(ci => {
          if (ci.id === cartId) {
            const newQty = ci.qty + delta
            if (newQty <= 0) return null
            return {
              ...ci,
              qty: newQty,
              totalPrice: ci.unitPrice * newQty,
            }
          }
          return ci
        })
        .filter(Boolean) as RestaurantCartItem[]
    )
  }

  const handleRemoveFromCart = (cartId: string) => {
    setCart(prev => prev.filter(ci => ci.id !== cartId))
    toast.info("Item removed from cart")
  }

  // Quick Add from Card
  const handleQuickAdd = (e: React.MouseEvent, item: RestaurantItem) => {
    e.stopPropagation()
    handleAddToCart(item, 1, [], "")
  }

  // Open detail modal
  const openDetailModal = (item: RestaurantItem) => {
    setDetailItem(item)
    setDetailQty(1)
    setSelectedAddOns([])
    setSpecialInstructions("")
  }

  // Scroll helpers
  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // Apply promo code
  const handleApplyPromo = () => {
    if (!discountCode.trim()) return
    const code = discountCode.trim().toUpperCase()

    // 1. Check live database discounts / coupons
    const matchedCoupon = availableDiscounts.find(
      (d) => d.code && d.code.toUpperCase() === code
    )
    if (matchedCoupon) {
      setAppliedDiscount({
        code: matchedCoupon.code,
        kind: matchedCoupon.kind || "PERCENTAGE",
        value: Number(matchedCoupon.value) || 10,
        name: matchedCoupon.name || `${matchedCoupon.code} Promo`,
      })
      toast.success(`Coupon ${matchedCoupon.code} applied!`)
      return
    }

    // 2. Check custom offer code from restaurant settings
    const activeOfferCode = (branding.offerCode || "SAVORO20").toUpperCase()
    if (code === activeOfferCode || code === "SAVORO20" || code === "WELCOME20") {
      setAppliedDiscount({
        code,
        kind: "PERCENTAGE",
        value: 20,
        name: `${code} Special Offer`,
      })
      toast.success(`Coupon ${code} applied! You saved 20%`)
      return
    }

    toast.error("Invalid or expired promo code")
  }

  // Place Order Action
  const handlePlaceOrder = async () => {
    if (!customerName.trim()) {
      toast.error("Please enter your name")
      return
    }
    if (!customerPhone.trim()) {
      toast.error("Please enter your WhatsApp contact number")
      return
    }
    if (orderType === "DELIVERY" && !deliveryAddress.trim()) {
      toast.error("Please enter delivery address")
      return
    }
    if (orderType === "DINE_IN" && !selectedTableNumber.trim()) {
      toast.error("Please select or enter your table number for Dine-In")
      return
    }

    setIsPlacingOrder(true)
    try {
      const orderPayload = {
        tenantSlug: slug || "kitchen",
        branchSlug: branchSlug || null,
        tableToken: tableToken || null,
        tableId: selectedTableId || null,
        tableNumber: selectedTableNumber ? selectedTableNumber.trim() : null,
        orderType,
        customerName,
        customerPhone,
        customerEmail,
        deliveryAddress: orderType === "DELIVERY"
          ? `${deliveryAddress} ${building ? `, Bldg: ${building}` : ""} ${apartment ? `, Apt/Villa: ${apartment}` : ""}`
          : null,
        specialNotes: deliveryNotes,
        discountCode: appliedDiscount?.code || null,
        paymentMethod: paymentMethod === "WHATSAPP" ? "CASH" : paymentMethod,
        items: cart.map(ci => ({
          menuItemId: ci.item.id,
          name: ci.item.name,
          qty: ci.qty,
          price: ci.unitPrice,
          modifierOptionIds: ci.selectedAddOns.map(a => a.id),
          notes: ci.specialInstructions,
        })),
      }

      // Send to backend API
      const res = await fetch("/api/restaurant/public/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to place order")
      }

      setCompletedOrder({
        orderNumber: data.orderNumber || `#SAV-${Math.floor(1000 + Math.random() * 9000)}`,
        orderId: data.orderId,
        publicToken: data.publicToken,
        total: cartTotal,
      })

      // If user chose WhatsApp or clicks Send to WhatsApp
      const displayType = orderType === "DINE_IN" ? "Dine-In" : orderType === "TAKEAWAY" ? "Self Pickup" : "Delivery"
      const waText = encodeURIComponent(
        `*🍽️ NEW RESTAURANT ORDER (${branding.name})*\n` +
        `Order Number: *${data.orderNumber || "Pending"}*\n` +
        `Customer: *${customerName}* (${customerPhone})\n` +
        `Type: *${displayType}* ${selectedTableNumber ? `(Table: #${selectedTableNumber})` : ""}\n` +
        (orderType === "DELIVERY" ? `Address: ${deliveryAddress}\n` : "") +
        `\n*Items:*\n` +
        cart.map(c => `• ${c.qty}x ${c.item.name} (${formatPrice(c.totalPrice)})`).join("\n") +
        `\n\n*Subtotal:* ${formatPrice(cartSubtotal)}\n` +
        (discountAmount > 0 ? `*Discount:* -${formatPrice(discountAmount)}\n` : "") +
        (deliveryCost > 0 ? `*Delivery:* ${formatPrice(deliveryCost)}\n` : "") +
        `*TOTAL:* *${formatPrice(cartTotal)}*\n` +
        `Payment: ${paymentMethod}\n` +
        `Thank you for dining with ${branding.name}!`
      )

      // Clear cart
      setCart([])
      toast.success("Order placed successfully!")

      if (paymentMethod === "AMWALPAY_ONLINE") {
        toast.loading("Initiating secure card payment...", { id: "pay-session" })
        try {
          const payRes = await fetch("/api/amwalpay/create-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: `KIT-${data.orderId}` }),
          })
          const payData = await payRes.json()
          if (payRes.ok && payData.checkoutUrl) {
            toast.success("Redirecting to AmwalPay card payment...", { id: "pay-session" })
            window.location.href = payData.checkoutUrl
            return
          } else {
            toast.error(payData.error || "Payment gateway unavailable. Order saved as Pay at Venue.", { id: "pay-session" })
          }
        } catch {
          toast.error("Could not connect to payment gateway. Order saved as Pay at Venue.", { id: "pay-session" })
        }
      }

      if (paymentMethod === "WHATSAPP") {
        const phoneClean = (branding.phone || "+96898314456").replace(/\D/g, "")
        window.location.href = `https://wa.me/${phoneClean}?text=${waText}`
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to place order. Please try again.")
    } finally {
      setIsPlacingOrder(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#111111] text-[#171717] font-sans selection:bg-[#D9A441] selection:text-white pb-24 md:pb-0">
      {/* ─────────────────────────────────────────────────────────────────────────
          STICKY TOP NAVIGATION BAR
      ─────────────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#111111]/95 backdrop-blur-md border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => scrollToSection("hero")}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.name}
                  className="h-11 w-11 rounded-full object-cover border-2 border-[#D9A441]/40"
                />
              ) : (
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#D9A441] to-[#B8862B] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                  <ChefHat className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <span className="font-serif text-2xl font-bold tracking-wide text-white block leading-none">
                  {branding.name}
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#D9A441] font-medium block mt-1">
                  {branding.tagline}
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-stone-300">
            <button
              onClick={() => scrollToSection("hero")}
              className="hover:text-[#D9A441] transition-colors cursor-pointer py-1"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("menu")}
              className="hover:text-[#D9A441] transition-colors cursor-pointer py-1"
            >
              Menu
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="hover:text-[#D9A441] transition-colors cursor-pointer py-1"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("gallery")}
              className="hover:text-[#D9A441] transition-colors cursor-pointer py-1"
            >
              Gallery
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="hover:text-[#D9A441] transition-colors cursor-pointer py-1"
            >
              Contact
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Search Trigger */}
            <button
              onClick={() => {
                setSearchOpen(!searchOpen)
                scrollToSection("menu")
              }}
              className="p-2.5 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Search Dishes"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Cart Drawer Trigger */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2.5 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="View Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartTotalCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#D9A441] text-[#111111] font-bold text-xs flex items-center justify-center shadow-lg animate-scale-in">
                  {cartTotalCount}
                </span>
              )}
            </button>

            {/* Desktop Order Now Button */}
            <button
              onClick={() => scrollToSection("menu")}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D9A441] hover:bg-[#B8862B] text-[#111111] font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:shadow-[#D9A441]/20 active:scale-95 cursor-pointer"
            >
              Order Now
            </button>

            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#18181b] border-b border-white/10 px-6 py-5 space-y-3 animate-fadeIn">
            <button
              onClick={() => scrollToSection("hero")}
              className="block w-full text-left py-2 text-stone-200 font-medium hover:text-[#D9A441]"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("menu")}
              className="block w-full text-left py-2 text-stone-200 font-medium hover:text-[#D9A441]"
            >
              Menu
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="block w-full text-left py-2 text-stone-200 font-medium hover:text-[#D9A441]"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("gallery")}
              className="block w-full text-left py-2 text-stone-200 font-medium hover:text-[#D9A441]"
            >
              Gallery
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="block w-full text-left py-2 text-stone-200 font-medium hover:text-[#D9A441]"
            >
              Contact
            </button>
            <button
              onClick={() => scrollToSection("menu")}
              className="w-full mt-2 py-3 rounded-xl bg-[#D9A441] text-[#111111] font-bold text-center block shadow-md"
            >
              Order Now →
            </button>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────
          CINEMATIC HERO SECTION
      ─────────────────────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative bg-gradient-to-b from-[#111111] via-[#141416] to-[#18181b] text-white pt-8 pb-16 md:pt-14 md:pb-24 overflow-hidden"
      >
        {/* Ambient Warm Golden Glow Behind Hero */}
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#D9A441]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-[350px] h-[350px] bg-[#B8862B]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Text Column */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold tracking-widest text-[#D9A441] uppercase">
                <Sparkles className="h-3 w-3" />
                <span>{branding.heroEyebrow}</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-white leading-[1.15]">
                {branding.heroHeadline?.split("Brings")[0] || "Good Food "}
                <span className="italic font-normal text-[#D9A441] block sm:inline">
                  {branding.heroHeadline?.includes("Brings")
                    ? `Brings ${branding.heroHeadline.split("Brings")[1]}`
                    : "Brings People Together"}
                </span>
              </h1>

              {/* Supporting Text */}
              <p className="text-base sm:text-lg text-stone-300 font-normal leading-relaxed max-w-xl">
                {branding.heroSubtitle}
              </p>

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => scrollToSection("menu")}
                  className="px-8 py-3.5 rounded-full bg-[#D9A441] hover:bg-[#B8862B] text-[#111111] font-bold text-base transition-all shadow-lg hover:shadow-xl hover:shadow-[#D9A441]/30 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Order Now</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={() => scrollToSection("menu")}
                  className="px-7 py-3.5 rounded-full bg-transparent hover:bg-white/10 text-white border border-white/20 font-medium text-base transition-colors cursor-pointer"
                >
                  View Menu
                </button>
              </div>

              {/* Social Proof Stack */}
              <div className="pt-4 flex items-center gap-4 border-t border-white/10">
                <div className="flex -space-x-2 overflow-hidden">
                  <img
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-[#111111] object-cover"
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                    alt="Customer"
                  />
                  <img
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-[#111111] object-cover"
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
                    alt="Customer"
                  />
                  <img
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-[#111111] object-cover"
                    src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=100&q=80"
                    alt="Customer"
                  />
                  <img
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-[#111111] object-cover"
                    src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80"
                    alt="Customer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs text-stone-300 font-semibold block mt-0.5">
                    {branding.heroBadge || "5,000+ Happy Customers"} • {branding.heroRating || "4.9 Rating"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Hero Image Column */}
            <div className="lg:col-span-6 relative flex justify-center">
              <div className="relative max-w-md sm:max-w-lg lg:max-w-none w-full">
                {/* Image Glow Ring */}
                <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-[#D9A441]/40 via-transparent to-[#B8862B]/30 blur-xl opacity-80" />

                {/* Main Food Photography */}
                <div className="relative rounded-3xl sm:rounded-[36px] overflow-hidden border border-white/15 shadow-2xl bg-stone-900 group">
                  <img
                    src={branding.heroBannerUrl || DEFAULT_BRAND.heroBannerUrl!}
                    alt="Signature Platter"
                    className="w-full h-[340px] sm:h-[440px] lg:h-[480px] object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>

                {/* Handwritten Taste The Difference Badge */}
                <div className="absolute -bottom-4 right-4 sm:-bottom-6 sm:right-6 bg-[#18181b]/95 border border-[#D9A441]/40 rounded-2xl p-4 shadow-xl backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-[#D9A441]" />
                    <div>
                      <p className="font-serif italic text-base text-[#D9A441] font-semibold leading-none">
                        Taste The Difference
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 mt-1">
                        Artisan Crafted • Always Fresh
                      </p>
                    </div>
                  </div>
                </div>

                {/* Table ordering notice if applicable */}
                {table && (
                  <div className="absolute top-4 left-4 bg-[#18181b]/95 border border-[#D9A441] rounded-xl px-3 py-1.5 text-xs text-stone-200 font-semibold shadow-lg">
                    📍 Table #{table.number} {table.area ? `(${table.area})` : ""}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          SERVICE BENEFITS BAR (Horizontal directly below hero)
      ─────────────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#F8F5EE] border-y border-[#E5E7EB] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            {/* Benefit 1 */}
            <div className="flex items-center gap-3.5 p-2">
              <div className="h-12 w-12 rounded-xl bg-white border border-[#E5E7EB] shadow-xs flex items-center justify-center text-[#D9A441] shrink-0">
                <Bike className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#171717] text-sm sm:text-base leading-snug">
                  {branding.feature1Title || "Fast Delivery"}
                </h4>
                <p className="text-xs text-[#777777]">{branding.feature1Desc || "Hot food at your door"}</p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex items-center gap-3.5 p-2">
              <div className="h-12 w-12 rounded-xl bg-white border border-[#E5E7EB] shadow-xs flex items-center justify-center text-[#D9A441] shrink-0">
                <Leaf className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#171717] text-sm sm:text-base leading-snug">
                  {branding.feature2Title || "Fresh Ingredients"}
                </h4>
                <p className="text-xs text-[#777777]">{branding.feature2Desc || "Always fresh & healthy"}</p>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="flex items-center gap-3.5 p-2">
              <div className="h-12 w-12 rounded-xl bg-white border border-[#E5E7EB] shadow-xs flex items-center justify-center text-[#D9A441] shrink-0">
                <ChefHat className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#171717] text-sm sm:text-base leading-snug">
                  {branding.feature3Title || "Expert Chefs"}
                </h4>
                <p className="text-xs text-[#777777]">{branding.feature3Desc || "Crafted with love"}</p>
              </div>
            </div>

            {/* Benefit 4 */}
            <div className="flex items-center gap-3.5 p-2">
              <div className="h-12 w-12 rounded-xl bg-white border border-[#E5E7EB] shadow-xs flex items-center justify-center text-[#D9A441] shrink-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#171717] text-sm sm:text-base leading-snug">
                  {branding.feature4Title || "Safe & Secure"}
                </h4>
                <p className="text-xs text-[#777777]">{branding.feature4Desc || "100% secure ordering"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          MAIN DIGITAL ORDERING MENU SECTION
      ─────────────────────────────────────────────────────────────────────────── */}
      <section id="menu" className="bg-[#F8F5EE] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
            <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#D9A441]">
              OUR MENU
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#171717]">
              Explore Our Delicious Menu
            </h2>
            <p className="text-sm sm:text-base text-[#777777]">
              A variety of dishes prepared with the freshest ingredients
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search burger, pasta, pizza, desserts..."
                className="w-full h-11 pl-10 pr-10 rounded-full bg-white border border-[#E5E7EB] text-sm text-[#171717] placeholder:text-[#777777]/60 shadow-xs focus:ring-2 focus:ring-[#D9A441] focus:border-transparent outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Interactive Category Navigation Tabs */}
          <div className="flex items-center justify-start sm:justify-center gap-2.5 overflow-x-auto pb-4 mb-10 no-scrollbar px-2">
            {categories.map(cat => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shadow-xs ${
                    isActive
                      ? "bg-[#D9A441] text-white shadow-md shadow-[#D9A441]/30 scale-105"
                      : "bg-white text-[#171717] border border-[#E5E7EB] hover:border-[#D9A441]/50 hover:bg-stone-50"
                  }`}
                >
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>

          {/* Product Cards Grid */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#E5E7EB] max-w-md mx-auto p-8">
              <Utensils className="h-12 w-12 text-stone-300 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-lg text-stone-800">No dishes found</h3>
              <p className="text-xs text-stone-500 mt-1">Try another search or select a different category</p>
              <button
                onClick={() => {
                  setActiveCategory("all")
                  setSearchQuery("")
                }}
                className="mt-4 px-4 py-2 rounded-full bg-[#D9A441] text-white text-xs font-semibold"
              >
                View All Dishes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6">
              {filteredItems.map(item => {
                const inCartItem = cart.find(ci => ci.item.id === item.id)
                const inCartQty = inCartItem?.qty || 0

                return (
                  <div
                    key={item.id}
                    onClick={() => openDetailModal(item)}
                    className="group bg-white rounded-2xl sm:rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    {/* Image Container */}
                    <div className="relative h-32 sm:h-52 w-full overflow-hidden bg-stone-100">
                      <img
                        src={item.imageUrl || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Popular Badge */}
                      {item.isPopular && (
                        <span className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-rose-600 text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-wider shadow-md">
                          Popular
                        </span>
                      )}

                      {/* Dietary Badges */}
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1">
                        {item.isVegetarian && (
                          <span className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-emerald-600/90 text-white flex items-center justify-center text-[10px] sm:text-xs shadow" title="Vegetarian">
                            <Leaf className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </span>
                        )}
                        {item.isSpicy && (
                          <span className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-orange-600/90 text-white flex items-center justify-center text-[10px] sm:text-xs shadow" title="Spicy">
                            <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-2.5 sm:p-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1 sm:space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-0.5 sm:gap-2">
                          <h3 className="font-serif font-bold text-xs sm:text-lg text-[#171717] group-hover:text-[#D9A441] transition-colors leading-tight line-clamp-1 sm:line-clamp-none">
                            {item.name}
                          </h3>
                          <span className="font-bold text-xs sm:text-base text-[#D9A441] whitespace-nowrap">
                            {formatPrice(item.salePrice || item.price)}
                          </span>
                        </div>

                        <p className="text-[10px] sm:text-xs text-[#777777] line-clamp-1 sm:line-clamp-2 leading-tight sm:leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Card Footer: Add to Cart CTA */}
                      <div className="pt-2 sm:pt-4 mt-2 border-t border-stone-100 flex items-center justify-between">
                        {item.isSoldOut ? (
                          <div className="w-full h-8 sm:h-10 rounded-lg sm:rounded-xl bg-stone-100 text-stone-400 font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-stone-200">
                            <span>Sold Out</span>
                          </div>
                        ) : inCartQty > 0 ? (
                          <div
                            onClick={e => e.stopPropagation()}
                            className="w-full flex items-center justify-between bg-stone-100 rounded-lg sm:rounded-xl px-1.5 sm:px-2 py-1 sm:py-1.5"
                          >
                            <button
                              onClick={() => inCartItem && handleUpdateQty(inCartItem.id, -1)}
                              className="h-6 w-6 sm:h-7 sm:w-7 rounded-md sm:rounded-lg bg-white border border-stone-200 text-stone-700 flex items-center justify-center hover:bg-stone-50 font-bold active:scale-95"
                            >
                              <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </button>
                            <span className="font-bold text-xs sm:text-sm text-[#171717]">{inCartQty} in cart</span>
                            <button
                              onClick={() => inCartItem && handleUpdateQty(inCartItem.id, 1)}
                              className="h-6 w-6 sm:h-7 sm:w-7 rounded-md sm:rounded-lg bg-[#D9A441] text-white flex items-center justify-center hover:bg-[#B8862B] font-bold active:scale-95"
                            >
                              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={e => handleQuickAdd(e, item)}
                            className="w-full h-8 sm:h-10 rounded-lg sm:rounded-xl bg-[#D9A441] hover:bg-[#B8862B] text-white font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-2 transition-all shadow-xs hover:shadow-md active:scale-95"
                          >
                            <ShoppingBag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span>Add to Cart</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          SPLIT PROMOTIONAL SECTION (SPECIAL OFFER & STORY)
      ─────────────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#F8F5EE] pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Promotional Card: Special Offer */}
            <div className="relative rounded-3xl overflow-hidden bg-[#18181b] text-white p-8 sm:p-10 flex flex-col justify-between min-h-[320px] shadow-xl group">
              {/* Background Pizza Image */}
              <div className="absolute inset-0 z-0">
                <img
                  src={branding.offerBannerUrl || DEFAULT_BRAND.offerBannerUrl!}
                  alt="Special Offer"
                  className="w-full h-full object-cover object-center opacity-40 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
              </div>

              {/* Top Row: Eyebrow + 20% OFF Circular Badge */}
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase font-bold tracking-[0.2em] text-[#D9A441] block mb-2">
                    Special Offer
                  </span>
                  <h3 className="text-3xl sm:text-4xl font-serif font-bold leading-tight">
                    {branding.offerHeadline}
                  </h3>
                  <p className="text-sm text-stone-300 mt-1 font-medium">
                    {branding.offerSubtext}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-stone-400">Use promo code:</span>
                    <span className="bg-[#D9A441]/20 border border-[#D9A441]/50 text-[#D9A441] text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
                      {branding.offerCode || "SAVORO20"}
                    </span>
                  </div>
                </div>

                {/* Circular Badge */}
                <div className="h-20 w-20 rounded-full border-2 border-dashed border-[#D9A441] flex flex-col items-center justify-center text-center p-2 bg-black/50 backdrop-blur-sm shrink-0">
                  <span className="text-sm font-bold text-[#D9A441] leading-none">
                    {branding.offerBadge}
                  </span>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="relative z-10 pt-6">
                <button
                  onClick={() => scrollToSection("menu")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D9A441] hover:bg-[#B8862B] text-[#111111] font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <span>Order Now</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Right Promotional Card: Fresh & Healthy / Story */}
            <div className="relative rounded-3xl overflow-hidden bg-white text-[#171717] border border-[#E5E7EB] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-3 z-10 sm:max-w-[55%]">
                <span className="text-xs uppercase font-bold tracking-[0.2em] text-[#D9A441] block">
                  {branding.storyEyebrow}
                </span>
                <h3 className="text-3xl sm:text-4xl font-serif font-bold text-[#171717] leading-tight">
                  {branding.storyTitle}
                </h3>
                <p className="text-xs sm:text-sm text-[#777777] leading-relaxed">
                  {branding.storyText}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => scrollToSection("about")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#171717] text-[#171717] font-semibold text-xs hover:bg-stone-50 transition active:scale-95 cursor-pointer"
                  >
                    <span>Our Story</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Fresh Salad Bowl Image */}
              <div className="relative h-48 w-48 sm:h-56 sm:w-56 rounded-full overflow-hidden border-4 border-[#F8F5EE] shadow-lg shrink-0">
                <img
                  src={branding.storyImageUrl || DEFAULT_BRAND.storyImageUrl!}
                  alt="Fresh & Healthy"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          ABOUT / STORY SECTION
      ─────────────────────────────────────────────────────────────────────────── */}
      <section id="about" className="bg-[#18181b] text-white py-16 md:py-24 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Image Collage */}
            <div className="lg:col-span-6 relative">
              <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=85"
                  alt="Chef cooking"
                  className="w-full h-[380px] sm:h-[460px] object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 hidden sm:block w-48 h-48 rounded-2xl overflow-hidden border-4 border-[#18181b] shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80"
                  alt="Restaurant interior"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right Story Content */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#D9A441]">
                CULINARY HERITAGE
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white leading-tight">
                Crafting Unforgettable Flavors Since Day One
              </h2>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
                At {branding.name}, we believe that dining is an art form. Every dish on our menu is
                born from a deep passion for culinary perfection, marrying traditional artisan
                recipes with the freshest hand-selected local produce.
              </p>
              <p className="text-stone-400 text-sm leading-relaxed">
                From our prime grass-fed cuts seared with rosemary and garlic to our 48-hour fermented
                sourdough pizzas, each meal is designed to bring family, friends, and food lovers
                together around the table.
              </p>

              {/* 3 Value Pillars */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div>
                  <h4 className="font-serif font-bold text-2xl text-[#D9A441]">100%</h4>
                  <p className="text-xs text-stone-400 mt-1">Fresh Farm Produce</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-2xl text-[#D9A441]">15+</h4>
                  <p className="text-xs text-stone-400 mt-1">Award-Winning Recipes</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-2xl text-[#D9A441]">4.9★</h4>
                  <p className="text-xs text-stone-400 mt-1">Average Customer Rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          ORDER EXPERIENCE (3 SIMPLE STEPS)
      ─────────────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#111111] py-16 border-b border-white/10 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#D9A441]">
              HOW IT WORKS
            </span>
            <h2 className="text-3xl font-serif font-bold text-white">Seamless 3-Step Ordering</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {/* Step 1 */}
            <div className="bg-[#18181b] p-8 rounded-3xl border border-white/10 relative">
              <span className="font-serif font-bold text-5xl text-[#D9A441]/20 absolute top-4 right-6">
                01
              </span>
              <div className="h-14 w-14 rounded-2xl bg-[#D9A441]/10 text-[#D9A441] flex items-center justify-center mx-auto mb-4">
                <Utensils className="h-7 w-7" />
              </div>
              <h3 className="font-serif font-bold text-lg text-white mb-2">Choose Your Food</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Browse our curated menu with mouth-watering photos, ingredients, and categories.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#18181b] p-8 rounded-3xl border border-white/10 relative">
              <span className="font-serif font-bold text-5xl text-[#D9A441]/20 absolute top-4 right-6">
                02
              </span>
              <div className="h-14 w-14 rounded-2xl bg-[#D9A441]/10 text-[#D9A441] flex items-center justify-center mx-auto mb-4">
                <SlidersHorizontal className="h-7 w-7" />
              </div>
              <h3 className="font-serif font-bold text-lg text-white mb-2">Customize Your Order</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Select add-ons, extra toppings, spice level, and special kitchen instructions.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#18181b] p-8 rounded-3xl border border-white/10 relative">
              <span className="font-serif font-bold text-5xl text-[#D9A441]/20 absolute top-4 right-6">
                03
              </span>
              <div className="h-14 w-14 rounded-2xl bg-[#D9A441]/10 text-[#D9A441] flex items-center justify-center mx-auto mb-4">
                <Bike className="h-7 w-7" />
              </div>
              <h3 className="font-serif font-bold text-lg text-white mb-2">Enjoy Your Meal</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Fast doorstep delivery or table service with live status updates and WhatsApp support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          RESTAURANT GALLERY
      ─────────────────────────────────────────────────────────────────────────── */}
      <section id="gallery" className="bg-[#F8F5EE] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#D9A441]">
              VISUAL FEAST
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#171717]">
              Our Dining Gallery
            </h2>
            <p className="text-xs sm:text-sm text-[#777777]">
              Experience the atmosphere, the craft, and the culinary passion of {branding.name}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {activeGallery.map((img, idx) => (
              <div
                key={idx}
                className="group relative h-48 sm:h-64 rounded-3xl overflow-hidden border border-[#E5E7EB] shadow-sm bg-stone-200"
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-5">
                  <span className="font-serif font-bold text-white text-base">{img.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          TESTIMONIALS SECTION
      ─────────────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#18181b] text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#D9A441]">
              COMMUNITY LOVE
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
              What Our Customers Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {TESTIMONIALS.map((t, idx) => (
              <div
                key={idx}
                className="bg-[#111111] p-7 rounded-3xl border border-white/10 space-y-4 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-[#D9A441]">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-stone-300 leading-relaxed italic">
                    "{t.text}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-10 w-10 rounded-full object-cover border border-[#D9A441]"
                  />
                  <div>
                    <h4 className="font-semibold text-sm text-white">{t.name}</h4>
                    <p className="text-[11px] text-stone-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          FOOTER (DARK CINEMATIC THEME)
      ─────────────────────────────────────────────────────────────────────────── */}
      <footer id="contact" className="bg-[#111111] text-stone-300 border-t border-white/10 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Newsletter Box */}
          <div className="max-w-2xl mx-auto text-center space-y-3 p-8 rounded-3xl bg-[#18181b] border border-white/10 shadow-2xl">
            <h3 className="font-serif font-bold text-2xl text-white">Stay Updated</h3>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              Subscribe to get special offers, new menu items and secret seasonal promotions!
            </p>
            <div className="flex items-center gap-2 max-w-md mx-auto pt-2">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 h-11 px-4 rounded-full bg-white/5 border border-white/15 text-sm text-white placeholder:text-stone-500 outline-none focus:border-[#D9A441]"
              />
              <button
                onClick={() => toast.success("Thank you for subscribing!")}
                className="px-6 h-11 rounded-full bg-[#D9A441] hover:bg-[#B8862B] text-[#111111] font-bold text-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                Subscribe
              </button>
            </div>
          </div>

          {/* Links Columns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-6">
            {/* Brand column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-[#D9A441]" />
                <span className="font-serif text-2xl font-bold text-white tracking-wide">
                  {branding.name}
                </span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                {branding.tagline}
              </p>
              <div className="flex items-center gap-3 text-stone-400">
                <a href={branding.socialInstagram || "https://instagram.com"} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-white/5 hover:text-[#D9A441] transition">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href={branding.socialFacebook || "https://facebook.com"} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-white/5 hover:text-[#D9A441] transition">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href={`https://wa.me/${(branding.phone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-white/5 hover:text-[#00E785] transition">
                  <WhatsAppIcon className="h-4 w-4 text-[#00E785]" />
                </a>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-3">
                Quick Links
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => scrollToSection("hero")} className="hover:text-[#D9A441] transition">
                    Home
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("menu")} className="hover:text-[#D9A441] transition">
                    Menu
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("about")} className="hover:text-[#D9A441] transition">
                    About
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("gallery")} className="hover:text-[#D9A441] transition">
                    Gallery
                  </button>
                </li>
              </ul>
            </div>

            {/* Customer Links */}
            <div>
              <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-3">
                Customer Care
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => setCartOpen(true)} className="hover:text-[#D9A441] transition">
                    View Cart
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("menu")} className="hover:text-[#D9A441] transition">
                    Special Offers
                  </button>
                </li>
                <li>
                  <a href={`https://wa.me/${(branding.phone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="hover:text-[#D9A441] transition flex items-center gap-1.5">
                    <WhatsAppIcon className="h-3.5 w-3.5 text-[#00E785]" />
                    <span>WhatsApp Order Support</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Details */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-3">
                Contact & Location
              </h4>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#D9A441] shrink-0" />
                <span>{branding.address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#D9A441] shrink-0" />
                <span>{branding.phone}</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#D9A441] shrink-0" />
                <span>{branding.openingHours}</span>
              </p>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 border-t border-white/10 text-center text-xs text-stone-500">
            © {new Date().getFullYear()} {branding.name}. All rights reserved. Powered by Fizmoh Smart Menu & Ordering.
          </div>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────────────────
          PRODUCT DETAIL MODAL WITH CUSTOMIZABLE ADD-ONS
      ─────────────────────────────────────────────────────────────────────────── */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E5E7EB] text-[#171717] animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header Image */}
            <div className="relative h-60 w-full overflow-hidden bg-stone-100">
              <img
                src={detailItem.imageUrl || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"}
                alt={detailItem.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setDetailItem(null)}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-serif font-bold text-2xl text-[#171717]">
                    {detailItem.name}
                  </h3>
                  <span className="font-bold text-xl text-[#D9A441]">
                    {formatPrice(detailItem.salePrice || detailItem.price)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#777777] mt-1.5 leading-relaxed">
                  {detailItem.description}
                </p>

                {/* Dietary Tags */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {detailItem.prepTimeMinutes && (
                    <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {detailItem.prepTimeMinutes} mins
                    </span>
                  )}
                  {detailItem.calories && (
                    <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium">
                      🔥 {detailItem.calories} kcal
                    </span>
                  )}
                  {detailItem.isVegetarian && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                      🌱 Vegetarian
                    </span>
                  )}
                </div>
              </div>

              {/* Optional Add-Ons Selection */}
              <div className="space-y-2.5 pt-3 border-t border-stone-100">
                <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700">
                  Select Add-Ons & Extras
                </h4>
                <div className="space-y-2">
                  {AVAILABLE_ADD_ONS.map(addon => {
                    const isSelected = selectedAddOns.some(a => a.id === addon.id)
                    return (
                      <label
                        key={addon.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? "border-[#D9A441] bg-[#D9A441]/5 text-[#171717]"
                            : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedAddOns(prev =>
                                isSelected
                                  ? prev.filter(a => a.id !== addon.id)
                                  : [...prev, addon]
                              )
                            }}
                            className="h-4 w-4 rounded text-[#D9A441] focus:ring-[#D9A441]"
                          />
                          <span className="text-xs font-semibold">{addon.name}</span>
                        </div>
                        <span className="text-xs font-bold text-[#D9A441]">
                          +{formatPrice(addon.price)}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Special Instructions Field */}
              <div className="space-y-1.5 pt-2 border-t border-stone-100">
                <label className="font-bold text-xs uppercase tracking-wider text-stone-700">
                  Special Instructions
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. No onions, sauce on the side, well done..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-stone-200 text-xs text-[#171717] focus:ring-2 focus:ring-[#D9A441] outline-none"
                />
              </div>

              {/* Quantity Stepper & Add Button */}
              <div className="flex items-center justify-between gap-4 pt-3 border-t border-stone-100">
                <div className="flex items-center gap-2 bg-stone-100 rounded-xl p-1">
                  <button
                    onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                    className="h-8 w-8 rounded-lg bg-white text-stone-700 font-bold flex items-center justify-center hover:bg-stone-50 shadow-xs"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-sm">{detailQty}</span>
                  <button
                    onClick={() => setDetailQty(detailQty + 1)}
                    className="h-8 w-8 rounded-lg bg-[#D9A441] text-white font-bold flex items-center justify-center hover:bg-[#B8862B] shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  disabled={detailItem.isSoldOut}
                  onClick={() => !detailItem.isSoldOut && handleAddToCart(detailItem, detailQty, selectedAddOns, specialInstructions)}
                  className={`flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition ${
                    detailItem.isSoldOut
                      ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                      : "bg-[#D9A441] hover:bg-[#B8862B] text-white active:scale-95"
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>
                    {detailItem.isSoldOut
                      ? "Currently Sold Out"
                      : `Add To Cart • ${formatPrice(((detailItem.salePrice || detailItem.price) + selectedAddOns.reduce((s, a) => s + a.price, 0)) * detailQty)}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          SLIDE-OUT CART DRAWER (DESKTOP & FULLSCREEN MOBILE)
      ─────────────────────────────────────────────────────────────────────────── */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end animate-fadeIn"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white h-full flex flex-col justify-between shadow-2xl text-[#171717] animate-slideInRight"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-[#F8F5EE]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#D9A441]" />
                <h3 className="font-serif font-bold text-lg">Your Order ({cartTotalCount})</h3>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-2 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 space-y-3">
                  <ShoppingBag className="h-14 w-14 text-stone-300 mx-auto" />
                  <h4 className="font-serif font-bold text-lg text-stone-700">Your cart is empty</h4>
                  <p className="text-xs text-stone-500">Explore our delicious menu to add dishes!</p>
                  <button
                    onClick={() => {
                      setCartOpen(false)
                      scrollToSection("menu")
                    }}
                    className="mt-3 px-5 py-2.5 rounded-full bg-[#D9A441] text-white text-xs font-bold"
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                cart.map(ci => (
                  <div
                    key={ci.id}
                    className="flex gap-3.5 p-3 rounded-2xl border border-stone-100 bg-[#F8F5EE]/40"
                  >
                    <img
                      src={ci.item.imageUrl || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=150&q=80"}
                      alt={ci.item.name}
                      className="h-18 w-18 rounded-xl object-cover shrink-0 border"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-[#171717]">{ci.item.name}</h4>
                          <span className="text-xs font-bold text-[#D9A441]">
                            {formatPrice(ci.totalPrice)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(ci.id)}
                          className="text-stone-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Add-ons summary */}
                      {ci.selectedAddOns.length > 0 && (
                        <p className="text-[10px] text-stone-500 mt-1">
                          + {ci.selectedAddOns.map(a => a.name).join(", ")}
                        </p>
                      )}

                      {/* Notes */}
                      {ci.specialInstructions && (
                        <p className="text-[10px] italic text-stone-500">
                          "{ci.specialInstructions}"
                        </p>
                      )}

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleUpdateQty(ci.id, -1)}
                          className="h-6 w-6 rounded bg-white border border-stone-200 text-stone-600 flex items-center justify-center"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold px-1">{ci.qty}</span>
                        <button
                          onClick={() => handleUpdateQty(ci.id, 1)}
                          className="h-6 w-6 rounded bg-[#D9A441] text-white flex items-center justify-center"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-stone-200 bg-[#F8F5EE] space-y-4">
                {/* Promo Code Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={e => setDiscountCode(e.target.value)}
                    placeholder="Promo Code (try SAVORO20)"
                    className="flex-1 h-9 px-3 rounded-lg border border-stone-300 text-xs uppercase font-mono"
                  />
                  <button
                    onClick={handleApplyPromo}
                    className="px-3 h-9 rounded-lg bg-stone-800 text-white text-xs font-bold hover:bg-black"
                  >
                    Apply
                  </button>
                </div>

                {/* Subtotals breakdown */}
                <div className="space-y-1.5 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatPrice(cartSubtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount ({appliedDiscount?.name || "Promo"})</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  {orderType === "DELIVERY" && (
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="font-semibold">{formatPrice(deliveryCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-[#171717] pt-2 border-t border-stone-300">
                    <span>Total</span>
                    <span className="text-[#D9A441]">{formatPrice(cartTotal)}</span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <button
                  onClick={() => {
                    setCartOpen(false)
                    setCheckoutOpen(true)
                  }}
                  className="w-full h-12 rounded-xl bg-[#D9A441] hover:bg-[#B8862B] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          CHECKOUT MODAL / SCREEN (WHATSAPP IN-APP BROWSER READY)
      ─────────────────────────────────────────────────────────────────────────── */}
      {checkoutOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
          onClick={() => !isPlacingOrder && setCheckoutOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 text-[#171717] my-6 animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-[#F8F5EE]">
              <div>
                <h3 className="font-serif font-bold text-xl">Checkout</h3>
                <p className="text-xs text-stone-500">
                  {orderType === "DINE_IN"
                    ? selectedTableNumber
                      ? `Dine-In • Table #${selectedTableNumber}`
                      : "Dine-In • Select Table Below"
                    : orderType === "TAKEAWAY"
                    ? "Self Pickup Order"
                    : "Fast Delivery Dispatch"}
                </p>
              </div>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {completedOrder ? (
              /* Order Confirmation Success State */
              <div className="p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 stroke-[3]" />
                </div>
                <h3 className="font-serif font-bold text-2xl text-stone-900">Order Confirmed!</h3>
                <p className="text-xs text-stone-600 max-w-xs mx-auto">
                  Thank you, <strong>{customerName}</strong>! Your order <strong>{completedOrder.orderNumber}</strong> has been received by the kitchen.
                </p>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Order Type:</span>
                    <span className="text-[#D9A441]">
                      {orderType === "DINE_IN" ? `Dine-In (Table #${selectedTableNumber})` : orderType === "TAKEAWAY" ? "Self Pickup" : "Delivery"}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Order Total:</span>
                    <span className="text-[#D9A441]">{formatPrice(completedOrder.total)}</span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>Estimated Preparation:</span>
                    <span>15 - 25 minutes</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {completedOrder.publicToken && (
                    <a
                      href={`/order/${completedOrder.publicToken}`}
                      className="w-full h-11 rounded-xl bg-[#171717] hover:bg-black text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                    >
                      <ChefHat className="h-4 w-4 text-[#D9A441]" />
                      <span>Live Order Status Tracker</span>
                    </a>
                  )}

                  {paymentMethod === "AMWALPAY_ONLINE" && (
                    <a
                      href={`/api/amwalpay/create-session?orderId=KIT-${completedOrder.orderId}`}
                      className="w-full h-11 rounded-xl bg-[#D9A441] hover:bg-[#B8862B] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                    >
                      <CreditCard className="h-4 w-4 text-white" />
                      <span>Pay Online via Card (AmwalPay)</span>
                    </a>
                  )}

                  <a
                    href={`https://wa.me/${(branding.phone || "+96898314456").replace(/\D/g, "")}`}
                    className="w-full h-11 rounded-xl bg-[#00E785] hover:bg-[#00B96A] text-[#111111] font-bold text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    <span>WhatsApp Updates</span>
                  </a>

                  <button
                    onClick={() => {
                      setCompletedOrder(null)
                      setCheckoutOpen(false)
                    }}
                    className="w-full h-10 rounded-xl bg-stone-100 text-stone-700 font-semibold text-xs hover:bg-stone-200"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Checkout Form */
              <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Order Type Toggle */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOrderType("DELIVERY")}
                    className={`py-2 px-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      orderType === "DELIVERY"
                        ? "bg-white text-[#171717] shadow-xs"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    <span>🛵</span>
                    <span className="truncate">Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("TAKEAWAY")}
                    className={`py-2 px-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      orderType === "TAKEAWAY"
                        ? "bg-white text-[#171717] shadow-xs"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    <span>🛍️</span>
                    <span className="truncate">Pickup</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("DINE_IN")}
                    className={`py-2 px-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      orderType === "DINE_IN"
                        ? "bg-white text-[#171717] shadow-xs"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    <span>🍽️</span>
                    <span className="truncate">Dine-In</span>
                  </button>
                </div>

                {/* Table Selection for Dine-In */}
                {orderType === "DINE_IN" && (
                  <div className="space-y-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-[#D9A441]" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-stone-800">
                          Select Table Number *
                        </h4>
                      </div>
                      {selectedTableNumber && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#D9A441] text-white text-[11px] font-bold">
                          Table #{selectedTableNumber}
                        </span>
                      )}
                    </div>

                    {table?.number && tableToken && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Connected to Table #{table.number} via QR code</span>
                      </div>
                    )}

                    <p className="text-[11px] text-stone-600">
                      Sitting at a table? Select your table so our staff brings your order directly to you.
                    </p>

                    {tables && tables.length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto pr-1">
                          {tables.map((tItem: any) => {
                            const isSelected = selectedTableNumber === tItem.number
                            return (
                              <button
                                key={tItem.id || tItem.number}
                                type="button"
                                onClick={() => {
                                  setSelectedTableNumber(tItem.number)
                                  setSelectedTableId(tItem.id)
                                }}
                                className={`py-2 px-1 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                                  isSelected
                                    ? "bg-[#D9A441] border-[#D9A441] text-white shadow-sm"
                                    : "bg-white border-stone-200 text-stone-700 hover:border-amber-400 hover:bg-amber-50/50"
                                }`}
                              >
                                <span>Table {tItem.number}</span>
                                <span className={`text-[9px] font-normal capitalize ${isSelected ? "text-white/80" : "text-stone-400"}`}>
                                  {tItem.area?.toLowerCase() || tItem.section?.toLowerCase() || "Indoor"}
                                </span>
                              </button>
                            )
                          })}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] font-semibold text-stone-500 whitespace-nowrap">
                            Or enter table #:
                          </span>
                          <input
                            type="text"
                            value={selectedTableNumber}
                            onChange={(e) => {
                              setSelectedTableNumber(e.target.value)
                              const matched = tables.find((t: any) => t.number === e.target.value.trim())
                              setSelectedTableId(matched?.id || "")
                            }}
                            placeholder="e.g. 5 or VIP-1"
                            className="flex-1 h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-xs outline-none focus:border-[#D9A441]"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={selectedTableNumber}
                          onChange={(e) => setSelectedTableNumber(e.target.value)}
                          placeholder="Enter Table Number (e.g. Table 4, VIP 1)"
                          className="w-full h-10 px-3 rounded-lg border border-stone-200 bg-white text-base sm:text-xs outline-none focus:border-[#D9A441]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Customer Info */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-stone-600">
                    Customer Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full h-10 px-3 rounded-lg border border-stone-200 text-base sm:text-xs outline-none focus:border-[#D9A441]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                        WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="+968 9123 4567"
                        className="w-full h-10 px-3 rounded-lg border border-stone-200 text-base sm:text-xs outline-none focus:border-[#D9A441]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="w-full h-10 px-3 rounded-lg border border-stone-200 text-base sm:text-xs outline-none focus:border-[#D9A441]"
                    />
                  </div>
                </div>

                {/* Delivery Address Fields */}
                {orderType === "DELIVERY" && (
                  <div className="space-y-3 pt-2 border-t border-stone-100">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-stone-600">
                      Delivery Address
                    </h4>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={e => setDeliveryAddress(e.target.value)}
                        placeholder="Street Name, Area (e.g. Shatti Al Qurum)"
                        className="w-full h-10 px-3 rounded-lg border border-stone-200 text-base sm:text-xs outline-none focus:border-[#D9A441]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                          Building Name / No.
                        </label>
                        <input
                          type="text"
                          value={building}
                          onChange={e => setBuilding(e.target.value)}
                          placeholder="Building 12"
                          className="w-full h-10 px-3 rounded-lg border border-stone-200 text-base sm:text-xs outline-none focus:border-[#D9A441]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                          Villa / Flat No.
                        </label>
                        <input
                          type="text"
                          value={apartment}
                          onChange={e => setApartment(e.target.value)}
                          placeholder="Flat 401"
                          className="w-full h-10 px-3 rounded-lg border border-stone-200 text-base sm:text-xs outline-none focus:border-[#D9A441]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Special Notes */}
                <div className="space-y-1.5 pt-2 border-t border-stone-100">
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Special Instructions / Notes
                  </label>
                  <textarea
                    value={deliveryNotes}
                    onChange={e => setDeliveryNotes(e.target.value)}
                    placeholder={orderType === "DINE_IN" ? "Any special requests for the kitchen or waiter..." : "Delivery notes, landmark, or kitchen notes..."}
                    rows={2}
                    className="w-full p-2.5 rounded-lg border border-stone-200 text-xs outline-none focus:border-[#D9A441]"
                  />
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-stone-600">
                    Payment Method
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("AMWALPAY_ONLINE")}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition col-span-2 ${
                        paymentMethod === "AMWALPAY_ONLINE"
                          ? "border-[#D9A441] bg-[#D9A441]/10 text-[#171717] ring-1 ring-[#D9A441]"
                          : "border-stone-200 text-stone-600 hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <CreditCard className="h-4 w-4 text-[#D9A441] shrink-0" />
                          <div>
                            <span className="block font-bold text-stone-900">💳 Pay Online (Credit / Debit Card)</span>
                            <span className="text-[10px] text-stone-500 font-normal">Visa, MasterCard, Benefit, Apple Pay via AmwalPay</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full whitespace-nowrap">Instant Pay</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CASH")}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition ${
                        paymentMethod === "CASH"
                          ? "border-[#D9A441] bg-[#D9A441]/10 text-[#171717]"
                          : "border-stone-200 text-stone-600"
                      }`}
                    >
                      💵 {orderType === "DINE_IN" ? "Pay at Table (Cash)" : "Cash on Delivery"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CARD_AT_VENUE")}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition ${
                        paymentMethod === "CARD_AT_VENUE"
                          ? "border-[#D9A441] bg-[#D9A441]/10 text-[#171717]"
                          : "border-stone-200 text-stone-600"
                      }`}
                    >
                      💳 {orderType === "DINE_IN" ? "Pay at Table (Card)" : "Card on Delivery"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("WHATSAPP")}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition col-span-2 ${
                        paymentMethod === "WHATSAPP"
                          ? "border-[#00E785] bg-[#00E785]/10 text-[#171717]"
                          : "border-stone-200 text-stone-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <WhatsAppIcon className="h-4 w-4 text-[#00E785]" />
                        <span>Confirm via WhatsApp (1-Tap Fast Checkout)</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Order Summary Line */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center text-sm font-bold">
                  <span>Total Due:</span>
                  <span className="text-[#D9A441] text-base">{formatPrice(cartTotal)}</span>
                </div>

                {/* Place Order CTA */}
                <button
                  type="button"
                  disabled={isPlacingOrder}
                  onClick={handlePlaceOrder}
                  className="w-full h-12 rounded-xl bg-[#D9A441] hover:bg-[#B8862B] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition disabled:opacity-50"
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending to Kitchen...</span>
                    </>
                  ) : (
                    <>
                      <span>Place Order • {formatPrice(cartTotal)}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          STICKY MOBILE CART BAR (OPTIMIZED FOR WHATSAPP BROWSER)
      ─────────────────────────────────────────────────────────────────────────── */}
      {cartTotalCount > 0 && !cartOpen && !checkoutOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#18181b]/95 backdrop-blur-md border-t border-white/15 p-3 md:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="flex items-center gap-2.5">
              <div className="relative p-2 rounded-xl bg-[#D9A441] text-[#111111] font-bold">
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-black text-white text-[10px] flex items-center justify-center">
                  {cartTotalCount}
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase text-stone-400 font-bold">Total</p>
                <p className="text-sm font-bold text-white">{formatPrice(cartTotal)}</p>
              </div>
            </div>

            <button
              onClick={() => setCartOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-[#D9A441] text-[#111111] font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <span>View Cart</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
