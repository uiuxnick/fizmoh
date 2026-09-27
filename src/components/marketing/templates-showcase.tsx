"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  Sparkles,
  ArrowRight,
  Eye,
  X,
  Zap,
  CheckCircle2,
  Workflow,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { BOT_TEMPLATES, type FlowTemplate } from "@/lib/bot-templates"
import { useLanguage } from "@/context/language-context"
import { toast } from "sonner"

const POPULAR_TAGS: Record<string, string> = {
  wati_abandoned_cart_recovery: "Wati / Interakt Favorite",
  wati_cod_order_verification: "Anti-RTO Shield",
  wati_google_reviews_booster: "5-Star Reputation",
  wati_lead_magnet_delivery: "Lead Gen Top Pick",
  wati_after_hours_auto_reply: "24/7 Essential",
  wati_vip_loyalty_rewards: "High Retention",
  wati_event_webinar_registration: "RSVP Conversion",
  wati_multi_branch_locator: "GCC Multi-Branch",
  fizmoh_digital_marketing_diagram: "Agency 7-Branch",
  smart_menu_full_ordering: "Smart Restaurant",
  oman_desert_safari_payment: "AmwalPay Online",
  kauvery_hospital_diagram_flow: "Healthcare Enterprise",
}

export function TemplatesShowcase() {
  const { isAr } = useLanguage()
  const [selectedCat, setSelectedCat] = useState<string>("All")
  const [search, setSearch] = useState("")
  const [previewTemplate, setPreviewTemplate] = useState<FlowTemplate | null>(null)

  const categories = useMemo(() => [
    { id: "All", labelEn: "All Templates", labelAr: "جميع القوالب" },
    { id: "E-Commerce", labelEn: "E-Commerce & Retail", labelAr: "المتاجر والتجارة" },
    { id: "CRM & AI", labelEn: "CRM, Growth & AI", labelAr: "خدمة العملاء والذكاء الاصطناعي" },
    { id: "Appointments", labelEn: "Appointments & Salons", labelAr: "الحجوزات والمواعيد" },
    { id: "Dining & Hospitality", labelEn: "Dining & Hospitality", labelAr: "المطاعم والضيافة" },
    { id: "Healthcare", labelEn: "Healthcare & Clinics", labelAr: "العيادات والمستشفيات" },
    { id: "Tours & Travel", labelEn: "Tours & Travel", labelAr: "السياحة والرحلات" },
    { id: "Corporate & Architectural", labelEn: "Corporate & B2B", labelAr: "الشركات والأنظمة الهندسية" },
  ], [])

  const filtered = useMemo(() => {
    return BOT_TEMPLATES.filter((tpl) => {
      if (selectedCat !== "All" && tpl.category !== selectedCat) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          tpl.name.toLowerCase().includes(q) ||
          tpl.description.toLowerCase().includes(q) ||
          tpl.category.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [selectedCat, search])

  const copyTemplateId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success("Template ID copied to clipboard")
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 space-y-10">
      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-[var(--mk-line)] p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              type="text"
              placeholder={isAr ? "ابحث في 44+ قالباً مخصصاً (سلة، متجر، حجز، تقييمات...)" : "Search 44+ templates (cart recovery, COD, clinic, salon, Google reviews...)"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl border-stone-200 focus:border-emerald-500 focus:ring-emerald-500 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-bold text-stone-700 bg-[#F2F2F2] px-3 py-2 rounded-xl border border-[var(--mk-line)]">
              {filtered.length} {isAr ? "قالب متاح" : "Templates Found"}
            </span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
          {categories.map((cat) => {
            const count = cat.id === "All" ? BOT_TEMPLATES.length : BOT_TEMPLATES.filter((t) => t.category === cat.id).length
            const active = selectedCat === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? "bg-stone-900 text-white shadow-xs"
                    : "bg-[#F7F7F7] text-stone-600 hover:bg-stone-200"
                }`}
              >
                <span>{isAr ? cat.labelAr : cat.labelEn}</span>
                <span className={`text-[10.5px] px-1.5 py-0.2 rounded-full ${active ? "bg-stone-700 text-stone-200" : "bg-stone-200/80 text-stone-600"}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tpl) => {
          const badgeLabel = POPULAR_TAGS[tpl.id]
          const nodeCount = Array.isArray(tpl.nodes) ? tpl.nodes.length : 5

          return (
            <div
              key={tpl.id}
              className="rounded-2xl border border-[var(--mk-line)] bg-white p-6 flex flex-col justify-between hover:border-emerald-500 hover:shadow-lg transition-all duration-200 group relative"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-3xl p-2 bg-[#F6F7F9] rounded-xl group-hover:scale-105 transition-transform duration-200">
                    {tpl.emoji}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200/60">
                      {tpl.category}
                    </span>
                    {badgeLabel && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                        {badgeLabel}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-extrabold text-[16px] text-stone-900 group-hover:text-emerald-700 transition-colors leading-snug">
                  {tpl.name}
                </h3>
                <p className="text-xs text-stone-500 mt-2 leading-relaxed line-clamp-3">
                  {tpl.description}
                </p>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 font-medium">
                  <span className="inline-flex items-center gap-1 bg-stone-50 px-2 py-0.5 rounded border border-stone-200/70">
                    <Workflow className="h-3 w-3 text-emerald-600" />
                    {nodeCount} Nodes
                  </span>
                  <span className="inline-flex items-center gap-1 bg-stone-50 px-2 py-0.5 rounded border border-stone-200/70">
                    <Zap className="h-3 w-3 text-amber-500" />
                    {tpl.trigger} Trigger
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewTemplate(tpl)}
                  className="text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 h-8 px-2.5"
                >
                  <Eye className="h-3.5 w-3.5 mr-1 text-stone-400" />
                  {isAr ? "معاينة المسار" : "Preview"}
                </Button>

                <Button
                  size="sm"
                  className="bg-[#00E785] hover:bg-[#00B96A] text-stone-950 font-bold text-xs h-8.5 px-3.5 rounded-lg border border-[#00B96A]/30 shadow-xs"
                  asChild
                >
                  <Link href={`/signup?template=${tpl.id}`}>
                    {isAr ? "استخدم القالب" : "Use Template"}
                    <ArrowRight className={`ml-1.5 h-3 w-3 ${isAr ? "rotate-180" : ""}`} />
                  </Link>
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/70">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 bg-white rounded-xl shadow-xs border border-stone-200">
                  {previewTemplate.emoji}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-stone-900">{previewTemplate.name}</h3>
                    <Badge variant="outline" className="text-[10px] font-semibold bg-white text-stone-600">
                      {previewTemplate.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 max-w-md line-clamp-1">{previewTemplate.description}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body - Flow Architecture Preview */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFA]">
              <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-semibold text-stone-700">Trigger Event</span>
                  <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-mono text-[11px] font-semibold border border-amber-200">
                    {previewTemplate.trigger}
                  </span>
                </div>
                {previewTemplate.triggerConfig && (
                  <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg font-mono text-[11px] border border-stone-100">
                    {JSON.stringify(previewTemplate.triggerConfig, null, 2)}
                  </div>
                )}
              </div>

              {/* Node Sequence List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Conversational Node Sequence ({previewTemplate.nodes.length} Steps)
                </h4>
                <div className="space-y-2.5">
                  {(previewTemplate.nodes as any[]).map((node, idx) => (
                    <div
                      key={node.id || idx}
                      className="rounded-xl border border-stone-200/90 bg-white p-3.5 shadow-2xs flex items-start gap-3 hover:border-emerald-300 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                            {node.type || "STEP"}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">id: {node.id}</span>
                        </div>
                        {node.data?.text && (
                          <p className="text-xs text-stone-600 mt-1.5 whitespace-pre-line bg-stone-50/80 p-2 rounded border border-stone-100 font-sans">
                            {String(node.data.text)}
                          </p>
                        )}
                        {node.data?.buttons && Array.isArray(node.data.buttons) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {node.data.buttons.map((b: string, bi: number) => (
                              <span key={bi} className="text-[11px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                                🔘 {b}
                              </span>
                            ))}
                          </div>
                        )}
                        {node.data?.rows && Array.isArray(node.data.rows) && (
                          <div className="mt-2 space-y-1">
                            {node.data.rows.map((r: any, ri: number) => (
                              <div key={ri} className="text-[11px] bg-stone-50 text-stone-700 px-2 py-1 rounded border border-stone-100 flex items-center justify-between">
                                <span className="font-semibold">{r.title}</span>
                                <span className="text-stone-400 text-[10px]">{r.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-stone-200 bg-white flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyTemplateId(previewTemplate.id)}
                className="text-xs font-semibold h-9 px-3"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5 text-stone-500" />
                Copy Template ID
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewTemplate(null)}
                  className="text-xs h-9 px-3"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  className="bg-[#00E785] hover:bg-[#00B96A] text-stone-950 font-bold text-xs h-9 px-4 rounded-lg border border-[#00B96A]/30 shadow-xs"
                  asChild
                >
                  <Link href={`/signup?template=${previewTemplate.id}`}>
                    Install Flow in Workspace
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
