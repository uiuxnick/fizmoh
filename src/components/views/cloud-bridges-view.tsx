"use client"

import { useState, useEffect } from "react"
import {
  Share2, FileSpreadsheet, Webhook, ArrowRightLeft, RefreshCw, CheckCircle2,
  AlertCircle, ExternalLink, Copy, Check, Plus, Trash2, Send, ShieldCheck,
  Sparkles, Layers, Sliders, ArrowUpRight, Database, Play, Lock, Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useApp } from "@/lib/store"
import { cn } from "@/lib/utils"

interface CustomWebhook {
  id: string
  name: string
  url: string
  events: string[]
  secret?: string
  enabled: boolean
  createdAt: string
  lastStatus?: number
  lastTriggeredAt?: string | null
}

interface BridgeConfig {
  sheetSync: {
    enabled: boolean
    sheetId: string
    sheetName: string
    triggers: {
      leads: boolean
      orders: boolean
      bookings: boolean
      messages: boolean
    }
    columnMapping: {
      timestamp: string
      customerName: string
      phone: string
      eventType: string
      details: string
      status: string
    }
    autoSyncIntervalMinutes: number
    lastSyncedAt: string | null
    syncedRowsCount: number
  }
  webhooks: CustomWebhook[]
}

export default function CloudBridgesView() {
  const { setView } = useApp()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null)
  const [verifyingSheet, setVerifyingSheet] = useState(false)
  const [entitled, setEntitled] = useState(true)
  const [inboundUrl, setInboundUrl] = useState("")
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedIngest, setCopiedIngest] = useState(false)
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalOrders: 0,
    totalBookings: 0,
    estimatedSyncableRows: 0,
  })

  const [config, setConfig] = useState<BridgeConfig>({
    sheetSync: {
      enabled: true,
      sheetId: "",
      sheetName: "Fizmoh Leads & Orders",
      triggers: {
        leads: true,
        orders: true,
        bookings: true,
        messages: false,
      },
      columnMapping: {
        timestamp: "Timestamp",
        customerName: "Customer Name",
        phone: "Phone Number",
        eventType: "Event Type",
        details: "Details / Order Summary",
        status: "Status",
      },
      autoSyncIntervalMinutes: 15,
      lastSyncedAt: null,
      syncedRowsCount: 0,
    },
    webhooks: [],
  })

  // Add webhook modal
  const [webhookModalOpen, setWebhookModalOpen] = useState(false)
  const [newWebhookName, setNewWebhookName] = useState("")
  const [newWebhookUrl, setNewWebhookUrl] = useState("")
  const [newWebhookSecret, setNewWebhookSecret] = useState("")
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([
    "lead.captured",
    "order.created",
  ])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/integrations/bridges")
      if (!res.ok) throw new Error("Failed to load bridge settings")
      const data = await res.json()
      setEntitled(Boolean(data.entitled))
      if (data.config) setConfig(data.config)
      if (data.stats) setStats(data.stats)
      if (data.inboundIngestUrl) setInboundUrl(data.inboundIngestUrl)
    } catch (err: any) {
      toast.error(err.message || "Failed to load cloud bridges")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const saveConfig = async (updatedConfig?: BridgeConfig) => {
    setSaving(true)
    try {
      const payload = updatedConfig || config
      const res = await fetch("/api/integrations/bridges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to save changes")
      const data = await res.json()
      if (data.config) setConfig(data.config)
      toast.success("Bridge configuration saved successfully!")
    } catch (err: any) {
      toast.error(err.message || "Could not save configuration")
    } finally {
      setSaving(false)
    }
  }

  const handleManualSync = async () => {
    if (!config.sheetSync.sheetId) {
      toast.error("Please enter a Google Spreadsheet ID or URL before syncing.")
      return
    }
    setSyncing(true)
    try {
      const res = await fetch("/api/integrations/bridges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_now" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sync failed")
      toast.success(data.message || "Synced successfully to Google Sheets!")
      setConfig(prev => ({
        ...prev,
        sheetSync: {
          ...prev.sheetSync,
          lastSyncedAt: data.lastSyncedAt,
          syncedRowsCount: data.syncedRowsCount,
        },
      }))
    } catch (err: any) {
      toast.error(err.message || "Failed to execute manual sync")
    } finally {
      setSyncing(false)
    }
  }

  const handleVerifySheet = async () => {
    if (!config.sheetSync.sheetId) {
      toast.error("Enter a Google Spreadsheet ID or link first.")
      return
    }
    setVerifyingSheet(true)
    try {
      const res = await fetch("/api/integrations/bridges/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "sheet", sheetId: config.sheetSync.sheetId }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "Verification failed")
      toast.success(data.message)
      if (data.cleanId && data.cleanId !== config.sheetSync.sheetId) {
        setConfig(prev => ({
          ...prev,
          sheetSync: { ...prev.sheetSync, sheetId: data.cleanId },
        }))
      }
    } catch (err: any) {
      toast.error(err.message || "Spreadsheet verification failed")
    } finally {
      setVerifyingSheet(false)
    }
  }

  const handleTestWebhook = async (webhook: CustomWebhook) => {
    setTestingWebhookId(webhook.id)
    try {
      const res = await fetch("/api/integrations/bridges/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "webhook", url: webhook.url }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data.error || `Webhook test failed with HTTP ${data.status || 500}`)
      } else {
        toast.success(data.message || `Test ping successful! HTTP ${data.status} in ${data.latencyMs}ms.`)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to test webhook endpoint")
    } finally {
      setTestingWebhookId(null)
    }
  }

  const handleAddWebhook = async () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) {
      toast.error("Please provide both a Webhook Name and Target URL.")
      return
    }
    try {
      const res = await fetch("/api/integrations/bridges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_webhook",
          name: newWebhookName,
          url: newWebhookUrl,
          secret: newWebhookSecret,
          events: newWebhookEvents,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add webhook")
      toast.success("Outbound webhook created successfully!")
      if (data.webhooks) {
        setConfig(prev => ({ ...prev, webhooks: data.webhooks }))
      }
      setWebhookModalOpen(false)
      setNewWebhookName("")
      setNewWebhookUrl("")
      setNewWebhookSecret("")
    } catch (err: any) {
      toast.error(err.message || "Could not create webhook")
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook endpoint?")) return
    try {
      const res = await fetch("/api/integrations/bridges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_webhook", id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete webhook")
      toast.success("Webhook endpoint removed.")
      if (data.webhooks) {
        setConfig(prev => ({ ...prev, webhooks: data.webhooks }))
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete webhook")
    }
  }

  const toggleEvent = (eventKey: string) => {
    setNewWebhookEvents(prev =>
      prev.includes(eventKey) ? prev.filter(e => e !== eventKey) : [...prev, eventKey]
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Cloud & Sheet Bridges
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-xs">
                  Automation Add-on
                </Badge>
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Real-time Google Sheets sync, custom outbound webhooks, and bidirectional database bridges.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={() => saveConfig()}
            disabled={saving}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm"
          >
            {saving ? "Saving Changes..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Plan Status Notice (if not entitled or on trial) */}
      {!entitled && (
        <Card className="border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900/60 text-amber-200">
          <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white text-sm">
                  Preview Mode: Cloud & Sheet Bridges Add-on ($9/mo or Enterprise Plan)
                </h3>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  You can configure and test your Google Sheets connections and Webhooks right now. To enable automatic background sync every 15 minutes, activate the add-on on your workspace.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setView("billing")}
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0"
            >
              Activate Add-on in Billing
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Key Metric Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-[#111927] border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Syncable Leads</p>
              <h4 className="text-xl font-bold text-white mt-1">{stats.totalLeads}</h4>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111927] border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Orders Captured</p>
              <h4 className="text-xl font-bold text-white mt-1">{stats.totalOrders}</h4>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Database className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111927] border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Active Webhooks</p>
              <h4 className="text-xl font-bold text-white mt-1">{config.webhooks.filter(w => w.enabled).length}</h4>
            </div>
            <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Webhook className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111927] border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Last Sheet Sync</p>
              <h4 className="text-xs font-semibold text-slate-200 mt-1 truncate">
                {config.sheetSync.lastSyncedAt
                  ? new Date(config.sheetSync.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Never"}
              </h4>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="sheets" className="w-full space-y-5">
        <TabsList className="bg-[#111927] border border-slate-800 p-1 w-full sm:w-auto grid grid-cols-3">
          <TabsTrigger value="sheets" className="flex items-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Google Sheets Sync
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <Webhook className="h-3.5 w-3.5" />
            Outbound Webhooks ({config.webhooks.length})
          </TabsTrigger>
          <TabsTrigger value="inbound" className="flex items-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            CRM & Zapier Bridge
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Google Sheets Sync */}
        <TabsContent value="sheets" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <Card className="bg-[#111927] border-slate-800 text-slate-100">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                        Google Sheets Connection
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400">
                        Automatically stream newly captured WhatsApp leads, store checkouts, and customer inquiries straight into your Google Sheet.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sync-toggle" className="text-xs font-semibold cursor-pointer text-slate-300">
                        {config.sheetSync.enabled ? "Sync Enabled" : "Sync Disabled"}
                      </Label>
                      <Switch
                        id="sync-toggle"
                        checked={config.sheetSync.enabled}
                        onCheckedChange={checked =>
                          setConfig(prev => ({
                            ...prev,
                            sheetSync: { ...prev.sheetSync, enabled: checked },
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-300">
                      Google Spreadsheet ID or Full URL
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                        value={config.sheetSync.sheetId}
                        onChange={e =>
                          setConfig(prev => ({
                            ...prev,
                            sheetSync: { ...prev.sheetSync, sheetId: e.target.value },
                          }))
                        }
                        className="bg-slate-900/80 border-slate-700 text-xs font-mono text-slate-200"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleVerifySheet}
                        disabled={verifyingSheet}
                        className="bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 font-medium shrink-0 border border-slate-700"
                      >
                        {verifyingSheet ? "Testing..." : "Verify ID"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Paste either the full URL or just the ID between <code className="text-emerald-400">/d/</code> and <code className="text-emerald-400">/edit</code>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Target Sheet / Tab Name</Label>
                      <Input
                        placeholder="Fizmoh Leads & Orders"
                        value={config.sheetSync.sheetName}
                        onChange={e =>
                          setConfig(prev => ({
                            ...prev,
                            sheetSync: { ...prev.sheetSync, sheetName: e.target.value },
                          }))
                        }
                        className="bg-slate-900/80 border-slate-700 text-xs text-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Auto-Sync Frequency</Label>
                      <select
                        value={config.sheetSync.autoSyncIntervalMinutes}
                        onChange={e =>
                          setConfig(prev => ({
                            ...prev,
                            sheetSync: { ...prev.sheetSync, autoSyncIntervalMinutes: Number(e.target.value) },
                          }))
                        }
                        className="w-full h-9 rounded-md bg-slate-900/80 border border-slate-700 px-3 text-xs text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value={5}>Every 5 minutes (Real-time)</option>
                        <option value={15}>Every 15 minutes (Standard)</option>
                        <option value={30}>Every 30 minutes</option>
                        <option value={60}>Every 1 hour</option>
                      </select>
                    </div>
                  </div>

                  {/* Trigger Events */}
                  <div className="pt-2 border-t border-slate-800 space-y-3">
                    <Label className="text-xs font-semibold text-slate-200 block">
                      Select Event Triggers to Sync:
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.sheetSync.triggers.leads}
                          onChange={e =>
                            setConfig(prev => ({
                              ...prev,
                              sheetSync: {
                                ...prev.sheetSync,
                                triggers: { ...prev.sheetSync.triggers, leads: e.target.checked },
                              },
                            }))
                          }
                          className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-200 block">New Customer Leads</span>
                          <span className="text-[11px] text-slate-400">Captured in WhatsApp, Webchat or forms</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.sheetSync.triggers.orders}
                          onChange={e =>
                            setConfig(prev => ({
                              ...prev,
                              sheetSync: {
                                ...prev.sheetSync,
                                triggers: { ...prev.sheetSync.triggers, orders: e.target.checked },
                              },
                            }))
                          }
                          className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-200 block">Orders & Checkouts</span>
                          <span className="text-[11px] text-slate-400">Catalog purchases and AmwalPay payments</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.sheetSync.triggers.bookings}
                          onChange={e =>
                            setConfig(prev => ({
                              ...prev,
                              sheetSync: {
                                ...prev.sheetSync,
                                triggers: { ...prev.sheetSync.triggers, bookings: e.target.checked },
                              },
                            }))
                          }
                          className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-200 block">Bookings & Appointments</span>
                          <span className="text-[11px] text-slate-400">Confirmed tour and service slots</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.sheetSync.triggers.messages}
                          onChange={e =>
                            setConfig(prev => ({
                              ...prev,
                              sheetSync: {
                                ...prev.sheetSync,
                                triggers: { ...prev.sheetSync.triggers, messages: e.target.checked },
                              },
                            }))
                          }
                          className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-200 block">Conversation Inbound Log</span>
                          <span className="text-[11px] text-slate-400">Sync all incoming message texts</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Manual Sync Trigger Button */}
                  <div className="pt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      {config.sheetSync.syncedRowsCount > 0 ? (
                        <span>Last sync recorded: <strong className="text-emerald-400">{config.sheetSync.syncedRowsCount} rows</strong></span>
                      ) : (
                        <span>Ready to perform first sync</span>
                      )}
                    </div>
                    <Button
                      onClick={handleManualSync}
                      disabled={syncing}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")} />
                      {syncing ? "Synchronizing Records..." : "Sync to Google Sheets Now"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Column Mapping Card */}
              <Card className="bg-[#111927] border-slate-800 text-slate-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-emerald-400" />
                    Sheet Column Headers Mapping
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Define the header names row (Row 1) in your Google Sheet where each field should be written.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-400">Timestamp Column</Label>
                      <Input
                        value={config.sheetSync.columnMapping.timestamp}
                        onChange={e =>
                          setConfig(prev => ({
                            ...prev,
                            sheetSync: {
                              ...prev.sheetSync,
                              columnMapping: { ...prev.sheetSync.columnMapping, timestamp: e.target.value },
                            },
                          }))
                        }
                        className="bg-slate-900 border-slate-800 text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-400">Customer Name</Label>
                      <Input
                        value={config.sheetSync.columnMapping.customerName}
                        onChange={e =>
                          setConfig(prev => ({
                            ...prev,
                            sheetSync: {
                              ...prev.sheetSync,
                              columnMapping: { ...prev.sheetSync.columnMapping, customerName: e.target.value },
                            },
                          }))
                        }
                        className="bg-slate-900 border-slate-800 text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-400">Phone Number</Label>
                      <Input
                        value={config.sheetSync.columnMapping.phone}
                        onChange={e =>
                          setConfig(prev => ({
                            ...prev,
                            sheetSync: {
                              ...prev.sheetSync,
                              columnMapping: { ...prev.sheetSync.columnMapping, phone: e.target.value },
                            },
                          }))
                        }
                        className="bg-slate-900 border-slate-800 text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-400">Event Type</Label>
                      <Input
                        value={config.sheetSync.columnMapping.eventType}
                        onChange={e =>
                          setConfig(prev => ({
                            ...prev,
                            sheetSync: {
                              ...prev.sheetSync,
                              columnMapping: { ...prev.sheetSync.columnMapping, eventType: e.target.value },
                            },
                          }))
                        }
                        className="bg-slate-900 border-slate-800 text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-400">Details / Summary</Label>
                      <Input
                        value={config.sheetSync.columnMapping.details}
                        onChange={e =>
                          setConfig(prev => ({
                            ...prev,
                            sheetSync: {
                              ...prev.sheetSync,
                              columnMapping: { ...prev.sheetSync.columnMapping, details: e.target.value },
                            },
                          }))
                        }
                        className="bg-slate-900 border-slate-800 text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-400">Status Column</Label>
                      <Input
                        value={config.sheetSync.columnMapping.status}
                        onChange={e =>
                          setConfig(prev => ({
                            ...prev,
                            sheetSync: {
                              ...prev.sheetSync,
                              columnMapping: { ...prev.sheetSync.columnMapping, status: e.target.value },
                            },
                          }))
                        }
                        className="bg-slate-900 border-slate-800 text-xs h-8"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Setup Guide Sidebar */}
            <div className="space-y-4">
              <Card className="bg-[#111927] border-slate-800 text-slate-200">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                    <Info className="h-4 w-4 text-emerald-400" />
                    How to Share your Google Sheet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs leading-relaxed text-slate-300">
                  <div className="flex gap-2.5 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                      1
                    </span>
                    <p>Open your Google Spreadsheet or create a blank one at sheets.google.com.</p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                      2
                    </span>
                    <div>
                      <p>Click <strong>Share</strong> (top right) and grant Editor permissions to the Fizmoh Bridge Service Email:</p>
                      <div className="mt-1.5 p-2 rounded bg-slate-900 font-mono text-[11px] text-emerald-300 flex items-center justify-between border border-slate-800">
                        <span className="truncate">cloud-bridge@fizmoh-sync.iam.gserviceaccount.com</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText("cloud-bridge@fizmoh-sync.iam.gserviceaccount.com")
                            setCopiedUrl(true)
                            setTimeout(() => setCopiedUrl(false), 2000)
                            toast.success("Service account email copied!")
                          }}
                          className="text-slate-400 hover:text-white ml-1 shrink-0"
                        >
                          {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                      3
                    </span>
                    <p>Copy your spreadsheet URL into the box on the left and click <strong>Verify ID</strong>.</p>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                      4
                    </span>
                    <p>Save and hit <strong>Sync to Google Sheets Now</strong>. Your leads will immediately populate.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111927] border-slate-800 text-slate-300">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Bi-directional Sync Guarantee
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2 text-slate-400">
                  <p>
                    Data is queued and written via idempotency tokens so sheet edits or slow networks never duplicate leads or drop customer orders.
                  </p>
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px]">
                    ✓ Automatic retry on Google API rate-limits (HTTP 429).
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Outbound Webhooks */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card className="bg-[#111927] border-slate-800 text-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-emerald-400" />
                  Custom Outbound Webhook Subscriptions
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Dispatch instant real-time HTTP POST notifications to your own server, ERP, or analytics when events happen.
                </CardDescription>
              </div>
              <Button
                onClick={() => setWebhookModalOpen(true)}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Endpoint
              </Button>
            </CardHeader>
            <CardContent>
              {config.webhooks.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl space-y-3">
                  <div className="mx-auto w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <Webhook className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">No Outbound Webhooks Configured</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Add a destination webhook URL to receive instant JSON alerts for new leads, cart orders, and WhatsApp messages.
                    </p>
                  </div>
                  <Button
                    onClick={() => setWebhookModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-200 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create First Webhook
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {config.webhooks.map(whk => (
                    <div
                      key={whk.id}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white">{whk.name}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0.2",
                              whk.enabled ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-slate-400 border-slate-700"
                            )}
                          >
                            {whk.enabled ? "ACTIVE" : "PAUSED"}
                          </Badge>
                          {whk.lastStatus && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0.2 font-mono",
                                whk.lastStatus >= 200 && whk.lastStatus < 300
                                  ? "text-emerald-400 border-emerald-500/30"
                                  : "text-rose-400 border-rose-500/30"
                              )}
                            >
                              HTTP {whk.lastStatus}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate-400 truncate">{whk.url}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {whk.events.map(ev => (
                            <span key={ev} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {ev}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestWebhook(whk)}
                          disabled={testingWebhookId === whk.id}
                          className="border-slate-700 hover:bg-slate-800 text-slate-300 text-xs h-8"
                        >
                          <Send className={cn("h-3 w-3 mr-1 text-emerald-400", testingWebhookId === whk.id && "animate-pulse")} />
                          {testingWebhookId === whk.id ? "Sending Ping..." : "Send Test Ping"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWebhook(whk.id)}
                          className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: CRM & Zapier Inbound Bridge */}
        <TabsContent value="inbound" className="space-y-4">
          <Card className="bg-[#111927] border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-emerald-400" />
                Inbound Ingestion Bridge (Zapier, Make, HubSpot, Zoho)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Push external contacts and leads from your website forms, external CRM, or ad channels directly into your Fizmoh workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Your Secure Ingestion Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inboundUrl}
                    className="bg-slate-900 border-slate-700 font-mono text-xs text-emerald-300"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(inboundUrl)
                      setCopiedIngest(true)
                      setTimeout(() => setCopiedIngest(false), 2000)
                      toast.success("Webhook URL copied!")
                    }}
                    className="border-slate-700 hover:bg-slate-800 text-slate-300 text-xs shrink-0"
                  >
                    {copiedIngest ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    {copiedIngest ? "Copied" : "Copy URL"}
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Send an HTTP POST with JSON body containing customer name, phone, and optional message or tags.
                </p>
              </div>

              {/* Sample Payload */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold text-slate-300">Sample Inbound JSON Body (POST):</Label>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
{`{
  "name": "Fatima Al Riyami",
  "phone": "+96892345678",
  "email": "fatima@example.com",
  "source": "Zapier / Facebook Ad Lead",
  "tags": ["vip", "interested-in-tours"],
  "notes": "Booked consultation on landing page"
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Webhook Dialog */}
      <Dialog open={webhookModalOpen} onOpenChange={setWebhookModalOpen}>
        <DialogContent className="bg-[#111927] border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Webhook className="h-4 w-4 text-emerald-400" />
              Add Outbound Webhook Endpoint
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Receive instant JSON HTTP POST updates when business events occur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Endpoint Friendly Name</Label>
              <Input
                placeholder="e.g. My Zapier Lead Catch or Internal ERP"
                value={newWebhookName}
                onChange={e => setNewWebhookName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-xs text-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Target Webhook URL</Label>
              <Input
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={newWebhookUrl}
                onChange={e => setNewWebhookUrl(e.target.value)}
                className="bg-slate-900 border-slate-700 font-mono text-xs text-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Webhook Secret (Optional)</Label>
              <Input
                placeholder="whsec_..."
                value={newWebhookSecret}
                onChange={e => setNewWebhookSecret(e.target.value)}
                className="bg-slate-900 border-slate-700 font-mono text-xs text-slate-200"
              />
              <p className="text-[11px] text-slate-400">Used to sign payloads with HMAC-SHA256 signature.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300">Subscribe to Events:</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { key: "lead.captured", label: "New Lead Captured" },
                  { key: "order.created", label: "Order Created" },
                  { key: "booking.created", label: "Booking Scheduled" },
                  { key: "message.received", label: "WhatsApp Message" },
                ].map(ev => (
                  <label
                    key={ev.key}
                    onClick={() => toggleEvent(ev.key)}
                    className={cn(
                      "p-2 rounded-lg border text-left cursor-pointer transition-all",
                      newWebhookEvents.includes(ev.key)
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    )}
                  >
                    {ev.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWebhookModalOpen(false)}
              className="text-slate-400 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddWebhook}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
            >
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
