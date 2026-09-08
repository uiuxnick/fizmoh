"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ConfigPanel } from "@/components/views/config-panel"
import { GoogleConnectCard } from "@/components/views/google-connect-card"
import { WhatsAppCatalogCard } from "@/components/views/whatsapp-catalog-card"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  Settings, Banknote, Mail, Bell, Globe, Save,
  Shield, Building2, Clock, Percent, Phone, Languages,
  CheckCircle2, AlertTriangle, Lock, Copy, RefreshCw, ExternalLink,
  Sparkles, Zap, XCircle, KeyRound, Loader2, Plus, Trash2,
  Plug, Upload, Palette, Video, Download, FileText, Code2, Facebook, Send,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import SocialChannelsSettings from "@/components/views/social-channels-view"

interface BankAccount {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  iban: string | null
  branch: string | null
  swiftCode: string | null
  currency?: string | null
  isDefault: boolean
  isActive: boolean
}
interface Settings {
  [key: string]: any
}

type ConfigField = {
  set: boolean
  source: "env" | "db" | "unset"
  envManaged: boolean
  value?: string
  masked?: string
}

interface WhatsAppConfigState {
  fields: Record<string, ConfigField>
  live: boolean
  inboundReady: boolean
  webhookUrl: string
}

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings>({})
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [addingBank, setAddingBank] = useState(false)
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
  const [bankSaving, setBankSaving] = useState(false)
  const [bankForm, setBankForm] = useState({
    type: "BANK" as "BANK" | "PHONE",
    bankName: "",
    accountName: "",
    accountNumber: "",
    iban: "",
    branch: "",
    swiftCode: "",
    currency: "OMR",
    isDefault: false,
    isActive: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [waConfig, setWaConfig] = useState<WhatsAppConfigState | null>(null)
  const [waDraft, setWaDraft] = useState<Record<string, string>>({})
  const [waSaving, setWaSaving] = useState(false)
  const [aiConfig, setAiConfig] = useState<any>(null)
  const [aiDraft, setAiDraft] = useState<Record<string, string>>({})
  const [aiSaving, setAiSaving] = useState(false)
  const [aiTest, setAiTest] = useState<any>(null)
  const [aiTesting, setAiTesting] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  // The Meta OAuth callback lands back here with ?section=social so the
  // Facebook & Instagram tab is what actually opens, not whatever the default
  // tab is — otherwise a connect result nobody's looking at is as good as none.
  const [activeTab, setActiveTab] = useState<string | null>(null)
  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section")
    if (section) setActiveTab(section)
  }, [])

  useEffect(() => {
    fetch("/api/features").then(r => r.json()).then(d => setIsPlatformAdmin(!!d.platform)).catch(() => {})
  }, [])

  const openAddBankModal = () => {
    setBankForm({
      type: "BANK",
      bankName: "",
      accountName: "",
      accountNumber: "",
      iban: "",
      branch: "",
      swiftCode: "",
      currency: "OMR",
      isDefault: banks.length === 0,
      isActive: true,
    })
    setEditingBank(null)
    setAddingBank(true)
  }

  const openEditBankModal = (b: BankAccount) => {
    setBankForm({
      type: (b as { type?: string }).type === "PHONE" ? "PHONE" : "BANK",
      bankName: b.bankName,
      accountName: b.accountName,
      accountNumber: b.accountNumber,
      iban: b.iban || "",
      branch: b.branch || "",
      swiftCode: b.swiftCode || "",
      currency: b.currency || "OMR",
      isDefault: b.isDefault,
      isActive: b.isActive,
    })
    setEditingBank(b)
    setAddingBank(false)
  }

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault()
    const needsBank = bankForm.type !== "PHONE"
    if ((needsBank && !bankForm.bankName.trim()) || !bankForm.accountName.trim() || !bankForm.accountNumber.trim()) {
      toast.error("Please fill in Bank Name, Account Name and Account Number")
      return
    }
    setBankSaving(true)
    try {
      if (editingBank) {
        const res = await fetch(`/api/bank-accounts/${editingBank.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bankForm),
        })
        if (res.ok) {
          toast.success("Bank account updated successfully")
          setEditingBank(null)
          load()
        } else {
          const data = await res.json()
          toast.error(data.error || "Failed to update bank account")
        }
      } else {
        const res = await fetch("/api/bank-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bankForm),
        })
        if (res.ok) {
          toast.success("Bank account added successfully")
          setAddingBank(false)
          load()
        } else {
          const data = await res.json()
          toast.error(data.error || "Failed to add bank account")
        }
      }
    } catch {
      toast.error("Error saving bank account")
    } finally {
      setBankSaving(false)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, bRes] = await Promise.all([fetch("/api/settings"), fetch("/api/bank-accounts")])
      const sData = await sRes.json()
      const bData = await bRes.json()
      setSettings(sData.settings || {})
      setBanks(bData.accounts || [])
    } catch { toast.error("Failed to load settings") }
    finally { setLoading(false) }
  }

  const loadWaConfig = async () => {
    try {
      const res = await fetch("/api/whatsapp/config", { cache: "no-store" })
      if (res.ok) setWaConfig(await res.json())
    } catch { /* status card degrades to "unknown" */ }
  }

  const loadAiConfig = async () => {
    try {
      const res = await fetch("/api/ai/config", { cache: "no-store" })
      if (res.ok) setAiConfig(await res.json())
    } catch { /* card degrades to "unknown" */ }
  }

  useEffect(() => { load(); loadWaConfig(); loadAiConfig() }, [])

  const saveAiConfig = async (extra: Record<string, string> = {}) => {
    const payload = { ...aiDraft, ...extra }
    if (Object.keys(payload).length === 0) { toast.info("Nothing to save"); return }
    setAiSaving(true)
    try {
      const res = await fetch("/api/ai/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Save failed")
      if (data.rejected?.length) {
        toast.warning(`Set in the server environment, so not changed here: ${data.rejected.join(", ")}`)
      }
      if (data.saved?.length) toast.success("AI settings saved")
      setAiDraft({})
      setAiTest(null)
      await loadAiConfig()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally { setAiSaving(false) }
  }

  const runAiTest = async () => {
    setAiTesting(true)
    setAiTest(null)
    try {
      const res = await fetch("/api/ai/test", { method: "POST" })
      setAiTest(await res.json())
    } catch (e) {
      setAiTest({ ok: false, error: e instanceof Error ? e.message : "Request failed" })
    } finally { setAiTesting(false) }
  }

  const saveWaConfig = async () => {
    // Only send fields the operator actually typed into — an empty string is
    // a deliberate "clear this", so it must not be sent for untouched inputs.
    const payload = Object.fromEntries(Object.entries(waDraft).filter(([, v]) => v !== undefined))
    if (Object.keys(payload).length === 0) {
      toast.info("Nothing to save")
      return
    }
    setWaSaving(true)
    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Save failed")
      if (data.rejected?.length) {
        toast.warning(`Set in the server environment, so not changed here: ${data.rejected.join(", ")}`)
      }
      if (data.saved?.length) toast.success("WhatsApp credentials saved")
      setWaDraft({})
      await loadWaConfig()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setWaSaving(false)
    }
  }

  const saveSettings = async (updates: Record<string, any>) => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to save settings")
      setSettings(prev => ({ ...prev, ...updates }))
      toast.success("Settings saved")
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to save") }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-6"><Skeleton className="h-96 rounded-xl" /></div>

  return (
    <div className="p-4 md:p-6 w-full max-w-none space-y-5">
      <div>
        <div className="flex items-center gap-2">
          {isPlatformAdmin && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              Super Admin Config
            </span>
          )}
        </div>
        <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2 mt-1">
          <div className="h-9 w-9 rounded-lg bg-stone-100 flex items-center justify-center">
            <Settings className="h-5 w-5 text-stone-600" />
          </div>
          {isPlatformAdmin ? "Global Platform Settings" : "Workspace Settings"}
        </h2>
        <p className="text-sm text-stone-500 mt-0.5">
          {isPlatformAdmin
            ? "Platform-wide gateways, Meta OAuth credentials, global SMTP, web push keys, and integrations."
            : "Configure your business profile, WhatsApp numbers, payment gateways, and notifications."}
        </p>
      </div>

      <Tabs
        value={activeTab ?? (isPlatformAdmin ? "integrations" : "business")}
        onValueChange={setActiveTab}
      >
        <TabsList className="bg-white flex-wrap h-auto">
          {isPlatformAdmin ? (
            <>
              <TabsTrigger value="integrations" className="gap-1.5"><Plug className="h-3.5 w-3.5" />Platform Server Config</TabsTrigger>
              <TabsTrigger value="seo" className="gap-1.5"><Code2 className="h-3.5 w-3.5" />Analytics & SEO</TabsTrigger>
              <TabsTrigger value="apikeys" className="gap-1.5"><KeyRound className="h-3.5 w-3.5" />API Keys & Docs</TabsTrigger>
              <TabsTrigger value="compliance" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Compliance & Security</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="business" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Business</TabsTrigger>
              <TabsTrigger value="google" className="gap-1.5"><Video className="h-3.5 w-3.5" />Google Calendar & Meet</TabsTrigger>
              <TabsTrigger value="website" className="gap-1.5"><Globe className="h-3.5 w-3.5" />Website & Domain</TabsTrigger>
              <TabsTrigger value="seo" className="gap-1.5"><Code2 className="h-3.5 w-3.5" />SEO & Integrations</TabsTrigger>
              <TabsTrigger value="payment" className="gap-1.5"><Banknote className="h-3.5 w-3.5" />Payment</TabsTrigger>
              <TabsTrigger value="apikeys" className="gap-1.5"><KeyRound className="h-3.5 w-3.5" />API Keys & Docs</TabsTrigger>
              <TabsTrigger value="whatsapp" className="gap-1.5"><WhatsAppIcon className="h-3.5 w-3.5" />WhatsApp</TabsTrigger>
              <TabsTrigger value="social" className="gap-1.5"><Facebook className="h-3.5 w-3.5" />Facebook &amp; Instagram</TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />AI</TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Email</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" />Notifications</TabsTrigger>
              <TabsTrigger value="compliance" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Compliance</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="google" className="mt-4 space-y-4">
          <GoogleConnectCard />
        </TabsContent>

        <TabsContent value="website" className="mt-4 space-y-4">
          <WebsiteAndDomainSection settings={settings} saveSettings={saveSettings} />
        </TabsContent>

        <TabsContent value="seo" className="mt-4 space-y-4">
          <SeoIntegrationsSection settings={settings} saveSettings={saveSettings} />
        </TabsContent>

        <TabsContent value="apikeys" className="mt-4 space-y-4">
          <ApiKeysSection />
        </TabsContent>

        {isPlatformAdmin && (
          <TabsContent value="integrations" className="mt-4 space-y-4">
            <ConfigPanel />
          </TabsContent>
        )}

        <TabsContent value="business" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Business Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/*
                * Three of these four fields used to be decorative: a hardcoded
                * placeholder with no save handler, so an operator could type a
                * new support email, tab away, and watch nothing happen — and
                * find out weeks later that customers were still being given
                * the old one. Every field here now writes what it shows.
                */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Business name</Label>
                  <Input
                    defaultValue={settings.business_name || ""}
                    placeholder="Your business"
                    className="mt-1 bg-white"
                    onBlur={e => saveSettings({ business_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Support phone</Label>
                  <Input
                    defaultValue={settings.business_phone || ""}
                    placeholder="+968 …"
                    className="mt-1 bg-white"
                    onBlur={e => saveSettings({ business_phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Support email</Label>
                  <Input
                    defaultValue={settings.business_email || ""}
                    placeholder="support@yourbusiness.com"
                    className="mt-1 bg-white"
                    onBlur={e => saveSettings({ business_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Website</Label>
                  <Input
                    defaultValue={settings.business_website || ""}
                    placeholder="https://…"
                    className="mt-1 bg-white"
                    onBlur={e => saveSettings({ business_website: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Address</Label>
                  <Input
                    defaultValue={settings.business_address || ""}
                    placeholder="Where you are"
                    className="mt-1 bg-white"
                    onBlur={e => saveSettings({ business_address: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Logo URL</Label>
                  <Input
                    defaultValue={settings.business_logo || ""}
                    placeholder="https://… (square image)"
                    className="mt-1 bg-white"
                    onBlur={e => saveSettings({ business_logo: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">About your business</Label>
                <textarea
                  defaultValue={settings.business_about || ""}
                  placeholder="What you sell, where you operate, opening hours, policies…"
                  rows={5}
                  className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
                  onBlur={e => saveSettings({ business_about: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Written for the assistant as much as for people. Everything here is context it
                  can use when answering a customer, so vagueness here becomes vagueness in the
                  replies.
                </p>
              </div>

              <div>
                <Label className="text-xs">How replies should sound</Label>
                <Input
                  defaultValue={settings.business_tone || ""}
                  placeholder="e.g. warm and brief; formal; Arabic and English"
                  className="mt-1 bg-white"
                  onBlur={e => saveSettings({ business_tone: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Languages className="h-4 w-4" />Localization</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Base Currency</Label>
                  <Select defaultValue="OMR">
                    <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OMR">OMR — Omani Rial</SelectItem>
                      <SelectItem value="USD">USD — US Dollar</SelectItem>
                      <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                      <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Primary Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic (RTL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">VAT Rate (%)</Label>
                  <Input type="number" step="0.01" defaultValue="5" className="mt-1 bg-white" onBlur={e => saveSettings({ vat_rate: parseFloat(e.target.value) / 100 })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Working Hours</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Opening Time</Label>
                  <Input type="time" defaultValue="08:00" className="mt-1 bg-white" />
                </div>
                <div>
                  <Label className="text-xs">Closing Time</Label>
                  <Input type="time" defaultValue="22:00" className="mt-1 bg-white" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Switch defaultChecked />
                <Label className="text-sm">AI assistant handles bookings 24/7 (even outside working hours)</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment */}
        <TabsContent value="payment" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Bank Accounts (Manual Transfer)</CardTitle>
                <Badge className="bg-emerald-100 text-emerald-700">Phase 1 — Live</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {banks.map(b => (
                <div key={b.id} className="p-4 rounded-lg border bg-stone-50 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                      <span className="font-semibold text-stone-900">{b.bankName}</span>
                      {b.isDefault && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Default</Badge>}
                    </div>
                    <div className="text-sm text-stone-600">{b.accountName}</div>
                    <div className="text-xs text-stone-500 mt-1 font-mono">{b.accountNumber}</div>
                    {b.iban && <div className="text-xs text-stone-500 font-mono">IBAN: {b.iban}</div>}
                    {b.swiftCode && <div className="text-xs text-stone-500">SWIFT: {b.swiftCode}</div>}
                    <div className="flex items-center gap-3 mt-2">
                      {!b.isDefault && (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch(`/api/bank-accounts/${b.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ isDefault: true }),
                            }).catch(() => null)
                            if (res?.ok) { load(); toast.success("Set as default bank account") }
                          }}
                          className="text-xs text-emerald-600 hover:underline font-medium"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditBankModal(b)}
                        className="text-xs text-stone-600 hover:underline font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`Delete ${b.bankName} account?`)) return
                          const res = await fetch(`/api/bank-accounts/${b.id}`, { method: "DELETE" }).catch(() => null)
                          if (res?.ok) { load(); toast.success("Bank account deleted") }
                        }}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <Switch
                    checked={b.isActive}
                    onCheckedChange={async v => {
                      const previous = banks
                      setBanks(prev => prev.map(x => (x.id === b.id ? { ...x, isActive: v } : x)))
                      const res = await fetch(`/api/bank-accounts/${b.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isActive: v }),
                      }).catch(() => null)
                      if (!res || !res.ok) { setBanks(previous); toast.error("Could not update the account"); return }
                      toast.success(v ? "Account shown at checkout" : "Account hidden from checkout")
                    }}
                  />
                </div>
              ))}
              <Button variant="outline" className="w-full border-dashed" onClick={openAddBankModal}>
                <Banknote className="h-4 w-4 mr-1.5 text-emerald-600" />Add Bank Account
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">AmwalPay Payment Gateway</CardTitle>
                <Badge className="bg-amber-100 text-amber-700">SmartBox · {settings.amwalpay_mode === "production" ? "Production" : "Test Mode"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-teal-700 mb-1">
                  <Shield className="h-4 w-4" /> SmartBox hosted card form (PCI-DSS SAQ-A)
                </div>
                <p className="text-xs text-teal-600">AmwalPay&apos;s SmartBox card form opens over our checkout page. Card data is entered inside AmwalPay&apos;s own frame and never touches our servers. SmartBox returns the result to us signed, and we verify it with HMAC SHA-256 before marking anything paid.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Merchant ID (numeric)</Label>
                  <Input
                    name="amwalpay-mid"
                    autoComplete="off"
                    inputMode="numeric"
                    defaultValue={settings.amwalpay_merchant_id || ""}
                    placeholder="e.g. 48804"
                    className="mt-1 bg-white"
                    onBlur={e => {
                      const v = e.target.value.trim()
                      if (v && v !== (settings.amwalpay_merchant_id || "")) saveSettings({ amwalpay_merchant_id: v })
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Terminal ID (numeric)</Label>
                  <Input
                    name="amwalpay-tid"
                    autoComplete="off"
                    inputMode="numeric"
                    defaultValue={settings.amwalpay_terminal_id || ""}
                    placeholder="e.g. 113176"
                    className="mt-1 bg-white"
                    onBlur={e => {
                      const v = e.target.value.trim()
                      if (v && v !== (settings.amwalpay_terminal_id || "")) saveSettings({ amwalpay_terminal_id: v })
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Merchant Secure Key (hex string for HMAC SHA-256)</Label>
                  <Input
                    type="password"
                    name="amwalpay-secure-key"
                    autoComplete="new-password"
                    defaultValue=""
                    placeholder={
                      settings.amwalpay_secure_key_set
                        ? `Stored — ends ${settings.amwalpay_secure_key_hint}. Type a new key to replace it.`
                        : "e.g. 604A45C8CD21EF1F..."
                    }
                    className="mt-1 bg-white font-mono text-xs"
                    onBlur={e => {
                      const v = e.target.value.trim()
                      if (v) saveSettings({ amwalpay_secure_key: v })
                    }}
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    Provided by AmwalPay. Signs every request and verifies the result SmartBox returns.
                    It is never sent back to this screen — leaving the box empty keeps the stored key.
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Mode</Label>
                  <Select
                    defaultValue={settings.amwalpay_mode || "test"}
                    onValueChange={v => saveSettings({ amwalpay_mode: v })}
                  >
                    <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test (test.amwalpg.com)</SelectItem>
                      <SelectItem value="production">Production (webhook.amwalpg.com)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-stone-50 border">
                  <div className="text-[10px] font-semibold uppercase text-stone-400 mb-1">Endpoints</div>
                  <code className="text-xs text-emerald-700 block">/api/amwalpay/pay/&lt;orderNumber&gt;</code>
                  <code className="text-xs text-emerald-700 block">/api/amwalpay/callback</code>
                  <p className="text-[10px] text-stone-500 mt-1">The first opens SmartBox for an order; the second receives the signed result and settles it. Both are public by design and verify the hash with the Merchant Secure Key before trusting anything.</p>
                  <p className="text-[10px] text-stone-500 mt-1">Cloud Notification (<code>/api/amwalpay/cloud-notification</code>) is optional and needs Webhook API enabled on the merchant — payment confirmation does not depend on it.</p>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 border">
                  <div className="text-[10px] font-semibold uppercase text-stone-400 mb-1">Payment Flow (per AmwalPay docs &amp; BRD §9.2)</div>
                  <div className="text-[10px] text-stone-600 leading-relaxed">
                    1. Customer taps the pay link sent on WhatsApp<br/>
                    2. We render the order page and sign a SmartBox init hash<br/>
                    3. SmartBox opens over that page — card details stay inside it<br/>
                    4. Customer pays (card, Apple Pay)<br/>
                    5. SmartBox returns to /api/amwalpay/callback with a secure hash → we verify HMAC SHA-256 and require responseCode 00<br/>
                    6. Order marked paid → Email + WhatsApp sent → voucher generated
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="text-[10px] font-semibold uppercase text-emerald-600 mb-1">Secure Hash (HMAC SHA-256)</div>
                  <div className="text-[10px] text-emerald-700">All requests signed with: sort params A-Z → concatenate key=value&key=value → HMAC SHA-256 with Merchant Secure Key → uppercase hex</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paymob Payment Gateway */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Paymob Payment Gateway</CardTitle>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold uppercase">
                    {(settings.paymob_region || "oman").toUpperCase()}
                  </span>
                </div>
                <Badge className={settings.paymob_mode === "production" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-700"}>
                  Unified Checkout · {settings.paymob_mode === "production" ? "Live" : "Sandbox Mode"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-1">
                  <Shield className="h-4 w-4" /> Paymob Intention API &amp; Unified Checkout
                </div>
                <p className="text-xs text-blue-700">
                  Enables multi-currency card payments (Visa, Mastercard, OmanNet, Mada, Meeza) and Mobile Wallets across Oman, Egypt, Saudi Arabia, and the UAE.
                  Transactions are created using the Intention API and verified cryptographically via HMAC SHA-512.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Region</Label>
                  <Select
                    defaultValue={settings.paymob_region || "oman"}
                    onValueChange={v => saveSettings({ paymob_region: v })}
                  >
                    <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oman">Oman (oman.paymob.com · OMR)</SelectItem>
                      <SelectItem value="egypt">Egypt (accept.paymob.com · EGP)</SelectItem>
                      <SelectItem value="ksa">Saudi Arabia (ksa.paymob.com · SAR)</SelectItem>
                      <SelectItem value="uae">United Arab Emirates (uae.paymob.com · AED)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-stone-400 mt-1">Select your operating region and Paymob account deployment.</p>
                </div>

                <div>
                  <Label className="text-xs">Mode</Label>
                  <Select
                    defaultValue={settings.paymob_mode || "test"}
                    onValueChange={v => saveSettings({ paymob_mode: v })}
                  >
                    <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Sandbox / Test</SelectItem>
                      <SelectItem value="production">Live / Production</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-stone-400 mt-1">Live mode processes real card payments.</p>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-xs">Paymob Secret Key (API Key)</Label>
                  <Input
                    type="password"
                    name="paymob-api-key"
                    autoComplete="new-password"
                    defaultValue=""
                    placeholder={
                      settings.paymob_api_key_set
                        ? `Stored — ends ${settings.paymob_api_key_hint}. Type a new key to update.`
                        : "e.g. Token eyJhbGciOi..."
                    }
                    className="mt-1 bg-white font-mono text-xs"
                    onBlur={e => {
                      const v = e.target.value.trim()
                      if (v) saveSettings({ paymob_api_key: v })
                    }}
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    Found in Paymob Dashboard under Settings &gt; Account Info. Authorizes backend Intention calls.
                  </p>
                </div>

                <div>
                  <Label className="text-xs">Public Key</Label>
                  <Input
                    name="paymob-public-key"
                    autoComplete="off"
                    defaultValue={settings.paymob_public_key || ""}
                    placeholder="e.g. PK_live_... or PK_test_..."
                    className="mt-1 bg-white font-mono text-xs"
                    onBlur={e => {
                      const v = e.target.value.trim()
                      if (v && v !== (settings.paymob_public_key || "")) saveSettings({ paymob_public_key: v })
                    }}
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Used to load Paymob Unified Checkout.</p>
                </div>

                <div>
                  <Label className="text-xs">HMAC Secret</Label>
                  <Input
                    type="password"
                    name="paymob-hmac-secret"
                    autoComplete="new-password"
                    defaultValue=""
                    placeholder={
                      settings.paymob_hmac_secret_set
                        ? `Stored — ends ${settings.paymob_hmac_secret_hint}. Type a new secret to update.`
                        : "e.g. 5D88B696013D6..."
                    }
                    className="mt-1 bg-white font-mono text-xs"
                    onBlur={e => {
                      const v = e.target.value.trim()
                      if (v) saveSettings({ paymob_hmac_secret: v })
                    }}
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Used to verify SHA-512 webhook signatures from Paymob.</p>
                </div>

                <div>
                  <Label className="text-xs">Card Integration ID</Label>
                  <Input
                    name="paymob-card-id"
                    autoComplete="off"
                    inputMode="numeric"
                    defaultValue={settings.paymob_integration_id_card || ""}
                    placeholder="e.g. 488091"
                    className="mt-1 bg-white"
                    onBlur={e => {
                      const v = e.target.value.trim()
                      if (v !== (settings.paymob_integration_id_card || "")) saveSettings({ paymob_integration_id_card: v })
                    }}
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Integration ID for Cards (Visa, Mastercard, OmanNet, Mada).</p>
                </div>

                <div>
                  <Label className="text-xs">Wallet Integration ID (Optional)</Label>
                  <Input
                    name="paymob-wallet-id"
                    autoComplete="off"
                    inputMode="numeric"
                    defaultValue={settings.paymob_integration_id_wallet || ""}
                    placeholder="e.g. 488092"
                    className="mt-1 bg-white"
                    onBlur={e => {
                      const v = e.target.value.trim()
                      if (v !== (settings.paymob_integration_id_wallet || "")) saveSettings({ paymob_integration_id_wallet: v })
                    }}
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Integration ID for Mobile Wallets (Vodafone Cash, STC Pay, etc.).</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-stone-50 border">
                  <div className="text-[10px] font-semibold uppercase text-stone-400 mb-1">Paymob Webhook Configuration</div>
                  <p className="text-xs text-stone-600 mb-1">
                    Copy this Webhook URL and paste it into your Paymob Dashboard under <strong>Settings &gt; Integration Callbacks &gt; Transaction Processed Callback</strong>:
                  </p>
                  <code className="text-xs text-blue-700 block select-all p-2 bg-white rounded border">
                    https://app.fizmoh.cloud/api/paymob/webhook
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp */}
        <TabsContent value="whatsapp" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">WhatsApp Cloud API</CardTitle>
                {waConfig === null ? (
                  <Badge className="bg-stone-100 text-stone-600">Checking…</Badge>
                ) : waConfig.live && waConfig.inboundReady ? (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />Live
                  </Badge>
                ) : waConfig.live ? (
                  <Badge className="bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-3 w-3 mr-1" />Outbound only
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700">Not configured</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {waConfig && waConfig.live && !waConfig.inboundReady && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <strong>Inbound messages are being rejected.</strong> The webhook verifies Meta&apos;s
                  signature and fails closed without an App Secret. Add it below (Meta App Dashboard →
                  Settings → Basic → App Secret) to start receiving customer messages.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  { key: "phoneNumberId", label: "Phone Number ID", placeholder: "From Meta Business Manager" },
                  { key: "accessToken", label: "Access Token", placeholder: "System User token", secret: true },
                  { key: "wabaId", label: "Business Account ID", placeholder: "From Meta Business Manager" },
                  { key: "phoneNumber", label: "Display Phone Number", placeholder: "+968…" },
                  { key: "appSecret", label: "App Secret (required for inbound)", placeholder: "From Meta App Dashboard", secret: true },
                  { key: "webhookVerifyToken", label: "Webhook Verify Token", placeholder: "Any random string", mono: true },
                ] as { key: string; label: string; placeholder: string; secret?: boolean; mono?: boolean }[]).map(field => {
                  const state = waConfig?.fields?.[field.key]
                  const envManaged = state?.envManaged
                  return (
                    <div key={field.key}>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">{field.label}</Label>
                        {envManaged && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
                            <Lock className="h-3 w-3" />Set in server env
                          </span>
                        )}
                      </div>
                      <Input
                        className={"mt-1 bg-white" + (field.mono ? " font-mono text-xs" : "")}
                        disabled={envManaged}
                        placeholder={
                          envManaged || state?.set
                            ? (state?.masked || state?.value || "Configured")
                            : field.placeholder
                        }
                        value={waDraft[field.key] ?? (envManaged || field.secret ? "" : state?.value ?? "")}
                        onChange={e => setWaDraft(d => ({ ...d, [field.key]: e.target.value }))}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                  Configure these two values in Meta → WhatsApp → Configuration
                </div>
                {[
                  { label: "Callback URL", value: waConfig?.webhookUrl || "" },
                  {
                    label: "Verify Token",
                    value: waDraft.webhookVerifyToken || waConfig?.fields?.webhookVerifyToken?.value || "",
                  },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-700 w-24 shrink-0">{row.label}</span>
                    <code className="flex-1 bg-white px-2 py-1 rounded text-[11px] font-mono truncate">
                      {row.value || "—"}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      disabled={!row.value}
                      onClick={() => { navigator.clipboard.writeText(row.value); toast.success("Copied") }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <p className="text-[11px] text-emerald-700">
                  Subscribe the WhatsApp Business Account to the <strong>messages</strong> field, or inbound
                  messages will never reach the inbox.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={saveWaConfig} disabled={waSaving} className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="h-4 w-4 mr-1.5" />
                  {waSaving ? "Saving…" : "Save credentials"}
                </Button>
                <Button variant="outline" onClick={loadWaConfig}>
                  <RefreshCw className="h-4 w-4 mr-1.5" />Re-check
                </Button>
                <a
                  href="https://business.facebook.com/wa/manage/phone-numbers/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1 ml-auto"
                >
                  Open Meta Business Manager <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-[11px] text-stone-500">
                Secrets are write-only — saved values are never sent back to this screen. Fields marked
                &ldquo;set in server env&rdquo; are managed by the deployment and cannot be changed here.
              </p>
            </CardContent>
          </Card>

          <WhatsAppCatalogCard />

          <Card>
            <CardHeader><CardTitle className="text-base">AI Assistant &amp; Automation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {([
                { key: "wa_bot_enabled", label: "AI Assistant Enabled", desc: "Najwa handles conversations automatically", def: true },
                { key: "wa_flows_enabled", label: "Bot Flows", desc: "Keyword and intent flows answer before the AI", def: true },
                { key: "wa_hours_enabled", label: "Auto-Reply Outside Hours", desc: "Send an away message when the business is closed", def: false },
                { key: "wa_ai_always_on", label: "AI 24/7 Booking", desc: "Let the AI keep booking outside working hours", def: true },
                { key: "wa_reminders_enabled", label: "Pre-Tour Reminders", desc: "24 hours before departure", def: true },
                { key: "wa_recovery_enabled", label: "Abandoned Booking Recovery", desc: "1 hour after an unpaid booking", def: true },
                { key: "wa_review_enabled", label: "Post-Tour Review Requests", desc: "24 hours after the tour ends", def: true },
              ] as const).map(row => (
                <div key={row.key} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium text-sm">{row.label}</div>
                    <div className="text-xs text-stone-500">{row.desc}</div>
                  </div>
                  <Switch
                    checked={settings[row.key] ?? row.def}
                    onCheckedChange={v => saveSettings({ [row.key]: v })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="mt-4">
          <SocialChannelsSettings />
        </TabsContent>

        {/* AI */}
        <TabsContent value="ai" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">AI Provider</CardTitle>
                {aiConfig === null ? (
                  <Badge className="bg-stone-100 text-stone-600">Checking…</Badge>
                ) : aiConfig.ready ? (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />Ready
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-3 w-3 mr-1" />No API key
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiConfig && !aiConfig.ready && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  The assistant replies with a fallback message and hands off to an agent until a key is
                  saved for the selected provider. Payment-screenshot analysis and smart replies are also
                  disabled.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Provider</Label>
                    {aiConfig?.providerEnvManaged && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
                        <Lock className="h-3 w-3" />Set in server env
                      </span>
                    )}
                  </div>
                  <Select
                    value={aiDraft.provider ?? aiConfig?.provider ?? "anthropic"}
                    disabled={aiConfig?.providerEnvManaged}
                    onValueChange={v => setAiDraft(d => ({ ...d, provider: v }))}
                  >
                    <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anthropic">Anthropic — Claude</SelectItem>
                      <SelectItem value="openai">OpenAI — ChatGPT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Model</Label>
                    {aiConfig?.modelEnvManaged && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
                        <Lock className="h-3 w-3" />Set in server env
                      </span>
                    )}
                  </div>
                  <Input
                    className="mt-1 bg-white font-mono text-xs"
                    disabled={aiConfig?.modelEnvManaged}
                    value={aiDraft.model ?? aiConfig?.model ?? ""}
                    placeholder="Model id"
                    onChange={e => setAiDraft(d => ({ ...d, model: e.target.value }))}
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(aiConfig?.suggestedModels?.[aiDraft.provider ?? aiConfig?.provider] || []).map((m: string) => (
                      <button
                        key={m}
                        type="button"
                        disabled={aiConfig?.modelEnvManaged}
                        onClick={() => setAiDraft(d => ({ ...d, model: m }))}
                        className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-mono text-stone-600 hover:bg-stone-100 disabled:opacity-50"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {isPlatformAdmin ? (
                  ([
                    { key: "anthropicKey", label: "Anthropic API Key", provider: "anthropic", placeholder: "sk-ant-…" },
                    { key: "openaiKey", label: "OpenAI API Key", provider: "openai", placeholder: "sk-…" },
                  ] as { key: string; label: string; provider: string; placeholder: string }[]).map(field => {
                    const state = aiConfig?.keys?.[field.provider]
                    const active = (aiDraft.provider ?? aiConfig?.provider) === field.provider
                    return (
                      <div key={field.key}>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">
                            {field.label}
                            {active && <span className="ml-1.5 text-[10px] text-emerald-600">active</span>}
                          </Label>
                          {state?.envManaged && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
                              <Lock className="h-3 w-3" />Set in server env
                            </span>
                          )}
                        </div>
                        <Input
                          className="mt-1 bg-white font-mono text-xs"
                          disabled={state?.envManaged}
                          placeholder={state?.set ? state.masked : field.placeholder}
                          value={aiDraft[field.key] ?? ""}
                          onChange={e => setAiDraft(d => ({ ...d, [field.key]: e.target.value }))}
                        />
                      </div>
                    )
                  })
                ) : (
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-center gap-2 col-span-2">
                    <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>AI Assistant features are active for your workspace. API key configuration and model selection are managed by your platform administrator.</span>
                  </div>
                )}
              </div>

              {isPlatformAdmin && (
                <div className="flex items-center gap-2">
                  <Button onClick={() => saveAiConfig()} disabled={aiSaving} className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="h-4 w-4 mr-1.5" />{aiSaving ? "Saving…" : "Save AI settings"}
                  </Button>
                  <Button variant="outline" onClick={runAiTest} disabled={aiTesting}>
                    <Zap className={"h-4 w-4 mr-1.5 " + (aiTesting ? "animate-pulse" : "")} />
                    {aiTesting ? "Testing…" : "Test connection"}
                  </Button>
                  <Button variant="ghost" onClick={loadAiConfig}>
                    <RefreshCw className="h-4 w-4 mr-1.5" />Re-check
                  </Button>
                </div>
              )}

              {aiTest && (
                <div
                  className={
                    "p-3 rounded-lg border text-xs " +
                    (aiTest.ok
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800")
                  }
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {aiTest.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {aiTest.ok ? "Connection OK" : "Connection failed"}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {aiTest.provider && (
                      <div>
                        Provider <code className="font-mono">{aiTest.provider}</code> · model{" "}
                        <code className="font-mono">{aiTest.model}</code>
                        {typeof aiTest.latencyMs === "number" && ` · ${aiTest.latencyMs}ms`}
                      </div>
                    )}
                    {aiTest.reply && <div>Model replied: “{aiTest.reply}”</div>}
                    {aiTest.error && <div className="font-mono break-words">{aiTest.error}</div>}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-stone-500">
                API keys are write-only — saved values are never sent back to this screen. Switching provider
                also switches the model unless you set one explicitly. Use the <strong>AI Assistant</strong>
                screen in the sidebar to hold a full conversation with the assistant and exercise its booking
                tools.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email */}
        <TabsContent value="email" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Email Configuration (SMTP)</CardTitle>
                <Badge className={settings.smtp_host ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                  {settings.smtp_host ? "SMTP Active" : "Simulation Mode"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">SMTP Host</Label>
                  <Input
                    defaultValue={settings.smtp_host || ""}
                    placeholder="smtp.sendgrid.net"
                    className="mt-1 bg-white"
                    onBlur={e => saveSettings({ smtp_host: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Port</Label>
                  <Input
                    type="number"
                    defaultValue={settings.smtp_port || "587"}
                    placeholder="587"
                    className="mt-1 bg-white"
                    onBlur={e => saveSettings({ smtp_port: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Username</Label>
                  <Input
                    defaultValue={settings.smtp_user || ""}
                    placeholder="apikey"
                    className="mt-1 bg-white"
                    onBlur={e => saveSettings({ smtp_user: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Password / API Key</Label>
                  <Input
                    type="password"
                    defaultValue={settings.smtp_password || ""}
                    placeholder="••••••••••••"
                    className="mt-1 bg-white"
                    onBlur={e => saveSettings({ smtp_password: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">From Email</Label>
                  <Input
                    defaultValue={settings.smtp_from || ""}
                    placeholder="bookings@omanadventures.om"
                    className="mt-1 bg-white"
                    onBlur={e => saveSettings({ smtp_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">From Name</Label>
                  <Input
                    defaultValue={settings.smtp_from_name || ""}
                    placeholder="Oman Adventures"
                    className="mt-1 bg-white"
                    onBlur={e => saveSettings({ smtp_from_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 border text-xs text-stone-600">
                <Shield className="h-3.5 w-3.5 inline mr-1 text-emerald-600" />
                Recommended ESPs: Amazon SES, SendGrid, Postmark. Configure SPF/DKIM/DMARC for deliverability.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-4 space-y-4">
          <BookingAlertNumbersSection />
          <NotificationPrefs />
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-600" />Compliance &amp; Data Protection</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">Oman PDPL Aligned</span>
                  <Badge className="bg-emerald-200 text-emerald-800">Active</Badge>
                </div>
                <p className="text-xs text-emerald-700">Customer data handling follows Oman&apos;s Personal Data Protection Law. All consent is logged with timestamps.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-sm">VAT Compliance</span>
                  </div>
                  <p className="text-xs text-stone-500">5% VAT applied to all bookings. VAT-compliant invoices generated automatically.</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <WhatsAppIcon className="h-4 w-4" />
                    <span className="font-medium text-sm">WhatsApp Policy</span>
                  </div>
                  <p className="text-xs text-stone-500">All templates comply with Meta Business &amp; Commerce Policy. Opt-out handling automatic.</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-sm">PCI-DSS Aware</span>
                  </div>
                  <p className="text-xs text-stone-500">No raw card data stored. AmwalPay hosted checkout keeps SAQ-A scope.</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4 text-rose-600" />
                    <span className="font-medium text-sm">Audit Logging</span>
                  </div>
                  <p className="text-xs text-stone-500">Every payment approval, booking change, and refund is logged with user &amp; timestamp.</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-stone-50 border">
                <div className="font-medium text-sm mb-2">Data Retention</div>
                <div className="space-y-2 text-xs text-stone-600">
                  <div className="flex justify-between"><span>Customer data</span><span>Retained until account deletion request</span></div>
                  <div className="flex justify-between"><span>Payment records</span><span>7 years (tax compliance)</span></div>
                  <div className="flex justify-between"><span>WhatsApp messages</span><span>2 years</span></div>
                  <div className="flex justify-between"><span>Audit logs</span><span>5 years</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addingBank || editingBank !== null} onOpenChange={open => { if (!open) { setAddingBank(false); setEditingBank(null); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-900">
              <Banknote className="h-5 w-5 text-emerald-600" />
              {editingBank ? "Edit Payment Destination" : "Add Payment Destination"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveBank} className="space-y-4 py-2">
            {/*
              * Two destinations, one dialog.
              *
              * A phone transfer has a name and a number and nothing else, so
              * selecting it hides the bank, IBAN, SWIFT and branch fields
              * rather than asking the operator to fill in something that does
              * not exist and would then be shown to a customer as fact.
              */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-stone-100">
              {([
                { key: "BANK", label: "🏦 Bank Transfer" },
                { key: "PHONE", label: "📱 Phone Number" },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setBankForm({ ...bankForm, type: opt.key })}
                  className={`h-9 rounded-lg text-xs font-bold transition ${
                    bankForm.type === opt.key
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {bankForm.type === "BANK" && (
              <div>
                <Label className="text-xs font-semibold text-stone-700">Bank Name *</Label>
                <Input
                  placeholder="e.g. Bank Muscat, National Bank of Oman"
                  value={bankForm.bankName}
                  onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                  required
                  className="mt-1 bg-white text-sm"
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-stone-700">{bankForm.type === "PHONE" ? "Name *" : "Account / Beneficiary Name *"}</Label>
              <Input
                placeholder="e.g. Oman Adventures LLC"
                value={bankForm.accountName}
                onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })}
                required
                className="mt-1 bg-white text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-stone-700">{bankForm.type === "PHONE" ? "Phone Number *" : "Account Number *"}</Label>
              <Input
                placeholder={bankForm.type === "PHONE" ? "e.g. +968 9200 9161" : "e.g. 0301-0290-1234-5678"}
                value={bankForm.accountNumber}
                onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                required
                className="mt-1 bg-white font-mono text-xs"
              />
            </div>

            {bankForm.type === "BANK" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-stone-700">IBAN Number (Optional)</Label>
                <Input
                  placeholder="OM18 0030 0010 ..."
                  value={bankForm.iban}
                  onChange={e => setBankForm({ ...bankForm, iban: e.target.value })}
                  className="mt-1 bg-white font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-stone-700">SWIFT / BIC (Optional)</Label>
                <Input
                  placeholder="e.g. BMUSOMRX"
                  value={bankForm.swiftCode}
                  onChange={e => setBankForm({ ...bankForm, swiftCode: e.target.value })}
                  className="mt-1 bg-white font-mono text-xs uppercase"
                />
              </div>
            </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {bankForm.type === "BANK" && (
              <div>
                <Label className="text-xs font-semibold text-stone-700">Branch (Optional)</Label>
                <Input
                  placeholder="e.g. Ruwi Main Branch"
                  value={bankForm.branch}
                  onChange={e => setBankForm({ ...bankForm, branch: e.target.value })}
                  className="mt-1 bg-white text-xs"
                />
              </div>
              )}
              <div>
                <Label className="text-xs font-semibold text-stone-700">Currency</Label>
                <Input
                  placeholder="OMR"
                  value={bankForm.currency}
                  onChange={e => setBankForm({ ...bankForm, currency: e.target.value })}
                  className="mt-1 bg-white font-mono text-xs uppercase"
                />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border">
                <div>
                  <div className="text-xs font-semibold text-stone-900">Set as Default Account</div>
                  <div className="text-[11px] text-stone-500">Show this account first during customer checkout</div>
                </div>
                <Switch
                  checked={bankForm.isDefault}
                  onCheckedChange={v => setBankForm({ ...bankForm, isDefault: v })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border">
                <div>
                  <div className="text-xs font-semibold text-stone-900">Active Status</div>
                  <div className="text-[11px] text-stone-500">Display this bank account on customer checkout page</div>
                </div>
                <Switch
                  checked={bankForm.isActive}
                  onCheckedChange={v => setBankForm({ ...bankForm, isActive: v })}
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setEditingBank(null); setAddingBank(false); }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={bankSaving || !bankForm.bankName || !bankForm.accountName || !bankForm.accountNumber}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {bankSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingBank ? "Save Changes" : bankForm.type === "PHONE" ? "Add Phone Number" : "Add Bank Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Which events raise an alert.
 *
 * These were six switches with no handler: they moved, saved nothing, and every
 * alert fired regardless of what anyone set.
 */
function NotificationPrefs() {
  const [types, setTypes] = useState<{ key: string; label: string; description: string; enabled: boolean }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/notification-prefs")
      .then(r => r.json())
      .then(d => { setTypes(d.types || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggle = async (key: string, enabled: boolean) => {
    const previous = types
    setTypes(prev => prev.map(t => (t.key === key ? { ...t, enabled } : t)))
    const res = await fetch("/api/notification-prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: enabled }),
    }).catch(() => null)
    if (!res || !res.ok) { setTypes(previous); toast.error("Could not save"); return }
    toast.success(enabled ? "Alerts on" : "Alerts muted")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notification preferences</CardTitle>
        <p className="text-xs text-stone-500">Muted events are still recorded in the notification list — they just stop interrupting.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : types.map(type => (
          <div key={type.key} className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <div className="font-medium text-sm">{type.label}</div>
              <div className="text-xs text-stone-500">{type.description}</div>
            </div>
            <Switch checked={type.enabled} onCheckedChange={v => toggle(type.key, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

interface BookingRecipient {
  id: string
  name: string
  phone: string
  bookingType: "all" | "tour" | "training"
  active: boolean
}

function BookingAlertNumbersSection() {
  const [recipients, setRecipients] = useState<BookingRecipient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newType, setNewType] = useState<"all" | "tour" | "training">("all")

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const raw = d.settings?.booking_notification_recipients
        if (Array.isArray(raw) && raw.length > 0) {
          setRecipients(raw)
        } else if (d.settings?.booking_admin_phones) {
          const phones = typeof d.settings.booking_admin_phones === "string"
            ? d.settings.booking_admin_phones.split(/[\n,;]+/).map((s: string) => s.trim()).filter(Boolean)
            : Array.isArray(d.settings.booking_admin_phones)
            ? d.settings.booking_admin_phones
            : []
          setRecipients(
            phones.map((p: string, i: number) => ({
              id: `phone-${i}`,
              name: `Admin ${i + 1}`,
              phone: p,
              bookingType: "all",
              active: true,
            }))
          )
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const saveRecipients = async (updated: BookingRecipient[]) => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_notification_recipients: updated,
          booking_admin_phones: updated.map((r) => r.phone),
        }),
      })
      if (!res.ok) throw new Error("Failed to save settings")
      setRecipients(updated)
      toast.success("Booking notification numbers updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = () => {
    if (!newPhone.trim()) {
      toast.error("Please enter a phone number")
      return
    }
    let cleaned = newPhone.replace(/[^\d+]/g, "").trim()
    if (!cleaned.startsWith("+")) {
      if (cleaned.startsWith("968") && cleaned.length >= 11) cleaned = `+${cleaned}`
      else if (cleaned.length === 8 && /^[79]/.test(cleaned)) cleaned = `+968${cleaned}`
      else cleaned = `+${cleaned}`
    }

    const newItem: BookingRecipient = {
      id: `rec_${Date.now()}`,
      name: newName.trim() || `Admin ${recipients.length + 1}`,
      phone: cleaned,
      bookingType: newType,
      active: true,
    }

    const updated = [...recipients, newItem]
    saveRecipients(updated)
    setNewName("")
    setNewPhone("")
    setNewType("all")
  }

  const handleDelete = (id: string) => {
    const updated = recipients.filter((r) => r.id !== id)
    saveRecipients(updated)
  }

  const handleToggle = (id: string, active: boolean) => {
    const updated = recipients.map((r) => (r.id === id ? { ...r, active } : r))
    saveRecipients(updated)
  }

  const handleTestAlert = async (r: BookingRecipient) => {
    setTestingId(r.id)
    try {
      const res = await fetch("/api/settings/test-booking-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: r.phone, bookingType: r.bookingType }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to send test alert")
      toast.success(`Test WhatsApp alert sent to ${r.phone}!`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test alert failed")
    } finally {
      setTestingId(null)
    }
  }

  const TYPE_BADGES = {
    all: { label: "All Bookings (Tours & Training)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    tour: { label: "Tours Only", color: "bg-sky-50 text-sky-700 border-sky-200" },
    training: { label: "Training Only", color: "bg-purple-50 text-purple-700 border-purple-200" },
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <WhatsAppIcon className="h-4.5 w-4.5" />
              WhatsApp Booking Notification Numbers
            </CardTitle>
            <p className="text-xs text-stone-500">
              Configure multiple admin and staff mobile numbers to receive instant WhatsApp alerts when customers book tours or training sessions.
            </p>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
            {recipients.filter((r) => r.active).length} Active Alerts
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* New Recipient Form */}
        <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3">
          <div className="font-semibold text-xs text-stone-800 uppercase tracking-wider">
            Add New Notification Number
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4 space-y-1">
              <Label className="text-xs text-stone-600">Contact / Role Name</Label>
              <Input
                placeholder="e.g. Main Admin, Coach Nouf, Desk"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white text-xs h-9"
              />
            </div>
            <div className="sm:col-span-4 space-y-1">
              <Label className="text-xs text-stone-600">WhatsApp Mobile Number</Label>
              <Input
                placeholder="+968 9200 9161"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="bg-white text-xs h-9 font-mono"
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <Label className="text-xs text-stone-600">Booking Types</Label>
              <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                <SelectTrigger className="bg-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bookings</SelectItem>
                  <SelectItem value="tour">Tours Only</SelectItem>
                  <SelectItem value="training">Training Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-1">
              <Button
                type="button"
                onClick={handleAdd}
                disabled={saving || !newPhone.trim()}
                className="w-full h-9 bg-[#00E785] hover:bg-[#00B96A] text-stone-900 font-semibold px-0 text-xs shadow-none border border-emerald-600/20"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : <Plus className="h-4 w-4 mx-auto" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Recipients List */}
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : recipients.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-lg bg-stone-50/50">
              <Phone className="h-6 w-6 text-stone-400 mx-auto mb-1.5 opacity-60" />
              <p className="text-xs text-stone-600 font-medium">No notification numbers configured yet.</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Add an admin or coach mobile number above to begin receiving booking alerts on WhatsApp.
              </p>
            </div>
          ) : (
            recipients.map((r) => {
              const badge = TYPE_BADGES[r.bookingType] || TYPE_BADGES.all
              const isTesting = testingId === r.id
              return (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-stone-200 bg-white hover:border-stone-300 transition gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-stone-900 truncate">{r.name}</span>
                        <Badge variant="outline" className={`text-[10px] py-0 ${badge.color}`}>
                          {badge.label}
                        </Badge>
                      </div>
                      <div className="text-xs font-mono text-stone-500">{r.phone}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestAlert(r)}
                      disabled={isTesting}
                      className="h-7 text-[11px] px-2.5 text-stone-700 border-stone-200 hover:bg-stone-50"
                    >
                      {isTesting ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3 mr-1 text-emerald-600" />
                      )}
                      Test Alert
                    </Button>
                    <div className="flex items-center gap-1.5 pl-2 border-l border-stone-200">
                      <Switch checked={r.active} onCheckedChange={(v) => handleToggle(r.id, v)} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(r.id)}
                        className="h-7 w-7 text-stone-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<{ id: string; name: string; prefix: string; createdAt: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)

  const loadKeys = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/api-keys")
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys || [])
      }
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadKeys() }, [])

  const handleCreate = async () => {
    if (!nameInput.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setNewKey(data.apiKey.rawKey)
        setNameInput("")
        loadKeys()
        toast.success("API key generated successfully")
      } else {
        toast.error("Failed to generate API key")
      }
    } catch { toast.error("Error generating API key") }
    finally { setCreating(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Revoke and delete this API key? Any applications using it will lose access.")) return
    try {
      const res = await fetch(`/api/settings/api-keys?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("API key revoked")
        loadKeys()
      } else {
        toast.error("Could not delete API key")
      }
    } catch { toast.error("Error deleting API key") }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-emerald-600" />
                REST API Keys & Postman Integration
              </CardTitle>
              <p className="text-xs text-stone-500 mt-1">
                Generate secret keys for connecting your booking data with external applications, accounting tools, or custom mobile apps.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 gap-1.5 shrink-0"
            >
              <a href="/api/docs/postman" download="Fizmoh_Platform_API.postman_collection.json">
                <Download className="h-4 w-4 text-emerald-600" />
                Download Postman Collection
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {newKey && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> Save your new API Key!
              </div>
              <p className="text-xs text-emerald-700">
                This is the only time you will see this key. Copy it now and store it in a secure location:
              </p>
              <div className="flex items-center gap-2">
                <Input value={newKey} readOnly className="font-mono text-xs bg-white text-stone-900 font-bold select-all" />
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(newKey)
                    toast.success("Copied API key to clipboard!")
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Key Description (e.g. Mobile App, Accounting Integration)"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              className="bg-white"
            />
            <Button
              onClick={handleCreate}
              disabled={creating || !nameInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Generate Key
            </Button>
          </div>

          <div className="space-y-2 pt-2">
            {loading ? (
              <Skeleton className="h-16 rounded-lg" />
            ) : keys.length === 0 ? (
              <div className="text-center py-8 text-stone-500 border border-dashed rounded-xl text-xs">
                No API keys generated yet. Create one above to get started.
              </div>
            ) : (
              keys.map(k => (
                <div key={k.id} className="p-3.5 rounded-xl border bg-stone-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-stone-900">{k.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-stone-200/70 text-stone-800 px-2 py-0.5 rounded font-mono font-medium">{k.prefix}••••••••</code>
                      <span className="text-[11px] text-stone-400">Created {new Date(k.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-8 text-xs"
                    onClick={() => handleDelete(k.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* DETAILED PROFESSIONAL API DOCUMENTATION GUIDE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            Professional API Technical Reference Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-xs text-stone-700">
          <div className="p-3.5 rounded-xl bg-stone-900 text-stone-100 font-mono text-[11px] space-y-2">
            <div className="text-stone-400 font-sans font-bold"># Authentication Headers</div>
            <div>Authorization: Bearer fz_live_your_api_key</div>
            <div>X-API-Key: fz_live_your_api_key</div>
            <div className="text-stone-400 font-sans font-bold pt-2"># Base Server URL</div>
            <div className="text-emerald-400">https://app.fizmoh.cloud</div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-stone-900 text-sm border-b pb-1">Core REST Endpoints Summary</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Tours */}
              <div className="p-3 border rounded-lg bg-stone-50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 font-mono text-[10px]">GET</Badge>
                  <span className="font-mono font-bold text-stone-900">/api/external/v1/tours</span>
                </div>
                <p className="text-[11px] text-stone-500">Fetch all tour packages, pricing, photos, and availability.</p>
                <div className="bg-stone-900 text-emerald-300 p-2 rounded text-[10px] font-mono">
                  curl -H &quot;Authorization: Bearer YOUR_KEY&quot; https://app.fizmoh.cloud/api/external/v1/tours
                </div>
              </div>

              {/* 2. CRM Customers */}
              <div className="p-3 border rounded-lg bg-stone-50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 font-mono text-[10px]">GET / POST</Badge>
                  <span className="font-mono font-bold text-stone-900">/api/external/v1/customers</span>
                </div>
                <p className="text-[11px] text-stone-500">List or create CRM contacts & customer profiles.</p>
                <div className="bg-stone-900 text-emerald-300 p-2 rounded text-[10px] font-mono">
                  curl -X POST -H &quot;Content-Type: application/json&quot; -H &quot;Authorization: Bearer YOUR_KEY&quot; -d &apos;&#123;&quot;name&quot;:&quot;Sultan&quot;,&quot;phone&quot;:&quot;+96891234567&quot;&#125;&apos; https://app.fizmoh.cloud/api/external/v1/customers
                </div>
              </div>

              {/* 3. WhatsApp Messaging */}
              <div className="p-3 border rounded-lg bg-stone-50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600 font-mono text-[10px]">POST</Badge>
                  <span className="font-mono font-bold text-stone-900">/api/external/v1/whatsapp/send</span>
                </div>
                <p className="text-[11px] text-stone-500">Send WhatsApp messages directly through your connected Meta line.</p>
                <div className="bg-stone-900 text-emerald-300 p-2 rounded text-[10px] font-mono">
                  curl -X POST -H &quot;Content-Type: application/json&quot; -H &quot;Authorization: Bearer YOUR_KEY&quot; -d &apos;&#123;&quot;to&quot;:&quot;+96891234567&quot;,&quot;text&quot;:&quot;Hello!&quot;&#125;&apos; https://app.fizmoh.cloud/api/external/v1/whatsapp/send
                </div>
              </div>

              {/* 4. Appointments & Google Meet */}
              <div className="p-3 border rounded-lg bg-stone-50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600 font-mono text-[10px]">GET / POST</Badge>
                  <span className="font-mono font-bold text-stone-900">/api/appointments</span>
                </div>
                <p className="text-[11px] text-stone-500">Book consultations & automatically generate Google Meet video links.</p>
                <div className="bg-stone-900 text-emerald-300 p-2 rounded text-[10px] font-mono">
                  curl -H &quot;Authorization: Bearer YOUR_KEY&quot; https://app.fizmoh.cloud/api/appointments
                </div>
              </div>

              {/* 5. Restaurant POS */}
              <div className="p-3 border rounded-lg bg-stone-50 space-y-1.5 col-span-1 md:col-span-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-600 font-mono text-[10px]">GET / POST</Badge>
                  <span className="font-mono font-bold text-stone-900">/api/restaurant/menu &amp; /api/restaurant/orders</span>
                </div>
                <p className="text-[11px] text-stone-500">Fetch digital restaurant menu with addons & photos, place POS orders into KDS.</p>
                <div className="bg-stone-900 text-emerald-300 p-2 rounded text-[10px] font-mono">
                  curl -H &quot;Authorization: Bearer YOUR_KEY&quot; https://app.fizmoh.cloud/api/restaurant/menu
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SeoIntegrationsSection({
  settings,
  saveSettings,
}: {
  settings: Record<string, any>
  saveSettings: (updated: Record<string, any>) => Promise<void>
}) {
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [savingSeo, setSavingSeo] = useState(false)
  const value = (key: string) => draft[key] ?? String(settings[key] ?? "")
  const set = (key: string, next: string) => setDraft(prev => ({ ...prev, [key]: next }))
  const save = async () => {
    setSavingSeo(true)
    try {
      await saveSettings(draft)
      setDraft({})
    } finally {
      setSavingSeo(false)
    }
  }
  const codeLength = Object.values(draft).filter(Boolean).reduce((sum, item) => sum + item.length, 0)

  return <div className="space-y-6">
    <Card className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Code2 className="h-4 w-4 text-emerald-600" />Search, analytics and advertising connections</CardTitle>
        <p className="text-xs text-stone-500">These IDs are applied to your public storefront only. Credentials and API secrets stay server-side and are never exposed to visitors.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label className="text-xs">Google Search Console verification code</Label><Input value={value("seo_google_verification")} onChange={e => set("seo_google_verification", e.target.value)} placeholder="content value from Google" className="mt-1 bg-white font-mono text-xs" /><p className="mt-1 text-[10px] text-stone-500">Paste only the content value, not the full meta tag.</p></div>
          <div><Label className="text-xs">Google Analytics 4 Measurement ID</Label><Input value={value("seo_ga4_id")} onChange={e => set("seo_ga4_id", e.target.value)} placeholder="G-XXXXXXXXXX" className="mt-1 bg-white font-mono text-xs" /></div>
          <div><Label className="text-xs">Google Ads Conversion ID</Label><Input value={value("seo_google_ads_id")} onChange={e => set("seo_google_ads_id", e.target.value)} placeholder="AW-123456789" className="mt-1 bg-white font-mono text-xs" /></div>
          <div><Label className="text-xs">Google Ads Conversion Label</Label><Input value={value("seo_google_ads_label")} onChange={e => set("seo_google_ads_label", e.target.value)} placeholder="label from conversion action" className="mt-1 bg-white font-mono text-xs" /></div>
          <div><Label className="text-xs">Meta/Facebook Pixel ID</Label><Input value={value("seo_meta_pixel_id")} onChange={e => set("seo_meta_pixel_id", e.target.value)} placeholder="123456789012345" className="mt-1 bg-white font-mono text-xs" /></div>
          <div><Label className="text-xs">LinkedIn Partner ID</Label><Input value={value("seo_linkedin_partner_id")} onChange={e => set("seo_linkedin_partner_id", e.target.value)} placeholder="123456" className="mt-1 bg-white font-mono text-xs" /></div>
          <div><Label className="text-xs">TikTok Pixel ID</Label><Input value={value("seo_tiktok_pixel_id")} onChange={e => set("seo_tiktok_pixel_id", e.target.value)} placeholder="ABCDEFGHIJKLMNOPQRSTUVWXYZ" className="mt-1 bg-white font-mono text-xs" /></div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-600 space-y-2"><p className="font-semibold text-stone-800">What is connected?</p><p>Search Console verifies ownership through a meta tag. GA4, Google Ads, Meta Pixel, LinkedIn and TikTok receive page-view signals on the public storefront. Conversion events should be configured in the provider dashboard and can be added through the custom snippets below.</p></div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plug className="h-4 w-4 text-blue-600" />Third-party apps and webhooks</CardTitle><p className="text-xs text-stone-500">Use the REST API keys and webhook delivery tools to connect CRM, ERP, accounting, email, automation and custom mobile applications.</p></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3"><a href="/api/docs/postman" className="rounded-xl border bg-stone-50 p-4 hover:border-emerald-300"><Code2 className="h-4 w-4 text-emerald-600" /><p className="mt-2 text-xs font-bold">REST API &amp; Postman</p><p className="mt-1 text-[11px] text-stone-500">Create tenant API keys from API Keys &amp; Docs.</p></a><a href="/audit-logs" className="rounded-xl border bg-stone-50 p-4 hover:border-emerald-300"><RefreshCw className="h-4 w-4 text-blue-600" /><p className="mt-2 text-xs font-bold">Webhook and audit logs</p><p className="mt-1 text-[11px] text-stone-500">Inspect operational events and delivery failures.</p></a><a href="/docs#api-reference" className="rounded-xl border bg-stone-50 p-4 hover:border-emerald-300"><ExternalLink className="h-4 w-4 text-purple-600" /><p className="mt-2 text-xs font-bold">Integration manual</p><p className="mt-1 text-[11px] text-stone-500">Review authentication, endpoints and examples.</p></a></CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Code2 className="h-4 w-4 text-amber-600" />Custom code injection</CardTitle><p className="text-xs text-stone-500">Add provider snippets to the public storefront. Header code is inserted in the document head; body code appears after the storefront header; footer code appears before the storefront footer.</p></CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>Security:</strong> custom code can execute JavaScript for every storefront visitor. Only the workspace owner or super admin can save it. Never paste private API keys, passwords or patient data here.</div>
        <div><Label className="text-xs">Header code</Label><textarea value={value("seo_head_code")} onChange={e => set("seo_head_code", e.target.value)} rows={5} placeholder={'<!-- verification or provider script -->'} className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 font-mono text-xs" /></div>
        <div><Label className="text-xs">Body code</Label><textarea value={value("seo_body_code")} onChange={e => set("seo_body_code", e.target.value)} rows={5} placeholder="<!-- tag manager body snippet -->" className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 font-mono text-xs" /></div>
        <div><Label className="text-xs">Footer code</Label><textarea value={value("seo_footer_code")} onChange={e => set("seo_footer_code", e.target.value)} rows={5} placeholder="<!-- chat widget or conversion event -->" className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 font-mono text-xs" /></div>
        <div className="flex items-center justify-between gap-3 border-t pt-4"><p className="text-[11px] text-stone-500">{codeLength.toLocaleString()} characters changed · maximum 20,000 per snippet</p><Button onClick={save} disabled={savingSeo || Object.keys(draft).length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="mr-1.5 h-4 w-4" />Save SEO &amp; integrations</Button></div>
      </CardContent>
    </Card>
  </div>
}

function WebsiteAndDomainSection({
  settings,
  saveSettings,
}: {
  settings: Record<string, any>
  saveSettings: (updated: Record<string, any>) => Promise<void>
}) {
  const [domainInput, setDomainInput] = useState(settings.custom_domain || "")
  const [logoUrl, setLogoUrl] = useState(settings.website_logo_url || "")
  const [faviconUrl, setFaviconUrl] = useState(settings.website_favicon_url || "")
  const [primaryColor, setPrimaryColor] = useState(settings.website_primary_color || "#0d9488")
  const [title, setTitle] = useState(settings.website_title || "")
  const [description, setDescription] = useState(settings.website_description || "")

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [verifyingDomain, setVerifyingDomain] = useState(false)
  const [domainResult, setDomainResult] = useState<any>(null)

  useEffect(() => {
    setDomainInput(settings.custom_domain || "")
    setLogoUrl(settings.website_logo_url || "")
    setFaviconUrl(settings.website_favicon_url || "")
    setPrimaryColor(settings.website_primary_color || "#0d9488")
    setTitle(settings.website_title || "")
    setDescription(settings.website_description || "")
  }, [settings])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/media/upload", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Upload failed"); return }
      setLogoUrl(data.url)
      await saveSettings({ website_logo_url: data.url })
      toast.success("Website logo updated")
    } catch {
      toast.error("Could not upload logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFavicon(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/media/upload", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Upload failed"); return }
      setFaviconUrl(data.url)
      await saveSettings({ website_favicon_url: data.url })
      toast.success("Favicon updated")
    } catch {
      toast.error("Could not upload favicon")
    } finally {
      setUploadingFavicon(false)
    }
  }

  const handleVerifyDomain = async () => {
    if (!domainInput) { toast.error("Enter a domain first"); return }
    setVerifyingDomain(true)
    setDomainResult(null)
    try {
      const res = await fetch("/api/settings/verify-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput }),
      })
      const data = await res.json()
      setDomainResult(data)
      if (data.verified) {
        toast.success(data.message)
      } else {
        toast.error(data.message || data.error || "DNS Verification failed")
      }
    } catch {
      toast.error("Failed to check DNS")
    } finally {
      setVerifyingDomain(false)
    }
  }

  const handleSaveDomain = async () => {
    await saveSettings({ custom_domain: domainInput })
    toast.success("Custom domain saved")
  }

  const shopUrl = settings.custom_domain
    ? `https://${settings.custom_domain}`
    : `https://app.fizmoh.cloud/shop/${settings.workspace_slug || ""}`

  return (
    <div className="space-y-6">
      {/* Custom Domain Card */}
      <Card>
        <CardHeader className="border-b bg-stone-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-teal-600" />
              <div>
                <CardTitle className="text-base">Custom Domain Connection</CardTitle>
                <p className="text-xs text-stone-500">Connect your own domain name (e.g. tours.omanadventures.com)</p>
              </div>
            </div>
            {settings.custom_domain ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Domain Saved
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Default Subdomain
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div>
            <Label className="text-xs font-medium text-stone-700">Your Custom Domain</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                value={domainInput}
                onChange={e => setDomainInput(e.target.value)}
                placeholder="e.g. tours.omanadventures.com"
                className="font-mono text-sm bg-white"
              />
              <Button onClick={handleSaveDomain} className="bg-stone-900 hover:bg-stone-800 text-white shrink-0">
                Save Domain
              </Button>
              <Button onClick={handleVerifyDomain} disabled={verifyingDomain} variant="outline" className="shrink-0 gap-1.5">
                {verifyingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 text-stone-500" />}
                Test DNS
              </Button>
            </div>
          </div>

          {domainResult && (
            <div className={`p-4 rounded-xl border text-xs space-y-1 ${domainResult.verified ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
              <div className="font-semibold flex items-center gap-1.5">
                {domainResult.verified ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                {domainResult.verified ? "DNS Connection Verified!" : "DNS Records Not Pointed Yet"}
              </div>
              <p>{domainResult.message}</p>
            </div>
          )}

          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3 text-xs">
            <h4 className="font-semibold text-stone-800">DNS Setup Instructions for your Domain Registrar (Cloudflare, GoDaddy, Namecheap):</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
              <div className="p-3 bg-white border rounded-lg">
                <span className="text-[10px] text-stone-400 font-sans block font-semibold uppercase">Option A: CNAME Record (Recommended)</span>
                <div className="mt-1"><span className="text-stone-500">Host / Name:</span> tours (or @)</div>
                <div><span className="text-stone-500">Target / Value:</span> cname.fizmoh.cloud</div>
              </div>
              <div className="p-3 bg-white border rounded-lg">
                <span className="text-[10px] text-stone-400 font-sans block font-semibold uppercase">Option B: A Record</span>
                <div className="mt-1"><span className="text-stone-500">Host / Name:</span> @ (or subdomain)</div>
                <div><span className="text-stone-500">IP Address:</span> 187.127.119.207</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Website Branding & Colors Card */}
      <Card>
        <CardHeader className="border-b bg-stone-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-teal-600" />
              <div>
                <CardTitle className="text-base">Website Branding & Design</CardTitle>
                <p className="text-xs text-stone-500">Customize your storefront logo, colors, and header information</p>
              </div>
            </div>
            <a href={shopUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <ExternalLink className="h-3.5 w-3.5" /> View Live Storefront
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-stone-700">Website Logo</Label>
              <div className="flex items-center gap-4 p-3 border rounded-xl bg-stone-50">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-lg object-cover border bg-white" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-stone-200 grid place-items-center text-stone-500 text-xs font-bold">No Logo</div>
                )}
                <div className="space-y-1.5 flex-1">
                  <Input
                    value={logoUrl}
                    onChange={e => { setLogoUrl(e.target.value); saveSettings({ website_logo_url: e.target.value }) }}
                    placeholder="https://... or upload image"
                    className="text-xs bg-white font-mono"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white text-xs font-medium text-stone-700 cursor-pointer hover:bg-stone-50">
                    {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 text-stone-500" />}
                    Upload Logo File
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-stone-700">Favicon Icon</Label>
              <div className="flex items-center gap-4 p-3 border rounded-xl bg-stone-50">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Favicon" className="h-10 w-10 rounded object-contain border bg-white p-1" />
                ) : (
                  <div className="h-10 w-10 rounded bg-stone-200 grid place-items-center text-stone-500 text-xs font-bold">16x16</div>
                )}
                <div className="space-y-1.5 flex-1">
                  <Input
                    value={faviconUrl}
                    onChange={e => { setFaviconUrl(e.target.value); saveSettings({ website_favicon_url: e.target.value }) }}
                    placeholder="https://... favicon URL"
                    className="text-xs bg-white font-mono"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white text-xs font-medium text-stone-700 cursor-pointer hover:bg-stone-50">
                    {uploadingFavicon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 text-stone-500" />}
                    Upload Favicon File
                    <input type="file" accept="image/*" className="hidden" onChange={handleFaviconUpload} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-stone-700">Primary Accent Color</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  onBlur={e => saveSettings({ website_primary_color: e.target.value })}
                  className="h-10 w-12 rounded border cursor-pointer p-0.5 bg-white"
                />
                <Input
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  onBlur={e => saveSettings({ website_primary_color: e.target.value })}
                  className="font-mono text-xs uppercase bg-white w-36"
                />
                <div className="h-9 px-4 rounded-lg flex items-center text-white font-medium text-xs shadow-sm" style={{ backgroundColor: primaryColor }}>
                  Button Preview
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Website Information & Headline</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-stone-700">Website Hero Title / Headline</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={e => saveSettings({ website_title: e.target.value })}
                  placeholder="e.g. Oman Adventures — Desert Safaris & Tours"
                  className="mt-1 bg-white text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-stone-700">Website Description / Subtitle</Label>
                <Input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={e => saveSettings({ website_description: e.target.value })}
                  placeholder="e.g. Book luxury desert tours and dolphin cruises on WhatsApp"
                  className="mt-1 bg-white text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
