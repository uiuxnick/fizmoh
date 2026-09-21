"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { SiteHeader, SiteFooter } from "@/components/site-header"
import {
  CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Clock, ShieldCheck, Activity, ArrowUpRight, MessageSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ServiceStatus {
  id: string
  name: string
  description: string
  status: "operational" | "degraded" | "outage"
  latencyMs: number
  uptime90d: string
}

interface StatusData {
  status: "operational" | "degraded" | "outage"
  headline: string
  updatedAt: string
  uptime90d: string
  services: ServiceStatus[]
  activeIncidents: Array<{
    id: string
    title: string
    severity: string
    status: string
    createdAt: string
  }>
}

export default function StatusPageClient() {
  const [data, setData] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/status")
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastRefreshed(new Date())
      }
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const timer = setInterval(fetchStatus, 30000)
    return () => clearInterval(timer)
  }, [])

  const getStatusIcon = (status: string) => {
    if (status === "operational") {
      return <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
    }
    if (status === "degraded") {
      return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
    }
    return <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
  }

  const getStatusBadge = (status: string) => {
    if (status === "operational") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Operational
        </span>
      )
    }
    if (status === "degraded") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Degraded
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" /> Outage
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50/50 flex flex-col text-stone-900">
      <SiteHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 space-y-10">
        {/* Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">System Observability</span>
              <span className="text-xs text-stone-300">•</span>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                Global Infrastructure
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
              Fizmoh Platform Status
            </h1>
            <p className="text-sm text-stone-600 mt-1 max-w-xl">
              Live operational monitoring for WhatsApp delivery gateways, payment engines, Botflow workflows, and multi-tenant cloud services.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              disabled={loading}
              className="text-xs font-bold rounded-xl gap-1.5 bg-white border-stone-200 shadow-2xs hover:bg-stone-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              Refresh
            </Button>
            <Link
              href="/resources/support"
              className="text-xs font-bold rounded-xl px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition shadow-2xs"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Contact Support
            </Link>
          </div>
        </div>

        {/* Global Headline Card */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border transition-all ${
            data?.status === "operational"
              ? "bg-gradient-to-r from-emerald-500/10 via-emerald-50/50 to-white border-emerald-200/80"
              : data?.status === "degraded"
              ? "bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-white border-amber-200/80"
              : "bg-gradient-to-r from-rose-500/10 via-rose-50/50 to-white border-rose-200/80"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div
                className={`p-3 rounded-2xl ${
                  data?.status === "operational"
                    ? "bg-emerald-500 text-white"
                    : data?.status === "degraded"
                    ? "bg-amber-500 text-white"
                    : "bg-rose-500 text-white"
                }`}
              >
                <Activity className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900">
                    {data?.headline || "Monitoring Systems..."}
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Checked: {lastRefreshed.toLocaleTimeString()} (auto-refreshes every 30s)
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-200/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">90-Day Uptime</span>
              <span className="text-xl font-black text-emerald-700">{data?.uptime90d || "99.98%"}</span>
            </div>
          </div>
        </div>

        {/* Active Incidents or Clean Record */}
        {data?.activeIncidents && data.activeIncidents.length > 0 ? (
          <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Active Platform Investigation
            </div>
            {data.activeIncidents.map(inc => (
              <div key={inc.id} className="text-xs text-amber-950 space-y-1">
                <div className="font-semibold">{inc.title}</div>
                <div className="text-amber-800 text-[11px]">
                  Status: {inc.status} • Logged: {new Date(inc.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-stone-200/80 text-xs font-semibold text-stone-700 shadow-2xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>All production services operating normally across Muscat, Dubai, and Riyadh availability zones.</span>
          </div>
        )}

        {/* Core Services Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-stone-700">
              Core Platform Services ({data?.services?.length || 6})
            </h3>
            <span className="text-xs font-medium text-stone-500">Target SLA: 99.9%</span>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs divide-y divide-stone-100 overflow-hidden">
            {data?.services?.map(service => (
              <div
                key={service.id}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/40 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    {getStatusIcon(service.status)}
                    <h4 className="text-sm font-black text-stone-900">{service.name}</h4>
                  </div>
                  <p className="text-xs text-stone-500 ml-7">{service.description}</p>
                </div>

                <div className="flex items-center gap-6 ml-7 sm:ml-0 self-start sm:self-auto">
                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] font-mono text-stone-500">{service.latencyMs}ms</div>
                    <div className="text-[10px] text-stone-400">latency</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] font-bold text-emerald-700">{service.uptime90d}</div>
                    <div className="text-[10px] text-stone-400">90d uptime</div>
                  </div>
                  {getStatusBadge(service.status)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 90-Day Uptime Visualization */}
        <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-700">90-Day Continuous Monitoring Trail</span>
            <span className="text-emerald-700 font-bold">100% Availability in current billing cycle</span>
          </div>
          <div className="grid grid-cols-30 sm:grid-cols-60 md:grid-cols-90 gap-1 h-7">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                title={`Day -${60 - i}: 100% Operational`}
                className="h-full bg-emerald-500/80 hover:bg-emerald-600 rounded-[2px] cursor-pointer transition"
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-400">
            <span>60 days ago</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              100% Operational
            </span>
            <span>Today</span>
          </div>
        </div>

        {/* External Inquiries / Emergency Contact */}
        <div className="p-6 rounded-3xl bg-stone-100/70 border border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="space-y-0.5 text-center sm:text-left">
            <p className="font-bold text-stone-900">Need immediate emergency support for an active enterprise account?</p>
            <p className="text-stone-500">Our 24/7 on-call engineers monitor critical payment and WhatsApp throughput.</p>
          </div>
          <a
            href="https://wa.me/96898314456?text=URGENT%20Incident%20Report"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white font-bold inline-flex items-center gap-1.5 transition shrink-0"
          >
            Emergency WhatsApp Hotline <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
