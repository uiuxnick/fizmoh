"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Activity } from "lucide-react"

interface TenantUsage {
  tenantId: string
  tenantName: string
  messagesUsed: number
  messagesLimit: number
  campaignsUsed: number
  campaignsLimit: number
  aiRepliesUsed: number
  aiRepliesLimit: number
  staffUsed: number
  staffLimit: number
  contactsUsed: number
  contactsLimit: number
  usagePercent: number
}

export function UsageLimitsPanel() {
  const [usages, setUsages] = useState<TenantUsage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/platform/usage")
      .then(res => res.json())
      .then(data => {
        const raw = Array.isArray(data.usages) ? data.usages : Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
        const sorted = [...raw].sort((a: any, b: any) => b.usagePercent - a.usagePercent)
        setUsages(sorted)
      })
      .catch(() => toast.error("Failed to load usage data"))
      .finally(() => setLoading(false))
  }, [])

  const getProgressColor = (percent: number) => {
    if (percent > 90) return "bg-rose-500"
    if (percent > 70) return "bg-amber-500"
    return "bg-emerald-500"
  }

  const UsageBar = ({ used, limit }: { used: number, limit: number }) => {
    const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-semibold text-stone-600">
          <span>{used}</span>
          <span>{limit}</span>
        </div>
        <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${getProgressColor(percent)}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">Usage & Limits</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Monitor real-time resource consumption against plan quotas across all tenant workspaces. Sorted by highest usage.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true)
            fetch("/api/platform/usage").then(r => r.json()).then(data => {
              const raw = Array.isArray(data.usages) ? data.usages : Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
              setUsages([...raw].sort((a: any, b: any) => b.usagePercent - a.usagePercent))
            }).catch(() => toast.error("Failed to load")).finally(() => setLoading(false))
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition self-start sm:self-auto"
        >
          <Activity className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">

        {loading ? (
          <div className="py-14 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs text-stone-500 mt-2 font-medium">Loading usage metrics...</p>
          </div>
        ) : usages.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Activity className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-stone-700">No usage data found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Tenant Name</th>
                  <th className="px-4 py-3 min-w-[120px]">Messages</th>
                  <th className="px-4 py-3 min-w-[120px]">Campaigns</th>
                  <th className="px-4 py-3 min-w-[120px]">AI Replies</th>
                  <th className="px-4 py-3 min-w-[120px]">Staff</th>
                  <th className="px-4 py-3 min-w-[120px]">Contacts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {usages.map(u => (
                  <tr key={u.tenantId} className={`hover:bg-stone-50/70 transition-colors ${u.usagePercent > 90 ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-4 py-4 font-bold text-stone-900">
                      {u.tenantName}
                      {u.usagePercent > 90 && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 uppercase">Warning</span>}
                    </td>
                    <td className="px-4 py-4"><UsageBar used={u.messagesUsed} limit={u.messagesLimit} /></td>
                    <td className="px-4 py-4"><UsageBar used={u.campaignsUsed} limit={u.campaignsLimit} /></td>
                    <td className="px-4 py-4"><UsageBar used={u.aiRepliesUsed} limit={u.aiRepliesLimit} /></td>
                    <td className="px-4 py-4"><UsageBar used={u.staffUsed} limit={u.staffLimit} /></td>
                    <td className="px-4 py-4"><UsageBar used={u.contactsUsed} limit={u.contactsLimit} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
