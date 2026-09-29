"use client"

import { useState, useEffect, useMemo } from "react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/context/language-context"
import { toast } from "sonner"
import {
  Layers, Search, CheckCircle2, Lock, Sparkles, Filter,
  MessageSquare, Users, Settings as SettingsIcon, UserCog,
  Map, Utensils, ShoppingBag, Store, Stamp, CalendarClock,
  Building2, Megaphone, Workflow, BookOpen, Phone, CreditCard,
  BarChart3, Newspaper, QrCode, Contact2, Facebook, MessageCircle,
  Building, ShoppingCart, Plug, Star, ShieldCheck, Loader2, RefreshCw,
  ArrowUpRight, AlertCircle, Eye, EyeOff,
} from "lucide-react"

export interface WorkspaceModuleItem {
  key: string
  label: string
  description: string
  group: string
  alwaysIncluded: boolean
  entitled: boolean
  enabled: boolean
  disabled: boolean
}

const MODULE_ICONS: Record<string, any> = {
  INBOX: MessageSquare,
  CRM: Users,
  SETTINGS: SettingsIcon,
  STAFF: UserCog,
  TOURS: Map,
  RESTAURANT: Utensils,
  CATALOG: ShoppingBag,
  WOOCOMMERCE: Store,
  VISA: Stamp,
  APPOINTMENTS: CalendarClock,
  HOSPITAL: Building2,
  BROADCAST: Megaphone,
  FLOWS: Workflow,
  AI: Sparkles,
  KNOWLEDGE: BookOpen,
  CALLS: Phone,
  PAYMENTS: CreditCard,
  REPORTS: BarChart3,
  CONTENT: Newspaper,
  DIGITAL_QR: QrCode,
  DIGITAL_VCARD: Contact2,
  SOCIAL_INBOX: Facebook,
  LIVE_CHAT: MessageCircle,
  CORPORATE: Building,
  ECOMMERCE: ShoppingCart,
  INTEGRATION: Plug,
  REPUTATION: Star,
  WHITE_LABEL: ShieldCheck,
}

const MODULE_AR_LABELS: Record<string, { label: string; desc: string }> = {
  INBOX: { label: "صندوق محادثات واتساب", desc: "صندوق بريد مشترك وإدارة المحادثات وتوزيعها على الفريق." },
  CRM: { label: "إدارة علاقات العملاء CRM", desc: "جهات الاتصال، العلامات، الملاحظات وتاريخ تفاعل العملاء." },
  SETTINGS: { label: "إعدادات مساحة العمل", desc: "ملف الشركة، التكاملات، وخصائص النظام العامة." },
  STAFF: { label: "إدارة الموظفين والصلاحيات", desc: "أعضاء الفريق ومستويات الوصول والأدوار الإدارية." },
  TOURS: { label: "السياحة والرحلات والمواعيد", desc: "إدارة الرحلات والفتحات الزمنية وقسائم الحجز." },
  RESTAURANT: { label: "المنيو الذكي وطلبات الطاولات", desc: "قوائم طعام إلكترونية، طلبات QR، وشاشة مطبخ مباشرة KDS." },
  CATALOG: { label: "كتالوج المنتجات", desc: "مزامنة منتجات ومجموعات كتالوج واتساب التجاري." },
  WOOCOMMERCE: { label: "متجر ووكومرس", desc: "مزامنة فورية للطلبات والمنتجات واستعادة السلات." },
  VISA: { label: "تأشيرات السفر والمعاملات", desc: "إدارة طلبات التأشيرات والمستندات وخطوات المتابعة." },
  APPOINTMENTS: { label: "حجز المواعيد والاستشارات", desc: "جدولة المواعيد وحجوزات مكالمات الفيديو والاستشارات." },
  HOSPITAL: { label: "الرعاية الصحية والمستشفيات", desc: "مواعيد العيادات، غرف الرعاية، وتذكيرات الجلسات." },
  BROADCAST: { label: "حملات البث الجماعي", desc: "إرسال رسائل جماعية للشرائح المستهدفة بنسبة فتح 98%." },
  FLOWS: { label: "استوديو أتمتة البوتات", desc: "بناء مسارات ردود ومحادثات تفاعلية مرئية بدون كود." },
  AI: { label: "المساعد الذكي (AI Assistant)", desc: "ردود آلية بالذكاء الاصطناعي، فهم الصور، والتعلم الذاتي." },
  KNOWLEDGE: { label: "قاعدة المعرفة الذكية", desc: "مصادر ومستندات الإجابة الدقيقة على أسئلة العملاء." },
  CALLS: { label: "المكالمات الصوتية المباشرة", desc: "تسجيل وسجل المكالمات الصوتية الرسمية." },
  PAYMENTS: { label: "المدفوعات والفواتير (AmwalPay)", desc: "روابط الدفع السريع والتحقق التلقائي من التحويلات." },
  REPORTS: { label: "التقارير والتحليلات المتقدمة", desc: "تحليلات الأداء والمبيعات وسرعة استجابة الموظفين." },
  CONTENT: { label: "إدارة المحتوى والعروض", desc: "صفحات الهبوط وعروض الأسعار الترويجية." },
  DIGITAL_QR: { label: "لافتات QR وتقييمات العملاء", desc: "لافتات QR ذكية وتوجيه تقييمات العملاء الإيجابية." },
  DIGITAL_VCARD: { label: "بطاقة الأعمال الرقمية الذكية", desc: "بطاقة تعريفية رقمية تفاعلية مع حفظ جهة الاتصال بلمسة." },
  SOCIAL_INBOX: { label: "أتمتة إنستغرام وفيسبوك", desc: "الرد الآلي على رسائل وتعليقات ريلز ومنشورات ميتا." },
  LIVE_CHAT: { label: "شات الموقع المباشر", desc: "ودجت شات قابل للتضمين في أي موقع مع تحويل لواتساب." },
  CORPORATE: { label: "أنظمة الشركات والمصانع", desc: "إدارة طلبات عروض أسعار الواجهات والزجاج والألمنيوم." },
  ECOMMERCE: { label: "الربط بمتاجر شوبيفاي وسلة", desc: "مزامنة متاجر سلة وشوبيفاي وتأكيد الدفع عند الاستلام COD." },
  INTEGRATION: { label: "مزامنة جوجل شيت والويبهوك", desc: "تكامل مباشر مع جداول جوجل شيت والأنظمة السحابية." },
  REPUTATION: { label: "درع تقييمات جوجل 5 نجوم", desc: "حصد مراجعات خرائط جوجل الإيجابية وتصفية الشكاوى داخلياً." },
  WHITE_LABEL: { label: "بوابة الوكالات والموزعين", desc: "تخصيص الهوية والشعار والنطاق الخاص وإعادة البيع." },
}

interface Props {
  onNavigateToPlans?: () => void
  onNavigateToAddons?: () => void
}

export function WorkspaceModulesManager({ onNavigateToPlans, onNavigateToAddons }: Props) {
  const { isAr } = useLanguage()
  const [modules, setModules] = useState<WorkspaceModuleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL")

  const loadModules = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/workspace/modules")
      if (!res.ok) throw new Error("Failed to load workspace modules")
      const data = await res.json()
      setModules(data.modules || [])
    } catch (err: any) {
      toast.error(isAr ? "تعذر تحميل إعدادات الوحدات" : "Failed to load module configuration")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModules()
  }, [])

  const handleToggle = async (moduleItem: WorkspaceModuleItem, nextState: boolean) => {
    if (!moduleItem.entitled) {
      toast.info(
        isAr
          ? `الوحدة "${moduleItem.label}" غير مشمولة في باقتك الحالية. يمكنك ترقية الباقة أو تفعيلها كإضافة.`
          : `Module "${moduleItem.label}" is not included in your current plan. Upgrade or add it from Add-ons.`,
        {
          action: onNavigateToAddons ? {
            label: isAr ? "عرض الإضافات" : "View Add-ons",
            onClick: onNavigateToAddons,
          } : undefined,
        }
      )
      return
    }

    setToggling(moduleItem.key)
    try {
      const res = await fetch("/api/workspace/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: moduleItem.key, enabled: nextState }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to update module state")
      }

      // Optimistically update local state
      setModules((prev) =>
        prev.map((m) =>
          m.key === moduleItem.key
            ? { ...m, enabled: nextState, disabled: !nextState }
            : m
        )
      )

      // Notify sidebar and shell immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fizmoh:features-updated", {
            detail: { module: moduleItem.key, enabled: nextState },
          })
        )
      }

      if (nextState) {
        toast.success(
          isAr
            ? `تم تفعيل وحدة "${moduleItem.label}" بنجاح في مساحة العمل.`
            : `Module "${moduleItem.label}" is now ACTIVE on this workspace.`
        )
      } else {
        toast.warning(
          isAr
            ? `تم إيقاف تشغيل وحدة "${moduleItem.label}". لن تظهر في القائمة الجانبية.`
            : `Module "${moduleItem.label}" has been PAUSED. Hidden from workspace navigation.`
        )
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update module")
    } finally {
      setToggling(null)
    }
  }

  const groups = useMemo(() => {
    const set = new Set<string>()
    modules.forEach((m) => set.add(m.group))
    return ["ALL", ...Array.from(set)]
  }, [modules])

  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      const q = searchQuery.toLowerCase().trim()
      const arData = MODULE_AR_LABELS[m.key]
      const matchesSearch =
        !q ||
        m.label.toLowerCase().includes(q) ||
        m.key.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        (arData && (arData.label.includes(q) || arData.desc.includes(q)))

      const matchesGroup = selectedGroup === "ALL" || m.group === selectedGroup
      return matchesSearch && matchesGroup
    })
  }, [modules, searchQuery, selectedGroup])

  const stats = useMemo(() => {
    const entitled = modules.filter((m) => m.entitled).length
    const active = modules.filter((m) => m.enabled).length
    const paused = modules.filter((m) => m.entitled && m.disabled).length
    const locked = modules.filter((m) => !m.entitled).length
    return { entitled, active, paused, locked, total: modules.length }
  }, [modules])

  if (loading) {
    return (
      <div className="rounded-2xl border border-stone-200/80 bg-white p-12 text-center shadow-xs">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
        <p className="mt-3 text-xs font-semibold text-stone-500">
          {isAr ? "جاري تحميل وحدات وميزات مساحة العمل..." : "Loading workspace module capabilities..."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Capabilities Summary */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Layers className="h-4.5 w-4.5" />
              </span>
              <h2 className="text-lg font-bold text-stone-900">
                {isAr ? "إدارة وحدات وميزات مساحة العمل" : "Workspace Capabilities & Module Control"}
              </h2>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed max-w-2xl">
              {isAr
                ? "يمكنك تشغيل أو إيقاف أي وحدة مشمولة في اشتراكك بنقرة واحدة لتخصيص القائمة الجانبية وتجربة فريق العمل."
                : "Toggle included modules ON or OFF with a single click to tailor your navigation, team focus, and active features."}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadModules}
              className="h-8.5 rounded-lg border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              {isAr ? "تحديث" : "Refresh"}
            </Button>
            {onNavigateToPlans && (
              <Button
                size="sm"
                onClick={onNavigateToPlans}
                className="h-8.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-2xs flex items-center gap-1"
              >
                <span>{isAr ? "ترقية الباقة" : "Upgrade Plan"}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* 4 Stats Chips */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-stone-100">
          <div className="rounded-xl bg-stone-50/80 border border-stone-200/60 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              {isAr ? "إجمالي الوحدات" : "Total Modules"}
            </span>
            <p className="text-xl font-black text-stone-900 mt-0.5">{stats.total}</p>
          </div>

          <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/60 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              {isAr ? "نشطة ومفعلة" : "Active (ON)"}
            </span>
            <p className="text-xl font-black text-emerald-800 mt-0.5">{stats.active}</p>
          </div>

          <div className="rounded-xl bg-amber-50/80 border border-amber-200/60 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              {isAr ? "موقوفة مؤقتاً" : "Paused (OFF)"}
            </span>
            <p className="text-xl font-black text-amber-800 mt-0.5">{stats.paused}</p>
          </div>

          <div className="rounded-xl bg-stone-100/80 border border-stone-200/60 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              {isAr ? "تتطلب ترقية" : "Locked / Add-on"}
            </span>
            <p className="text-xl font-black text-stone-700 mt-0.5">{stats.locked}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث في الوحدات والميزات..." : "Search modules by keyword..."}
            className="h-9.5 pl-9 rounded-xl border-stone-200 bg-white text-xs text-stone-900 focus-visible:ring-emerald-500"
          />
        </div>

        {/* Group Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {groups.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedGroup === group
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}
            >
              {group === "ALL" ? (isAr ? "الكل" : "All Groups") : group}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Interactive Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredModules.map((item) => {
          const Icon = MODULE_ICONS[item.key] || Layers
          const ar = MODULE_AR_LABELS[item.key]
          const isBusy = toggling === item.key

          return (
            <div
              key={item.key}
              className={`rounded-2xl border p-4.5 bg-white flex flex-col justify-between transition-all duration-150 shadow-2xs hover:shadow-xs ${
                item.enabled
                  ? "border-emerald-300 ring-1 ring-emerald-400/20"
                  : item.entitled
                    ? "border-amber-200/90 bg-amber-500/[0.01]"
                    : "border-stone-200/80 bg-stone-50/40 opacity-80"
              }`}
            >
              <div>
                {/* Header: Icon, Group, and Switch */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.enabled
                          ? "bg-emerald-500/10 text-emerald-600"
                          : item.entitled
                            ? "bg-amber-500/10 text-amber-700"
                            : "bg-stone-100 text-stone-400"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        {item.group}
                      </span>
                      <h3 className="text-sm font-bold text-stone-900 truncate">
                        {isAr && ar ? ar.label : item.label}
                      </h3>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    ) : item.entitled ? (
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={(checked) => handleToggle(item, checked)}
                        className="cursor-pointer data-[state=checked]:bg-emerald-600"
                        aria-label={`Toggle ${item.label}`}
                      />
                    ) : (
                      <button
                        onClick={() => handleToggle(item, true)}
                        className="h-6 px-2 rounded-md bg-stone-100 border border-stone-200 text-stone-500 hover:text-stone-900 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                        title={isAr ? "يتطلب ترقية" : "Locked (Upgrade required)"}
                      >
                        <Lock className="h-2.5 w-2.5" />
                        <span>{isAr ? "مغلق" : "Unlock"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="mt-3 text-xs text-stone-600 leading-relaxed line-clamp-2">
                  {isAr && ar ? ar.desc : item.description}
                </p>
              </div>

              {/* Footer: Status Pill */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  {item.enabled ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-bold flex items-center gap-1 px-2 py-0.5">
                      <Eye className="h-3 w-3" />
                      <span>{isAr ? "مفعل وظاهر" : "Active & Visible"}</span>
                    </Badge>
                  ) : item.entitled ? (
                    <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] font-bold flex items-center gap-1 px-2 py-0.5">
                      <EyeOff className="h-3 w-3" />
                      <span>{isAr ? "موقوف مؤقتاً" : "Paused by You"}</span>
                    </Badge>
                  ) : (
                    <Badge className="bg-stone-100 text-stone-600 border-0 text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5">
                      <Lock className="h-3 w-3" />
                      <span>{isAr ? "غير مشمول بالخطة" : "Upgrade Needed"}</span>
                    </Badge>
                  )}
                </div>

                <span className="text-[10px] font-mono text-stone-600 uppercase">
                  {item.key}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-10 text-center">
          <Filter className="mx-auto h-6 w-6 text-stone-400 mb-2" />
          <p className="text-xs font-semibold text-stone-600">
            {isAr ? "لا توجد نتائج مطابقة لبحثك" : "No modules match the current filter or search criteria."}
          </p>
        </div>
      )}
    </div>
  )
}
