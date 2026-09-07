"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Loader2, Download, CheckCircle2, Database, RefreshCw,
} from "lucide-react"

/**
 * Dedicated Database & Security Backups Panel for Platform Super Admins.
 * Allows 1-click snapshot export (.json) and real-time database connection metrics.
 */
export function BackupsPanel() {
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const loadStats = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/platform/backup")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      toast.error("Could not load database stats")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const downloadSnapshot = async () => {
    try {
      setDownloading(true)
      const res = await fetch("/api/platform/backup", { method: "POST" })
      if (!res.ok) throw new Error("Failed to export backup")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fizmoh_platform_snapshot_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Database snapshot downloaded successfully")
    } catch {
      toast.error("Failed to download database snapshot")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Database & Security Backups</h2>
              <p className="text-xs text-stone-500">
                1-Click platform snapshot export, automated backups status, and table integrity metrics.
              </p>
            </div>
          </div>
          <Button
            onClick={downloadSnapshot}
            disabled={downloading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            Download Snapshot (.JSON)
          </Button>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400 mx-auto" />
            <p className="text-xs text-stone-500 mt-2">Checking database status...</p>
          </div>
        ) : stats ? (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-[11px] font-semibold text-stone-500">Total Workspaces</div>
                <div className="text-xl font-black text-stone-900 mt-0.5">{stats.metrics?.tenants ?? 0}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-[11px] font-semibold text-stone-500">Active Staff Accounts</div>
                <div className="text-xl font-black text-stone-900 mt-0.5">{stats.metrics?.staff ?? 0}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-[11px] font-semibold text-stone-500">Total Conversations</div>
                <div className="text-xl font-black text-stone-900 mt-0.5">{stats.metrics?.conversations ?? 0}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="text-[11px] font-semibold text-stone-500">Total WhatsApp Messages</div>
                <div className="text-xl font-black text-stone-900 mt-0.5">{stats.metrics?.messages ?? 0}</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Database Connection Healthy</h4>
                  <p className="text-[11px] text-emerald-800">
                    Engine: {stats.database} · Last Checked: {new Date(stats.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={loadStats} className="text-xs rounded-lg border-emerald-300 gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh Status
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
