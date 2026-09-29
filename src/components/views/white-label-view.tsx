"use client"

import { useState, useEffect } from "react"
import {
  Building2, ShieldCheck, Globe, Palette, Users, ArrowUpRight,
  ExternalLink, Copy, Check, Plus, RefreshCw, Sparkles, CheckCircle2,
  Lock, Settings, Smartphone, Mail, DollarSign, Layers, Eye,
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

interface AgencyBranding {
  agencyName: string
  logoUrl: string
  faviconUrl: string
  primaryColor: string
  portalTitle: string
  supportEmail: string
  supportPhone: string
  customDomain: string
  marginPercentage: number
  footerText: string
  hideFizmohBranding: boolean
}

interface SubWorkspace {
  id: string
  name: string
  slug: string
  status: string
  customDomain?: string | null
  role: string
  planName: string
  planSlug: string
  memberCount: number
  createdAt: string
  isCurrent: boolean
}

export default function WhiteLabelView() {
  const { setView } = useApp()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifyingDomain, setVerifyingDomain] = useState(false)
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null)
  const [entitled, setEntitled] = useState(true)
  const [copiedTarget, setCopiedTarget] = useState(false)

  const [branding, setBranding] = useState<AgencyBranding>({
    agencyName: "My Digital Agency",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#4f46e5",
    portalTitle: "Client Growth & AI Portal",
    supportEmail: "support@myagency.com",
    supportPhone: "+96890000000",
    customDomain: "",
    marginPercentage: 40,
    footerText: "Powered by Agency Cloud Engine",
    hideFizmohBranding: true,
  })

  const [subWorkspaces, setSubWorkspaces] = useState<SubWorkspace[]>([])
  const [stats, setStats] = useState({
    totalSubAccounts: 0,
    activeSubAccounts: 0,
    targetCname: "app.fizmoh.cloud",
  })

  // Create Workspace Dialog
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [newClientSlug, setNewClientSlug] = useState("")
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [newAdminName, setNewAdminName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newPlanSlug, setNewPlanSlug] = useState("growth")

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/agency/reseller")
      if (!res.ok) throw new Error("Failed to load agency reseller info")
      const data = await res.json()
      setEntitled(Boolean(data.entitled))
      if (data.branding) setBranding(data.branding)
      if (data.subWorkspaces) setSubWorkspaces(data.subWorkspaces)
      if (data.stats) setStats(data.stats)
    } catch (err: any) {
      toast.error(err.message || "Failed to load reseller portal")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const saveBranding = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/agency/reseller", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save agency branding")
      if (data.branding) setBranding(data.branding)
      toast.success("Agency white-label settings updated successfully!")
    } catch (err: any) {
      toast.error(err.message || "Could not save branding")
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyDomain = async () => {
    if (!branding.customDomain) {
      toast.error("Enter your custom agency portal domain first.")
      return
    }
    setVerifyingDomain(true)
    try {
      const res = await fetch("/api/settings/verify-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: branding.customDomain }),
      })
      const data = await res.json()
      if (data.verified || data.cnameValid) {
        toast.success(`Domain '${branding.customDomain}' points to app.fizmoh.cloud! DNS is verified.`)
      } else {
        toast.warning(data.message || `CNAME not resolved yet for ${branding.customDomain}. DNS propagation takes 5-30 minutes.`)
      }
    } catch (err: any) {
      toast.error(err.message || "Verification request failed")
    } finally {
      setVerifyingDomain(false)
    }
  }

  const handleSwitchWorkspace = async (slug: string) => {
    setSwitchingSlug(slug)
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      })
      if (!res.ok) throw new Error("Could not switch to that workspace")
      toast.success(`Switched to workspace: ${slug}`)
      window.location.href = "/dashboard"
    } catch (err: any) {
      toast.error(err.message || "Failed to switch workspace")
      setSwitchingSlug(null)
    }
  }

  const handleCreateClientWorkspace = async () => {
    if (!newClientName.trim() || !newAdminEmail.trim()) {
      toast.error("Client name and admin email are required.")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/agency/reseller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: newClientName,
          slug: newClientSlug || newClientName,
          adminEmail: newAdminEmail,
          adminName: newAdminName,
          password: newPassword,
          planSlug: newPlanSlug,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create client workspace")
      toast.success(data.message || "Client workspace created!")
      setCreateModalOpen(false)
      setNewClientName("")
      setNewClientSlug("")
      setNewAdminEmail("")
      setNewAdminName("")
      setNewPassword("")
      loadData()
    } catch (err: any) {
      toast.error(err.message || "Could not create workspace")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
                Agency White-Label Reseller Portal
                <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-xs font-semibold">
                  Reseller Portal
                </Badge>
              </h1>
              <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400">
                Custom agency branding, client sub-workspaces, custom domain mapping and retail client billing.
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
            className="border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={() => setCreateModalOpen(true)}
            size="sm"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Client Workspace
          </Button>
        </div>
      </div>

      {/* Plan Status Notice (if not entitled or on trial) */}
      {!entitled && (
        <Card className="border-amber-300 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
          <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-stone-900 dark:text-white text-sm">
                  Agency White-Label Add-on ($49/mo or Enterprise Plan)
                </h3>
                <p className="text-xs text-amber-800/90 dark:text-amber-200/80 mt-0.5">
                  Launch sub-accounts for your clients, remove all platform branding, map your own agency portal domain (e.g. <code>clients.youragency.com</code>), and bill your clients at your own markup.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setView("billing")}
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0"
            >
              Activate Agency Add-on in Billing
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Sub-Workspaces</p>
              <h4 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">{subWorkspaces.length}</h4>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Active Clients</p>
              <h4 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
                {subWorkspaces.filter(w => w.status === "ACTIVE").length}
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Agency Portal Domain</p>
              <h4 className="text-xs font-semibold text-stone-800 dark:text-stone-200 mt-1 truncate">
                {branding.customDomain || "Not mapped"}
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
              <Globe className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Client Price Markup</p>
              <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">+{branding.marginPercentage}%</h4>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="clients" className="w-full space-y-5">
        <TabsList className="bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60 p-1 w-full sm:w-auto grid grid-cols-3 rounded-xl">
          <TabsTrigger value="clients" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400 text-stone-600 dark:text-stone-300 text-xs font-semibold rounded-lg shadow-xs transition-all">
            <Users className="h-3.5 w-3.5" />
            Client Sub-Workspaces ({subWorkspaces.length})
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400 text-stone-600 dark:text-stone-300 text-xs font-semibold rounded-lg shadow-xs transition-all">
            <Palette className="h-3.5 w-3.5" />
            Agency Brand & Identity
          </TabsTrigger>
          <TabsTrigger value="domain" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-stone-900 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400 text-stone-600 dark:text-stone-300 text-xs font-semibold rounded-lg shadow-xs transition-all">
            <Globe className="h-3.5 w-3.5" />
            Dedicated Agency Domain
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Client Sub-Workspaces */}
        <TabsContent value="clients" className="space-y-4">
          <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-stone-900 dark:text-white">
                  <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  Your Client Sub-Workspaces
                </CardTitle>
                <CardDescription className="text-xs text-stone-500 dark:text-stone-400">
                  Direct master access into each of your client accounts. One-click switch into any client dashboard.
                </CardDescription>
              </div>
              <Button
                onClick={() => setCreateModalOpen(true)}
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Client
              </Button>
            </CardHeader>
            <CardContent>
              {subWorkspaces.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl space-y-3 bg-stone-50/50 dark:bg-stone-900/50">
                  <div className="mx-auto w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-white">No Client Sub-Workspaces Yet</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto mt-1">
                      Create an isolated workspace for your client with their own WhatsApp numbers, CRM, and team seats.
                    </p>
                  </div>
                  <Button
                    onClick={() => setCreateModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create First Client Workspace
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {subWorkspaces.map(ws => (
                    <div
                      key={ws.id}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-all",
                        ws.isCurrent
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-stone-50/70 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700"
                      )}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900 dark:text-white">{ws.name}</span>
                          {ws.isCurrent && (
                            <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5">
                              CURRENT ACTIVE
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400">
                            {ws.planName} Plan
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5",
                              ws.status === "ACTIVE"
                                ? "text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10"
                                : "text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10"
                            )}
                          >
                            {ws.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                          <span className="font-mono text-stone-700 dark:text-stone-300">{ws.slug}.fizmoh.cloud</span>
                          {ws.customDomain && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                              <Globe className="h-3 w-3" /> {ws.customDomain}
                            </span>
                          )}
                          <span>• {ws.memberCount} Team Member{ws.memberCount > 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-stone-200 dark:border-stone-800">
                        {ws.isCurrent ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs h-8"
                          >
                            Currently Inside Workspace
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSwitchWorkspace(ws.slug)}
                            disabled={switchingSlug === ws.slug}
                            className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-white font-medium text-xs h-8 border border-stone-200 dark:border-stone-700"
                          >
                            <ExternalLink className="h-3 w-3 mr-1 text-amber-600 dark:text-amber-400" />
                            {switchingSlug === ws.slug ? "Switching..." : "Open Workspace"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Agency Brand & Identity */}
        <TabsContent value="branding" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-stone-900 dark:text-white">
                    <Palette className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    White-Label Portal Identity
                  </CardTitle>
                  <CardDescription className="text-xs text-stone-500 dark:text-stone-400">
                    Replace Fizmoh branding with your agency name, logo, support channels and custom primary colors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Agency Legal / Brand Name</Label>
                      <Input
                        value={branding.agencyName}
                        onChange={e => setBranding(prev => ({ ...prev, agencyName: e.target.value }))}
                        className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Client Portal Page Title</Label>
                      <Input
                        value={branding.portalTitle}
                        onChange={e => setBranding(prev => ({ ...prev, portalTitle: e.target.value }))}
                        className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Agency Logo Image URL</Label>
                    <Input
                      placeholder="https://youragency.com/assets/logo-white.png"
                      value={branding.logoUrl}
                      onChange={e => setBranding(prev => ({ ...prev, logoUrl: e.target.value }))}
                      className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-900 dark:text-stone-100"
                    />
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">Recommended: Transparent PNG or SVG, 240x60px.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Primary Brand Accent Color</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={branding.primaryColor}
                          onChange={e => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="h-9 w-12 rounded-lg cursor-pointer bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-0.5"
                        />
                        <Input
                          value={branding.primaryColor}
                          onChange={e => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 font-mono text-xs text-stone-900 dark:text-stone-100 uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Client Support Email</Label>
                      <Input
                        placeholder="help@youragency.com"
                        value={branding.supportEmail}
                        onChange={e => setBranding(prev => ({ ...prev, supportEmail: e.target.value }))}
                        className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Support WhatsApp Number</Label>
                      <Input
                        placeholder="+96891234567"
                        value={branding.supportPhone}
                        onChange={e => setBranding(prev => ({ ...prev, supportPhone: e.target.value }))}
                        className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Custom Footer Copyright Text</Label>
                      <Input
                        value={branding.footerText}
                        onChange={e => setBranding(prev => ({ ...prev, footerText: e.target.value }))}
                        className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-stone-900 dark:text-stone-100 block">Hide Fizmoh Platform Branding</Label>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">Erases references to Fizmoh in headers, footers and emails.</p>
                    </div>
                    <Switch
                      checked={branding.hideFizmohBranding}
                      onCheckedChange={checked =>
                        setBranding(prev => ({ ...prev, hideFizmohBranding: checked }))
                      }
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={saveBranding}
                      disabled={saving}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs"
                    >
                      {saving ? "Saving..." : "Save Branding Settings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Preview Card */}
            <div>
              <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Client Portal Mockup Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 p-4 space-y-4">
                    {/* Simulated Topbar */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
                      <div className="flex items-center gap-2">
                        {branding.logoUrl ? (
                          <img src={branding.logoUrl} alt="Logo" className="h-6 object-contain" />
                        ) : (
                          <div
                            className="px-2 py-1 rounded text-white text-xs font-bold"
                            style={{ backgroundColor: branding.primaryColor }}
                          >
                            {branding.agencyName.slice(0, 3).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-bold text-stone-900 dark:text-white">{branding.agencyName}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-transparent">
                        ONLINE
                      </Badge>
                    </div>

                    {/* Simulated Body */}
                    <div className="space-y-2">
                      <div className="h-3 w-3/4 rounded bg-stone-200 dark:bg-stone-800" />
                      <div className="h-3 w-1/2 rounded bg-stone-200 dark:bg-stone-900" />
                      <div
                        className="mt-3 p-2.5 rounded-lg text-center text-xs font-semibold text-white shadow-xs"
                        style={{ backgroundColor: branding.primaryColor }}
                      >
                        Client Action Button
                      </div>
                    </div>

                    {/* Simulated Footer */}
                    <div className="pt-2 border-t border-stone-200 dark:border-stone-900 text-[10px] text-stone-500 dark:text-stone-500 text-center">
                      {branding.footerText || `© ${branding.agencyName}`}
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center">
                    Clients see your bespoke branding when logging into your sub-workspaces.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Dedicated Agency Domain */}
        <TabsContent value="domain" className="space-y-4">
          <Card className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-stone-900 dark:text-white">
                <Globe className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Dedicated Reseller Portal Domain (CNAME)
              </CardTitle>
              <CardDescription className="text-xs text-stone-500 dark:text-stone-400">
                Point your own custom domain (e.g. <code>portal.youragency.com</code>) so clients access their marketing suite under your agency's domain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2 max-w-xl">
                <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Custom Agency Portal Domain</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="clients.myagency.com"
                    value={branding.customDomain}
                    onChange={e => setBranding(prev => ({ ...prev, customDomain: e.target.value }))}
                    className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 font-mono text-xs text-amber-700 dark:text-amber-300"
                  />
                  <Button
                    onClick={handleVerifyDomain}
                    disabled={verifyingDomain}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 shadow-xs"
                  >
                    {verifyingDomain ? "Checking DNS..." : "Verify DNS"}
                  </Button>
                </div>
              </div>

              {/* DNS Instructions */}
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-3">
                <h4 className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Required DNS Record in your Domain Registrar (Cloudflare, GoDaddy, Namecheap):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-sans">Type</span>
                    <strong className="text-amber-600 dark:text-amber-400">CNAME</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-sans">Name / Host</span>
                    <strong className="text-stone-800 dark:text-stone-200">{branding.customDomain ? branding.customDomain.split(".")[0] : "clients"}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-sans">Value / Target</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">app.fizmoh.cloud</strong>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("app.fizmoh.cloud")
                        setCopiedTarget(true)
                        setTimeout(() => setCopiedTarget(false), 2000)
                        toast.success("Copied CNAME target!")
                      }}
                      className="text-stone-400 hover:text-stone-900 dark:hover:text-white"
                    >
                      {copiedTarget ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  SSL certificate is provisioned automatically within seconds of DNS propagation.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={saveBranding}
                  disabled={saving}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs"
                >
                  {saving ? "Saving..." : "Save Domain"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Client Workspace Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Create Client Sub-Workspace
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500 dark:text-stone-400">
              Provision a complete isolated workspace for your client with your agency as administrator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Client Business Name</Label>
              <Input
                placeholder="e.g. Royal Palace Hotel & Spa"
                value={newClientName}
                onChange={e => {
                  setNewClientName(e.target.value)
                  if (!newClientSlug) {
                    setNewClientSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))
                  }
                }}
                className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Workspace Subdomain Slug</Label>
              <div className="flex items-center gap-1 font-mono text-xs">
                <Input
                  placeholder="royal-palace"
                  value={newClientSlug}
                  onChange={e => setNewClientSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-xs text-amber-700 dark:text-amber-300"
                />
                <span className="text-stone-500 shrink-0">.fizmoh.cloud</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Client Admin Name</Label>
                <Input
                  placeholder="Manager Name"
                  value={newAdminName}
                  onChange={e => setNewAdminName(e.target.value)}
                  className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Client Admin Email</Label>
                <Input
                  type="email"
                  placeholder="manager@client.com"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Initial Password (Optional)</Label>
              <Input
                type="password"
                placeholder="Leave blank to auto-generate temporary password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Assigned Plan Tier</Label>
              <select
                value={newPlanSlug}
                onChange={e => setNewPlanSlug(e.target.value)}
                className="w-full h-9 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 px-3 text-xs text-stone-900 dark:text-stone-100"
              >
                <option value="growth">Growth Plan (WhatsApp + CRM + Marketing)</option>
                <option value="enterprise">Enterprise (All Modules Included)</option>
                <option value="starter">Starter Plan (Basic Messaging)</option>
                <option value="resturant">Restaurant & Menu Plan</option>
                <option value="tour">Tour & Booking Plan</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              className="text-stone-500 hover:text-stone-700 dark:text-stone-400 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateClientWorkspace}
              disabled={creating}
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs"
            >
              {creating ? "Creating Sub-Workspace..." : "Create Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
