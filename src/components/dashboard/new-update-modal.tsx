"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Smartphone,
  Layers,
  Globe,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Zap,
  Sliders,
  RotateCcw,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { useApp } from "@/lib/store"

export const CURRENT_UPDATE_VERSION = "v6.5.0"
const STORAGE_KEY = "fizmoh_last_seen_update_version"

interface FeatureHighlight {
  icon: any
  color: string
  bg: string
  title: string
  titleAr: string
  desc: string
  descAr: string
  tag?: string
}

const HIGHLIGHTS: FeatureHighlight[] = [
  {
    icon: Sparkles,
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-100",
    title: "AI Website Builder Studio & Copilot",
    titleAr: "استوديو بناء المواقع والذكاء الاصطناعي التوليدي",
    desc: "Generate complete, high-converting websites with GCC industry presets or prompt the live AI Copilot to modify themes, banners, and sections instantly.",
    descAr: "توليد مواقع ومتاجر متكاملة بضغطة زر مع 6 قوالب خليجية، وتعديل أي عنصر فوراً بأوامر الدردشة للذكاء الاصطناعي.",
    tag: "AI Powered",
  },
  {
    icon: Sliders,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-100",
    title: "Per-Device Responsive Column Controls",
    titleAr: "تحكم متجاوب بعدد الأعمدة لكل جهاز",
    desc: "Customize how many products show per row independently for Desktop (1 to 6), Tablet (1 to 4), and Mobile (1 or 2).",
    descAr: "تحكم كامل بعدد المنتجات في الصف الواحد لكل جهاز بشكل مستقل (1 إلى 6 للكمبيوتر، 1 إلى 4 للتابلت، 1 أو 2 للجوال).",
    tag: "Responsive",
  },
  {
    icon: Layers,
    color: "text-sky-600",
    bg: "bg-sky-50 border-sky-100",
    title: "Touch Carousels & Auto-Playing Sliders",
    titleAr: "سلايدرات تفاعلية للمنتجات وعروض الصور",
    desc: "Swipeable horizontal product showcases with quick 'Add to Cart' slide-out drawer and full-width auto-playing banner carousels.",
    descAr: "سلايدر منتجات أفقي متجاوب باللمس مع إضافة فورية لسلة التسوق، وسلايدر صور عريض للبانرات مع تشغيل تلقائي.",
  },
  {
    icon: MessageSquare,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-100",
    title: "WhatsApp Multi-CTA & Custom Inquiry Forms",
    titleAr: "أزرار واتساب المتعددة ونماذج الاستفسار",
    desc: "Dual-action WhatsApp callouts and custom inquiry forms (Name, Date, Guests, Notes) that launch WhatsApp with formatted inquiry messages.",
    descAr: "كتل أزرار تفاعلية مع نماذج استفسار مخصصة ترسل بيانات الحجز والطلب مباشرة لمحادثة واتساب.",
  },
  {
    icon: Globe,
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-100",
    title: "Instant Live Storefront & 1-Click Rollback",
    titleAr: "نشر فوري وسلس مع إمكانية الإلغاء بضغطة زر",
    desc: "Your published website is served with server-side rendering on your public URL, with a 1-click Unpublish button to switch back to classic catalog anytime.",
    descAr: "عرض موقعك للعملاء مباشرة بسرعة فائقة عبر الخادم، مع زر إلغاء النشر بضغطة واحدة للرجوع للكتالوج الكلاسيكي وقتما تشاء.",
  },
]

export function NewUpdateModal() {
  const [open, setOpen] = useState(false)
  const setView = useApp((s) => s.setView)

  useEffect(() => {
    // Check if user has already seen this release
    try {
      const lastSeen = localStorage.getItem(STORAGE_KEY)
      if (lastSeen !== CURRENT_UPDATE_VERSION) {
        // Small delay so the dashboard shell mounts smoothly
        const timer = setTimeout(() => {
          setOpen(true)
        }, 600)
        return () => clearTimeout(timer)
      }
    } catch {}
  }, [])

  useEffect(() => {
    // Listen for manual trigger (e.g. clicking What's New button in sidebar)
    const handleManualOpen = () => setOpen(true)
    window.addEventListener("open-whats-new-modal", handleManualOpen)
    return () => window.removeEventListener("open-whats-new-modal", handleManualOpen)
  }, [])

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, CURRENT_UPDATE_VERSION)
    } catch {}
    setOpen(false)
  }

  const handleExploreWebsiteBuilder = () => {
    handleDismiss()
    setView("website-builder")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); else setOpen(true) }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white rounded-3xl border border-stone-200 shadow-2xl">
        {/* Header with vibrant release badge */}
        <div className="relative p-6 sm:p-7 pb-5 bg-gradient-to-br from-[#0c1520] via-[#162232] to-[#0f2d24] text-white shrink-0 overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 left-12 w-48 h-48 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold tracking-wide">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                  <span>Release {CURRENT_UPDATE_VERSION}</span>
                </span>
                <span className="text-xs text-stone-400 font-medium">28 September 2026</span>
              </div>
              <Badge variant="outline" className="border-stone-700 text-stone-300 text-[10px] uppercase font-bold tracking-wider">
                Workspace Update
              </Badge>
            </div>

            <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              What&apos;s New in Fizmoh: AI Website Builder Studio
            </DialogTitle>
            <DialogDescription className="text-stone-300 text-xs sm:text-sm mt-1.5 leading-relaxed font-normal">
              We&apos;ve added powerful new generative web design tools, responsive per-device carousel controls, WhatsApp commerce blocks, and instant live storefront publishing.
            </DialogDescription>
          </div>
        </div>

        {/* Feature Cards Body */}
        <div className="p-6 overflow-y-auto max-h-[50vh] space-y-3 bg-stone-50/50">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
            Top Release Highlights
          </p>

          {HIGHLIGHTS.map((item, i) => {
            const Icon = item.icon
            return (
              <div
                key={i}
                className={`p-3.5 sm:p-4 rounded-2xl bg-white border ${item.bg.includes("border-") ? item.bg.split(" ")[1] : "border-stone-200"} shadow-2xs hover:shadow-xs transition flex items-start gap-3.5`}
              >
                <div className={`p-2.5 rounded-xl ${item.bg.split(" ")[0]} ${item.color} shrink-0 mt-0.5 shadow-2xs`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-stone-900 leading-snug">{item.title}</h4>
                    {item.tag && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 shrink-0">
                        {item.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed font-normal">{item.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-white border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <a
            href="/whats-new"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
          >
            <span>Read Complete Release Notes</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Got it
            </Button>
            <Button
              onClick={handleExploreWebsiteBuilder}
              size="sm"
              className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl gap-1.5 shadow-md shadow-emerald-950/10 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Open Website Builder</span>
              <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
