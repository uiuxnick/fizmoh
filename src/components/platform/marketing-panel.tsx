"use client"

import { useState, useMemo } from "react"
import {
  Download, Search, Copy, CheckCheck, Phone, Mail, Globe,
  ExternalLink, Users, MessageSquare, TrendingUp, Wifi, WifiOff,
  Building2, Target, Filter, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { TenantRow } from "@/components/platform/tenants-panel"

/** Auto-generated marketing tags for a tenant row */
function getTags(row: TenantRow): { label: string; color: string }[] {
  const tags: { label: string; color: string }[] = []
  if (row.whatsappNumber) tags.push({ label: "Has WhatsApp", color: "bg-emerald-100 text-emerald-700 border-emerald-200" })
  if (row.subscriptionStatus === "TRIALING") tags.push({ label: "Trial", color: "bg-amber-100 text-amber-700 border-amber-200" })
  if (row.subscriptionStatus === "ACTIVE") tags.push({ label: "Paying", color: "bg-blue-100 text-blue-700 border-blue-200" })
  if (row.status === "SUSPENDED") tags.push({ label: "Suspended", color: "bg-rose-100 text-rose-700 border-rose-200" })
  if ((row.messages ?? 0) > 500) tags.push({ label: "High Volume", color: "bg-purple-100 text-purple-700 border-purple-200" })
  if ((row.customers ?? 0) > 100) tags.push({ label: "Large Base", color: "bg-teal-100 text-teal-700 border-teal-200" })
  if ((row.messages ?? 0) === 0) tags.push({ label: "Inactive", color: "bg-stone-100 text-stone-500 border-stone-200" })
  // Trial expiring soon (within 3 days)
  if (row.trialEndsAt) {
    const daysLeft = Math.ceil((new Date(row.trialEndsAt).getTime() - Date.now()) / 86400000)
    if (daysLeft >= 0 && daysLeft <= 3) tags.push({ label: "Trial Expiring", color: "bg-orange-100 text-orange-700 border-orange-200" })
  }
  return tags
}

function daysSince(date: string | Date | null | undefined): string {
  if (!date) return "—"
  const ms = Date.now() - new Date(date).getTime()
  const days = Math.floor(ms / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

interface Props {
  rows: TenantRow[]
}

export function MarketingPanel({ rows }: Props) {
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "trial" | "suspended">("all")
  const [filterWa, setFilterWa] = useState<"all" | "connected" | "none">("all")
  const [copied, setCopied] = useState<string | null>(null)

  const copyTo = (text: string, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`Copied: ${text}`)
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const q = search.toLowerCase()
      const matchSearch = !q || [
        r.businessName, r.name, r.ownerEmail, r.ownerPhone,
        r.businessPhone, r.businessEmail, r.whatsappNumber,
        r.businessAddress, r.businessWebsite, r.slug,
      ].some(v => v?.toLowerCase().includes(q))

      const matchStatus =
        filterStatus === "all" ? true :
        filterStatus === "active" ? r.subscriptionStatus === "ACTIVE" :
        filterStatus === "trial" ? r.subscriptionStatus === "TRIALING" :
        filterStatus === "suspended" ? r.status === "SUSPENDED" : true

      const matchWa =
        filterWa === "all" ? true :
        filterWa === "connected" ? !!r.whatsappNumber :
        filterWa === "none" ? !r.whatsappNumber : true

      return matchSearch && matchStatus && matchWa
    })
  }, [rows, search, filterStatus, filterWa])

  // Summary stats
  const withWa = rows.filter(r => r.whatsappNumber).length
  const active = rows.filter(r => r.subscriptionStatus === "ACTIVE").length
  const trials = rows.filter(r => r.subscriptionStatus === "TRIALING").length
  const inactive = rows.filter(r => (r.messages ?? 0) === 0).length

  const handleExportCSV = () => {
    window.location.href = "/api/platform/marketing/export"
    toast.success("Downloading CSV…")
  }

  const copyAllEmails = () => {
    const emails = filtered.map(r => r.ownerEmail || r.businessEmail).filter(Boolean).join(", ")
    if (!emails) { toast.error("No emails found in current filter"); return }
    navigator.clipboard.writeText(emails)
    toast.success(`Copied ${filtered.length} email addresses`)
  }

  const copyAllPhones = () => {
    const phones = filtered.map(r => r.ownerPhone || r.whatsappNumber || r.businessPhone).filter(Boolean).join(", ")
    if (!phones) { toast.error("No phone numbers found in current filter"); return }
    navigator.clipboard.writeText(phones)
    toast.success(`Copied ${filtered.length} phone numbers`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-5 w-5 text-violet-600" />
            <h2 className="text-xl font-black text-stone-900">Marketing Intelligence</h2>
          </div>
          <p className="text-xs text-stone-500">
            Complete tenant contact directory for campaigns, upsells & re-engagement
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8"
            onClick={copyAllEmails}
          >
            <Mail className="h-3.5 w-3.5" />
            Copy All Emails
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8"
            onClick={copyAllPhones}
          >
            <Phone className="h-3.5 w-3.5" />
            Copy All Phones
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1.5 h-8 bg-violet-600 hover:bg-violet-700 text-white"
            onClick={handleExportCSV}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Tenants", value: rows.length, icon: Building2, color: "text-stone-600" },
          { label: "WhatsApp Connected", value: withWa, icon: Wifi, color: "text-emerald-600" },
          { label: "Paying Subscribers", value: active, icon: TrendingUp, color: "text-blue-600" },
          { label: "On Trial", value: trials, icon: Users, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-stone-500">{label}</span>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <div className="text-2xl font-black text-stone-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder="Search name, email, phone, city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
          {(["all", "active", "trial", "suspended"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                filterStatus === s ? "bg-white shadow-sm text-stone-800" : "text-stone-500 hover:text-stone-700"
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* WhatsApp filter */}
        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
          {[
            { key: "all", label: "All" },
            { key: "connected", label: "Has WA" },
            { key: "none", label: "No WA" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterWa(key as any)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                filterWa === key ? "bg-white shadow-sm text-stone-800" : "text-stone-500 hover:text-stone-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="text-xs text-stone-400 ml-auto">
          {filtered.length} of {rows.length} tenants
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/70">
                <th className="text-left px-4 py-2.5 font-bold text-stone-500 whitespace-nowrap">Business</th>
                <th className="text-left px-4 py-2.5 font-bold text-stone-500 whitespace-nowrap">Owner Contact</th>
                <th className="text-left px-4 py-2.5 font-bold text-stone-500 whitespace-nowrap">WhatsApp</th>
                <th className="text-left px-4 py-2.5 font-bold text-stone-500 whitespace-nowrap">Plan</th>
                <th className="text-left px-4 py-2.5 font-bold text-stone-500 whitespace-nowrap">Activity</th>
                <th className="text-left px-4 py-2.5 font-bold text-stone-500 whitespace-nowrap">Tags</th>
                <th className="text-left px-4 py-2.5 font-bold text-stone-500 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-stone-400 text-xs">
                    No tenants match your filter
                  </td>
                </tr>
              )}
              {filtered.map(row => {
                const tags = getTags(row)
                const displayName = row.businessName || row.name
                const email = row.ownerEmail || row.businessEmail
                const phone = row.ownerPhone || row.whatsappNumber || row.businessPhone

                return (
                  <tr key={row.id} className="hover:bg-stone-50/50 transition-colors">
                    {/* Business */}
                    <td className="px-4 py-3 min-w-[180px]">
                      <div className="flex items-center gap-2.5">
                        {row.logoUrl ? (
                          <img src={row.logoUrl} alt="" className="h-7 w-7 rounded-lg object-cover shrink-0 border border-stone-100" />
                        ) : (
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-100 to-blue-100 border border-stone-200 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-violet-700">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-stone-800 truncate max-w-[140px]">{displayName}</div>
                          <div className="text-[10px] text-stone-400">/{row.slug}</div>
                          {row.businessWebsite && (
                            <a
                              href={row.businessWebsite.startsWith("http") ? row.businessWebsite : `https://${row.businessWebsite}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                            >
                              <Globe className="h-2.5 w-2.5" />
                              {row.businessWebsite.replace(/^https?:\/\//, "").slice(0, 25)}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Owner Contact */}
                    <td className="px-4 py-3 min-w-[200px]">
                      {row.ownerName && (
                        <div className="font-semibold text-stone-700 mb-0.5">{row.ownerName}</div>
                      )}
                      {email && (
                        <button
                          onClick={() => copyTo(email, `email-${row.id}`)}
                          className="flex items-center gap-1 text-stone-600 hover:text-blue-600 transition-colors group"
                        >
                          <Mail className="h-3 w-3 shrink-0 text-stone-400 group-hover:text-blue-500" />
                          <span className="truncate max-w-[160px]">{email}</span>
                          {copied === `email-${row.id}` ? (
                            <CheckCheck className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 shrink-0" />
                          )}
                        </button>
                      )}
                      {phone && (
                        <button
                          onClick={() => copyTo(phone, `phone-${row.id}`)}
                          className="flex items-center gap-1 text-stone-600 hover:text-emerald-600 transition-colors group mt-0.5"
                        >
                          <Phone className="h-3 w-3 shrink-0 text-stone-400 group-hover:text-emerald-500" />
                          <span>{phone}</span>
                          {copied === `phone-${row.id}` ? (
                            <CheckCheck className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 shrink-0" />
                          )}
                        </button>
                      )}
                      {!email && !phone && (
                        <span className="text-stone-300 italic">No contact info</span>
                      )}
                    </td>

                    {/* WhatsApp */}
                    <td className="px-4 py-3">
                      {row.whatsappNumber ? (
                        <button
                          onClick={() => copyTo(row.whatsappNumber!, `wa-${row.id}`)}
                          className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 group"
                        >
                          <Wifi className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="font-mono text-[11px]">{row.whatsappNumber}</span>
                          {copied === `wa-${row.id}` ? (
                            <CheckCheck className="h-2.5 w-2.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                          )}
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-stone-300 text-[11px]">
                          <WifiOff className="h-3 w-3" /> Not connected
                        </span>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-stone-700">{row.plan ?? "None"}</div>
                      <div className={cn(
                        "text-[10px] font-bold mt-0.5",
                        row.subscriptionStatus === "ACTIVE" ? "text-blue-600" :
                        row.subscriptionStatus === "TRIALING" ? "text-amber-600" :
                        "text-stone-400"
                      )}>
                        {row.subscriptionStatus}
                      </div>
                      {row.trialEndsAt && row.subscriptionStatus === "TRIALING" && (
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          Ends {new Date(row.trialEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </div>
                      )}
                    </td>

                    {/* Activity */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-stone-500">
                          <MessageSquare className="h-3 w-3 shrink-0" />
                          <span>{(row.messages ?? 0).toLocaleString()} msgs</span>
                        </div>
                        <div className="flex items-center gap-1 text-stone-500">
                          <Users className="h-3 w-3 shrink-0" />
                          <span>{(row.customers ?? 0).toLocaleString()} contacts</span>
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Last: {daysSince((row as any).lastMessageAt)}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Joined: {new Date(row.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                        </div>
                      </div>
                    </td>

                    {/* Tags */}
                    <td className="px-4 py-3 max-w-[160px]">
                      <div className="flex flex-wrap gap-1">
                        {tags.map(t => (
                          <span
                            key={t.label}
                            className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold border", t.color)}
                          >
                            {t.label}
                          </span>
                        ))}
                        {tags.length === 0 && <span className="text-stone-300 text-[10px]">—</span>}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a
                          href={`https://app.fizmoh.cloud/${row.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                          title="Open workspace"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        {email && (
                          <a
                            href={`mailto:${email}`}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-stone-400 hover:text-blue-600 transition-colors"
                            title="Send email"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {(row.whatsappNumber || phone) && (
                          <a
                            href={`https://wa.me/${(row.whatsappNumber || phone || "").replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-stone-400 hover:text-emerald-600 transition-colors"
                            title="WhatsApp owner"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
          <span className="text-[11px] text-stone-400">
            Showing {filtered.length} tenants
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-[11px] gap-1.5 h-7 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
            onClick={handleExportCSV}
          >
            <Download className="h-3 w-3" />
            Download full CSV
          </Button>
        </div>
      </div>
    </div>
  )
}
