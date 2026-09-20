"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ShoppingBag,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Users,
  Check,
  PackageCheck,
  Truck,
  RotateCcw,
  Mail,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

export default function EcommerceSettingsView() {
  const [stores, setStores] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([])
  const [cartStats, setCartStats] = useState<any>({})
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [addStoreOpen, setAddStoreOpen] = useState(false)
  const [newStoreName, setNewStoreName] = useState("")
  const [newStorePlatform, setNewStorePlatform] = useState("WOOCOMMERCE")
  const [newStoreUrl, setNewStoreUrl] = useState("")
  const [creatingStore, setCreatingStore] = useState(false)

  // Test send state
  const [testPhone, setTestPhone] = useState("")
  const [testingEvent, setTestingEvent] = useState<string | null>(null)
  const [testingLoading, setTestingLoading] = useState(false)

  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [storesRes, templatesRes, cartsRes, subsRes] = await Promise.all([
        fetch("/api/ecommerce/stores").then(r => r.json()),
        fetch("/api/ecommerce/templates").then(r => r.json()),
        fetch("/api/ecommerce/cart-abandoned").then(r => r.json()),
        fetch("/api/ecommerce/newsletter").then(r => r.json()),
      ])

      if (storesRes.stores) setStores(storesRes.stores)
      if (templatesRes.templates) setTemplates(templatesRes.templates)
      if (cartsRes.carts) {
        setAbandonedCarts(cartsRes.carts)
        setCartStats(cartsRes.stats || {})
      }
      if (subsRes.subscribers) setSubscribers(subsRes.subscribers)
    } catch (err) {
      console.error("Error loading e-commerce data:", err)
      toast.error("Failed to load e-commerce settings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) {
      toast.error("Store name is required")
      return
    }
    setCreatingStore(true)
    try {
      const res = await fetch("/api/ecommerce/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStoreName,
          platform: newStorePlatform,
          storeUrl: newStoreUrl,
        }),
      }).then(r => r.json())

      if (res.success) {
        toast.success(`Store "${newStoreName}" connected successfully!`)
        setAddStoreOpen(false)
        setNewStoreName("")
        setNewStoreUrl("")
        loadData()
      } else {
        toast.error(res.error || "Failed to create store")
      }
    } catch {
      toast.error("Network error creating store")
    } finally {
      setCreatingStore(false)
    }
  }

  const handleDeleteStore = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) return
    try {
      const res = await fetch(`/api/ecommerce/stores?id=${id}`, { method: "DELETE" }).then(r => r.json())
      if (res.success) {
        toast.success("Store disconnected")
        loadData()
      }
    } catch {
      toast.error("Error disconnecting store")
    }
  }

  const handleToggleDefault = async (eventType: string, useDefault: boolean) => {
    try {
      const res = await fetch("/api/ecommerce/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          useDefaultTemplate: useDefault,
        }),
      }).then(r => r.json())

      if (res.success) {
        toast.success(useDefault ? "Default template with buttons enabled" : "Custom template mapping enabled")
        setTemplates(prev =>
          prev.map(t => (t.eventType === eventType ? { ...t, useDefaultTemplate: useDefault } : t))
        )
      }
    } catch {
      toast.error("Failed to update template setting")
    }
  }

  const handleSaveCustomTemplate = async (eventType: string, customName: string, customLang: string) => {
    try {
      const res = await fetch("/api/ecommerce/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          useDefaultTemplate: false,
          customTemplateName: customName,
          customTemplateLang: customLang,
        }),
      }).then(r => r.json())

      if (res.success) {
        toast.success("Custom template saved")
        loadData()
      }
    } catch {
      toast.error("Error saving custom template")
    }
  }

  const handleSendTestMessage = async (eventType: string) => {
    if (!testPhone.trim()) {
      toast.error("Enter a recipient WhatsApp phone number first")
      return
    }
    setTestingEvent(eventType)
    setTestingLoading(true)
    try {
      const res = await fetch("/api/ecommerce/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          testPhone,
        }),
      }).then(r => r.json())

      if (res.success) {
        toast.success("Test notification sent! Check WhatsApp.")
      } else {
        toast.error(res.error || "Failed to send test message")
      }
    } catch {
      toast.error("Network error sending test message")
    } finally {
      setTestingLoading(false)
      setTestingEvent(null)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">E-Commerce Automation</h1>
              <p className="text-sm text-muted-foreground">
                WooCommerce & Shopify order updates, automated abandoned cart recovery, and WhatsApp templates with interactive buttons.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/ecommerce/plugin/download"
            download="fizmoh-connect-for-woocommerce.zip"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download WooCommerce Plugin (.zip)
          </a>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full md:w-[600px]">
          <TabsTrigger value="templates">Templates & Buttons</TabsTrigger>
          <TabsTrigger value="stores">Connected Stores</TabsTrigger>
          <TabsTrigger value="abandoned">Abandoned Carts</TabsTrigger>
          <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
        </TabsList>

        {/* TAB 1: TEMPLATES & BUTTONS */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-emerald-900 dark:text-emerald-300">
                    Default Interactive Templates (With Action Buttons)
                  </h4>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    By default, Fizmoh automatically sends high-converting WhatsApp messages equipped with interactive URL buttons (e.g. <b>[Track My Order]</b>, <b>[Complete My Order]</b>, <b>[Claim 10% Off]</b>). You can switch to custom Meta-approved templates anytime.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  placeholder="Test Phone (+968...)"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  className="w-44 bg-white dark:bg-background text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map(tpl => {
              const isDefault = tpl.useDefaultTemplate !== false
              const isTesting = testingLoading && testingEvent === tpl.eventType

              return (
                <Card key={tpl.eventType} className="border flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {tpl.eventType.includes("ORDER") && <PackageCheck className="w-4 h-4 text-blue-500" />}
                        {tpl.eventType.includes("SHIPPED") && <Truck className="w-4 h-4 text-amber-500" />}
                        {tpl.eventType.includes("CART") && <ShoppingBag className="w-4 h-4 text-emerald-500" />}
                        {tpl.eventType.includes("NEWSLETTER") && <Mail className="w-4 h-4 text-purple-500" />}
                        <CardTitle className="text-base">{tpl.title}</CardTitle>
                      </div>
                      <Badge variant={isDefault ? "default" : "secondary"} className={isDefault ? "bg-emerald-600" : ""}>
                        {isDefault ? "Default (Interactive Buttons)" : "Custom Meta Template"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs line-clamp-1">{tpl.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Live WhatsApp Bubble Preview */}
                    <div className="bg-[#EFEAE2] dark:bg-neutral-900 rounded-xl p-3.5 border border-neutral-300 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-sans shadow-inner">
                      <div className="bg-white dark:bg-neutral-800 rounded-lg p-3 shadow-sm space-y-2 relative">
                        {tpl.defaultHeader && (
                          <div className="font-bold text-neutral-900 dark:text-neutral-100 text-xs border-b pb-1">
                            {tpl.defaultHeader}
                          </div>
                        )}
                        <p className="whitespace-pre-line leading-relaxed text-[11px] text-neutral-700 dark:text-neutral-300">
                          {tpl.defaultBody
                            .replace("{{name}}", "Ahmed")
                            .replace("{{order_number}}", "WC-1042")
                            .replace("{{store_name}}", "Al-Fizmoh Store")
                            .replace("{{total}}", "35.50")
                            .replace("{{currency}}", "OMR")
                            .replace("{{item_count}}", "2")
                            .replace("{{carrier}}", "Oman Post")
                            .replace("{{tracking_number}}", "OM982310")
                            .replace("{{coupon_code}}", "SAVE10")
                            .replace("{{welcome_coupon}}", "WELCOME15")}
                        </p>

                        {/* Interactive Buttons Preview */}
                        {isDefault && tpl.buttonType === "CTA_URL" && (
                          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-center">
                            <div className="w-full text-center py-1.5 px-3 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium text-[11px] border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center gap-1.5 cursor-pointer">
                              <ExternalLink className="w-3 h-3" />
                              {tpl.defaultButtonText}
                            </div>
                          </div>
                        )}

                        {isDefault && tpl.buttonType === "QUICK_REPLY" && (
                          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-center">
                            <div className="w-full text-center py-1.5 px-3 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium text-[11px] border flex items-center justify-center gap-1.5">
                              <MessageSquare className="w-3 h-3" />
                              {tpl.defaultButtonText}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-medium">Use Default with Buttons</Label>
                        <p className="text-[11px] text-muted-foreground">Pre-configured action buttons</p>
                      </div>
                      <Switch
                        checked={isDefault}
                        onCheckedChange={val => handleToggleDefault(tpl.eventType, val)}
                      />
                    </div>

                    {/* Custom Meta Template Mapping Fields (if enabled) */}
                    {!isDefault && (
                      <div className="pt-2 space-y-2 border-t">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px]">Meta Template Name</Label>
                            <Input
                              placeholder="e.g. order_update_v1"
                              defaultValue={tpl.customTemplateName || ""}
                              id={`custom-name-${tpl.eventType}`}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">Language Code</Label>
                            <Input
                              placeholder="en or ar"
                              defaultValue={tpl.customTemplateLang || "en"}
                              id={`custom-lang-${tpl.eventType}`}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full h-8 text-xs"
                          onClick={() => {
                            const name = (document.getElementById(`custom-name-${tpl.eventType}`) as HTMLInputElement)?.value
                            const lang = (document.getElementById(`custom-lang-${tpl.eventType}`) as HTMLInputElement)?.value
                            handleSaveCustomTemplate(tpl.eventType, name, lang)
                          }}
                        >
                          Save Custom Template Mapping
                        </Button>
                      </div>
                    )}

                    {/* Test Send Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs"
                      onClick={() => handleSendTestMessage(tpl.eventType)}
                      disabled={isTesting}
                    >
                      <Send className={`w-3.5 h-3.5 mr-1.5 ${isTesting ? "animate-spin" : ""}`} />
                      {isTesting ? "Sending to phone..." : "Send Test to My Phone"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* TAB 2: CONNECTED STORES */}
        <TabsContent value="stores" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Store Connections</h3>
              <p className="text-sm text-muted-foreground">
                Connect your WooCommerce, Shopify, or Custom E-commerce platforms.
              </p>
            </div>
            <Button onClick={() => setAddStoreOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Connect Store
            </Button>
          </div>

          {stores.length === 0 ? (
            <Card className="border-dashed p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-base">No store connected yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Connect your WooCommerce or Shopify store to start sending automated WhatsApp order confirmations and recovering abandoned carts.
                </p>
              </div>
              <Button onClick={() => setAddStoreOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                Connect Your First Store
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map(store => (
                <Card key={store.id} className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                          {store.platform === "WOOCOMMERCE" ? "WC" : "SH"}
                        </div>
                        <div>
                          <CardTitle className="text-base">{store.name}</CardTitle>
                          <span className="text-xs text-muted-foreground">{store.platform}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Store ID</Label>
                      <div className="font-mono bg-muted p-1.5 rounded flex items-center justify-between text-[11px]">
                        <span>{store.id}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(store.id, `store-${store.id}`)}
                        >
                          {copiedKey === `store-${store.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">Store API Key</Label>
                      <div className="font-mono bg-muted p-1.5 rounded flex items-center justify-between text-[11px]">
                        <span>{store.apiKey.slice(0, 14)}••••••••••••••••</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(store.apiKey, `key-${store.id}`)}
                        >
                          {copiedKey === `key-${store.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">Webhook URL</Label>
                      <div className="font-mono bg-muted p-1.5 rounded flex items-center justify-between text-[11px] truncate">
                        <span className="truncate">{store.platform === "SHOPIFY" ? store.shopifyWebhookUrl : store.webhookUrl}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() =>
                            copyToClipboard(
                              store.platform === "SHOPIFY" ? store.shopifyWebhookUrl : store.webhookUrl,
                              `wh-${store.id}`
                            )
                          }
                        >
                          {copiedKey === `wh-${store.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                      <span>Carts Tracked: {store.abandonedCartsCount || 0}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 h-7 px-2 text-xs"
                        onClick={() => handleDeleteStore(store.id, store.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: ABANDONED CARTS */}
        <TabsContent value="abandoned" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Abandoned</p>
                  <p className="text-2xl font-bold">{cartStats.totalTracked || 0}</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-neutral-400" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Recovered via WhatsApp</p>
                  <p className="text-2xl font-bold text-emerald-600">{cartStats.recovered || 0}</p>
                </div>
                <PackageCheck className="w-8 h-8 text-emerald-500" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Conversion Recovery Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{cartStats.recoveryRate || "0%"}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Captured Abandoned Checkouts</CardTitle>
              <CardDescription className="text-xs">
                Real-time checkout records captured via pre-submit field tracking on your store.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {abandonedCarts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No abandoned carts captured yet. Carts will automatically populate here as visitors type in your checkout page.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="p-2.5">Customer</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Cart Total</th>
                        <th className="p-2.5">Stage</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {abandonedCarts.map(c => (
                        <tr key={c.id}>
                          <td className="p-2.5 font-medium">{c.customerName || "Customer"}</td>
                          <td className="p-2.5 font-mono">{c.customerPhone}</td>
                          <td className="p-2.5 font-semibold">
                            {c.cartTotal} {c.currency}
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline">
                              {c.recoveryStage === 0
                                ? "Captured"
                                : c.recoveryStage === 1
                                ? "Stage 1 (15m)"
                                : c.recoveryStage === 2
                                ? "Stage 2 (4h)"
                                : "Stage 3 (24h)"}
                            </Badge>
                          </td>
                          <td className="p-2.5">
                            <Badge className={c.status === "RECOVERED" ? "bg-emerald-600" : "bg-amber-600"}>
                              {c.status}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-muted-foreground">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: NEWSLETTER */}
        <TabsContent value="newsletter" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">WhatsApp Newsletter Subscribers</CardTitle>
              <CardDescription className="text-xs">
                Customers who opted in to receive WhatsApp updates during checkout or through your store newsletter widget.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscribers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No subscribers captured yet. Subscribers will appear here when customers check the WhatsApp Opt-In box during checkout.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">Source</th>
                        <th className="p-2.5">Consent Given</th>
                        <th className="p-2.5">Welcome Sent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {subscribers.map(s => (
                        <tr key={s.id}>
                          <td className="p-2.5 font-medium">{s.name || "Subscriber"}</td>
                          <td className="p-2.5 font-mono">{s.phone}</td>
                          <td className="p-2.5">{s.email || "—"}</td>
                          <td className="p-2.5">
                            <Badge variant="outline">{s.source}</Badge>
                          </td>
                          <td className="p-2.5 text-emerald-600 font-medium">✓ Verified</td>
                          <td className="p-2.5">
                            {s.welcomeSent ? (
                              <Badge className="bg-emerald-600">Sent</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: ADD STORE */}
      <Dialog open={addStoreOpen} onOpenChange={setAddStoreOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Connect Online Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={newStorePlatform} onValueChange={setNewStorePlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WOOCOMMERCE">WooCommerce (WordPress Plugin)</SelectItem>
                  <SelectItem value="SHOPIFY">Shopify (Webhooks & App)</SelectItem>
                  <SelectItem value="CUSTOM">Custom Platform / REST API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input
                placeholder="e.g. My Perfume Store"
                value={newStoreName}
                onChange={e => setNewStoreName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Store URL</Label>
              <Input
                placeholder="https://mystore.com"
                value={newStoreUrl}
                onChange={e => setNewStoreUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStoreOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreateStore}
              disabled={creatingStore}
            >
              {creatingStore ? "Connecting..." : "Generate Pairing Keys"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
