"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  MessageSquare, Sparkles, Check, Copy, ExternalLink, RefreshCw,
  Palette, Globe, ShieldCheck, Smartphone, Send, Bot, User,
  SlidersHorizontal, Code2, CheckCircle2, ChevronRight,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

const COLOR_PRESETS = [
  { name: "Fizmoh Emerald", color: "#00E785" },
  { name: "Ocean Teal", color: "#0d9488" },
  { name: "Sky Blue", color: "#0284c7" },
  { name: "Royal Indigo", color: "#4f46e5" },
  { name: "Purple Violet", color: "#8b5cf6" },
  { name: "Vibrant Orange", color: "#f97316" },
  { name: "Sleek Dark", color: "#0f172a" },
]

export default function LiveChatWidgetView() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState("appearance")
  const [previewTab, setPreviewTab] = useState<"chat" | "whatsapp">("chat")
  const [previewOpen, setPreviewOpen] = useState(true)
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop")

  const [config, setConfig] = useState({
    id: "",
    name: "Website Chat Widget",
    enabled: true,
    primaryColor: "#00E785",
    position: "bottom-right",
    headerTitle: "Customer Support",
    headerSubtitle: "Typically replies in under 5 minutes",
    agentName: "Sarah - Support Team",
    agentRole: "Customer Care Specialist",
    avatarUrl: "",
    welcomeMessage: "Hi there! 👋 How can we help you today?",
    proactivePrompt: "Need help? Chat with our team!",
    proactiveDelay: 5,
    whatsappEnabled: true,
    whatsappNumber: "+96890000000",
    whatsappMessage: "Hello! I have a question about your services.",
    webChatEnabled: true,
    requireLeadForm: true,
    requirePhone: false,
    enableAiAgent: true,
    enableSmartReplies: true,
  })

  const [stats, setStats] = useState({ totalSessions: 0, openSessions: 0 })
  const [embedSnippet, setEmbedSnippet] = useState("")

  useEffect(() => {
    loadWidget()
  }, [])

  async function loadWidget() {
    setLoading(true)
    try {
      const res = await fetch("/api/live-chat/widget")
      if (res.ok) {
        const data = await res.json()
        if (data.widget) {
          setConfig(prev => ({
            ...prev,
            ...data.widget,
            agentName: data.widget.agentName || "Sarah - Support Team",
            agentRole: data.widget.agentRole || "Customer Care Specialist",
          }))
        }
        if (data.stats) setStats(data.stats)
        if (data.embedSnippet) setEmbedSnippet(data.embedSnippet)
      }
    } catch (err) {
      toast.error("Failed to load live chat settings")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/live-chat/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.widget) {
          setConfig(prev => ({ ...prev, ...data.widget }))
        }
        toast.success("Widget configuration saved successfully!")
      } else {
        toast.error("Failed to update widget settings")
      }
    } catch (err) {
      toast.error("Network error while saving settings")
    } finally {
      setSaving(false)
    }
  }

  function copyCode() {
    if (!embedSnippet) return
    navigator.clipboard.writeText(embedSnippet)
    setCopied(true)
    toast.success("Embed script copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-stone-900">Website Live Chat & WhatsApp Widget</h1>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  Addon Active
                </Badge>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Embed a dual-mode live chat and WhatsApp trigger on your website with AI smart auto-replies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyCode} className="gap-1.5 text-xs h-9">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>Copy Embed Code</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-9 shadow-xs"
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            <span>Save Settings</span>
          </Button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-white border-stone-200/80 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-medium text-stone-500">Live Chat Sessions</span>
            <div className="text-2xl font-bold text-stone-900 mt-1">{stats.totalSessions}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-stone-200/80 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-medium text-stone-500">Open Handover Requests</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.openSessions}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-stone-200/80 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-medium text-stone-500">AI Smart Reply Status</span>
            <div className="text-sm font-bold text-amber-600 mt-2 flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              <span>Grounded & Active</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-stone-200/80 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-medium text-stone-500">Channels Enabled</span>
            <div className="text-xs font-semibold text-stone-800 mt-2 flex items-center gap-1.5">
              {config.whatsappEnabled && <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700">WhatsApp</Badge>}
              {config.webChatEnabled && <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">Web Chat</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Settings Tabs */}
        <div className="lg:col-span-7 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white border border-stone-200 p-1 w-full justify-start overflow-x-auto">
              <TabsTrigger value="appearance" className="text-xs font-semibold">Branding & Agent</TabsTrigger>
              <TabsTrigger value="whatsapp" className="text-xs font-semibold">WhatsApp Settings</TabsTrigger>
              <TabsTrigger value="livechat" className="text-xs font-semibold">Live Chat & AI</TabsTrigger>
              <TabsTrigger value="installation" className="text-xs font-semibold">Embed Code</TabsTrigger>
            </TabsList>

            {/* TAB 1: Branding & Agent */}
            <TabsContent value="appearance" className="space-y-4 mt-4">
              <Card className="bg-white border-stone-200/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Branding & Agent Identity</CardTitle>
                  <CardDescription className="text-xs">Customize the live chat agent name, titles, and colors.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-stone-700">Agent Display Name</label>
                      <Input
                        value={config.agentName}
                        onChange={e => setConfig({ ...config, agentName: e.target.value })}
                        placeholder="e.g. Sarah - Support Team"
                        className="mt-1 text-xs"
                      />
                      <span className="text-[10px] text-stone-400">Shown to visitors as the support agent</span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-700">Agent Role / Title</label>
                      <Input
                        value={config.agentRole}
                        onChange={e => setConfig({ ...config, agentRole: e.target.value })}
                        placeholder="e.g. Customer Care Specialist"
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-stone-700">Header Title</label>
                      <Input
                        value={config.headerTitle}
                        onChange={e => setConfig({ ...config, headerTitle: e.target.value })}
                        placeholder="e.g. Customer Support"
                        className="mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-700">Header Subtitle</label>
                      <Input
                        value={config.headerSubtitle}
                        onChange={e => setConfig({ ...config, headerSubtitle: e.target.value })}
                        placeholder="e.g. Typically replies in under 5 minutes"
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700">Theme Color</label>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <Input
                        type="color"
                        value={config.primaryColor}
                        onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                        className="h-9 w-14 p-1 cursor-pointer"
                      />
                      {COLOR_PRESETS.map(preset => (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => setConfig({ ...config, primaryColor: preset.color })}
                          className={`h-7 px-2.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                            config.primaryColor.toLowerCase() === preset.color.toLowerCase()
                              ? "border-stone-900 bg-stone-100 font-bold"
                              : "border-stone-200 hover:bg-stone-50"
                          }`}
                        >
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.color }} />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-stone-700">Widget Screen Position</label>
                      <select
                        value={config.position}
                        onChange={e => setConfig({ ...config, position: e.target.value })}
                        className="mt-1 w-full text-xs h-9 rounded-md border border-stone-200 bg-white px-3"
                      >
                        <option value="bottom-right">Bottom Right (Recommended)</option>
                        <option value="bottom-left">Bottom Left</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-700">Proactive Bubble Delay (Seconds)</label>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        value={config.proactiveDelay}
                        onChange={e => setConfig({ ...config, proactiveDelay: parseInt(e.target.value) || 5 })}
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700">Proactive Welcome Prompt</label>
                    <Input
                      value={config.proactivePrompt || ""}
                      onChange={e => setConfig({ ...config, proactivePrompt: e.target.value })}
                      placeholder="e.g. Need help? Chat with our team!"
                      className="mt-1 text-xs"
                    />
                    <span className="text-[10px] text-stone-400">Pops up automatically above the floating button</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700">Default Welcome Message</label>
                    <Textarea
                      rows={2}
                      value={config.welcomeMessage}
                      onChange={e => setConfig({ ...config, welcomeMessage: e.target.value })}
                      placeholder="Greeting sent when a visitor opens live chat"
                      className="mt-1 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: WhatsApp Channel */}
            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <Card className="bg-white border-stone-200/80">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">WhatsApp Click-to-Chat</CardTitle>
                      <CardDescription className="text-xs">Direct visitors to WhatsApp with one click</CardDescription>
                    </div>
                    <Switch
                      checked={config.whatsappEnabled}
                      onCheckedChange={v => setConfig({ ...config, whatsappEnabled: v })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-stone-700">WhatsApp Business Number</label>
                    <Input
                      value={config.whatsappNumber || ""}
                      onChange={e => setConfig({ ...config, whatsappNumber: e.target.value })}
                      placeholder="e.g. +96890000000 or +971501234567"
                      className="mt-1 text-xs"
                    />
                    <span className="text-[10px] text-stone-400">Include country code with no spaces or symbols</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-700">Pre-filled Inbound Message</label>
                    <Textarea
                      rows={3}
                      value={config.whatsappMessage || ""}
                      onChange={e => setConfig({ ...config, whatsappMessage: e.target.value })}
                      placeholder="Default inquiry message filled into visitor's WhatsApp"
                      className="mt-1 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Web Live Chat & AI */}
            <TabsContent value="livechat" className="space-y-4 mt-4">
              <Card className="bg-white border-stone-200/80">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Web Live Chat & AI Automation</CardTitle>
                      <CardDescription className="text-xs">Interactive in-browser chat with lead forms and AI smart replies</CardDescription>
                    </div>
                    <Switch
                      checked={config.webChatEnabled}
                      onCheckedChange={v => setConfig({ ...config, webChatEnabled: v })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/60">
                    <div>
                      <div className="text-xs font-bold text-stone-800">Require Pre-Chat Lead Form</div>
                      <div className="text-[11px] text-stone-500">Ask visitor for name and email before chatting</div>
                    </div>
                    <Switch
                      checked={config.requireLeadForm}
                      onCheckedChange={v => setConfig({ ...config, requireLeadForm: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/60">
                    <div>
                      <div className="text-xs font-bold text-stone-800">Require Phone Number in Lead Form</div>
                      <div className="text-[11px] text-stone-500">Visitor must provide phone number as well</div>
                    </div>
                    <Switch
                      checked={config.requirePhone}
                      onCheckedChange={v => setConfig({ ...config, requirePhone: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                    <div>
                      <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        <span>AI Assistant Auto-Reply for Visitors</span>
                      </div>
                      <div className="text-[11px] text-emerald-700">Automatically answer visitor queries using your Knowledge Base</div>
                    </div>
                    <Switch
                      checked={config.enableAiAgent}
                      onCheckedChange={v => setConfig({ ...config, enableAiAgent: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/50">
                    <div>
                      <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        <span>AI Smart Reply Suggestions for Agents</span>
                      </div>
                      <div className="text-[11px] text-amber-700">Display 1-click suggested AI replies above the message composer in your Team Inbox</div>
                    </div>
                    <Switch
                      checked={config.enableSmartReplies}
                      onCheckedChange={v => setConfig({ ...config, enableSmartReplies: v })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: Embed Code */}
            <TabsContent value="installation" className="space-y-4 mt-4">
              <Card className="bg-white border-stone-200/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Website Installation Code</CardTitle>
                  <CardDescription className="text-xs">Paste this single line of code into your website template</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <pre className="p-4 rounded-xl bg-stone-900 text-stone-100 text-xs overflow-x-auto font-mono">
                      {embedSnippet || `<script src="https://app.fizmoh.cloud/widget.js" data-widget-id="${config.id}" async></script>`}
                    </pre>
                    <Button
                      size="sm"
                      onClick={copyCode}
                      className="absolute top-2.5 right-2.5 h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {copied ? "Copied!" : "Copy Code"}
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2 text-xs text-stone-700">
                    <div className="font-bold text-stone-900">Installation Guidelines:</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>WordPress / WooCommerce:</strong> Paste the script into your footer via <em>WPCode</em> or in your active theme's <code>footer.php</code> right before <code>&lt;/body&gt;</code>.</li>
                      <li><strong>Shopify:</strong> Open Online Store &gt; Themes &gt; Edit Code &gt; <code>theme.liquid</code>, and insert before <code>&lt;/body&gt;</code>.</li>
                      <li><strong>Webflow / Framer / Squarespace:</strong> Add to Site Settings &gt; Custom Code &gt; Footer Code.</li>
                      <li><strong>React / Next.js:</strong> Use Next.js <code>&lt;Script src="https://app.fizmoh.cloud/widget.js" data-widget-id="..." strategy="lazyOnload" /&gt;</code>.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Live Interactive Simulator / Preview */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">Live Preview Simulator</span>
            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg border border-stone-200">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${previewDevice === "desktop" ? "bg-white shadow-2xs text-stone-900" : "text-stone-500"}`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${previewDevice === "mobile" ? "bg-white shadow-2xs text-stone-900" : "text-stone-500"}`}
              >
                Mobile
              </button>
            </div>
          </div>

          {/* Device Mockup */}
          <div className="bg-stone-950 p-3 rounded-2xl shadow-xl flex justify-center">
            <div className={`relative bg-stone-100 overflow-hidden flex flex-col transition-all ${
              previewDevice === "mobile" ? "w-[320px] h-[520px] rounded-3xl border-4 border-stone-800" : "w-full h-[520px] rounded-xl border border-stone-800"
            }`}>
              {/* Mock site header */}
              <div className="h-8 bg-white border-b border-stone-200 px-3 flex items-center justify-between text-[10px] text-stone-400 select-none">
                <span className="font-bold text-stone-600">yourstore.com</span>
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-stone-300" />
                  <span className="h-2 w-2 rounded-full bg-stone-300" />
                  <span className="h-2 w-2 rounded-full bg-stone-300" />
                </span>
              </div>

              {/* Mock page content */}
              <div className="p-4 flex-1 text-center flex flex-col justify-center items-center text-stone-400 select-none">
                <Globe className="h-8 w-8 text-stone-300 mb-2" />
                <span className="text-xs font-semibold text-stone-500">Your Website Content</span>
                <span className="text-[10px]">The widget floats smoothly on top of your pages</span>
              </div>

              {/* Widget Window Mockup */}
              {previewOpen && (
                <div
                  className={`absolute z-20 bg-white shadow-2xl flex flex-col overflow-hidden transition-all ${
                    previewDevice === "mobile"
                      ? "inset-0 top-8 rounded-none"
                      : config.position === "bottom-left"
                      ? "bottom-16 left-3 w-[290px] h-[400px] rounded-xl border border-stone-200"
                      : "bottom-16 right-3 w-[290px] h-[400px] rounded-xl border border-stone-200"
                  }`}
                >
                  {/* Widget Header */}
                  <div
                    className="p-3.5 text-white flex items-center gap-2.5 relative"
                    style={{ background: `linear-gradient(135deg, ${config.primaryColor} 0%, #064e3b 100%)` }}
                  >
                    <div className="relative">
                      <div className="h-9 w-9 rounded-full bg-white text-stone-900 font-bold flex items-center justify-center text-xs shadow-xs">
                        {config.agentName ? config.agentName[0] : "S"}
                      </div>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate leading-tight">{config.headerTitle}</div>
                      <div className="text-[10px] opacity-90 truncate leading-tight font-medium">
                        {config.agentName} • {config.agentRole}
                      </div>
                      <div className="text-[9px] opacity-75 truncate leading-tight">{config.headerSubtitle}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(false)}
                      className="h-6 w-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-[10px] text-white"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Channel Switcher */}
                  {config.webChatEnabled && config.whatsappEnabled && (
                    <div className="flex bg-stone-50 border-b border-stone-200 p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewTab("chat")}
                        className={`flex-1 text-[10px] font-semibold py-1 rounded transition-all ${previewTab === "chat" ? "bg-white shadow-2xs text-stone-900" : "text-stone-500"}`}
                      >
                        💬 Web Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab("whatsapp")}
                        className={`flex-1 text-[10px] font-semibold py-1 rounded flex items-center justify-center gap-1 transition-all ${previewTab === "whatsapp" ? "bg-white shadow-2xs text-stone-900" : "text-stone-500"}`}
                      >
                        <WhatsAppIcon className="h-2.5 w-2.5 text-green-500" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="flex-1 bg-stone-50/50 p-3 overflow-y-auto flex flex-col justify-between">
                    {previewTab === "whatsapp" ? (
                      <div className="flex flex-col items-center justify-center text-center p-2 my-auto space-y-2">
                        <div className="h-10 w-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm">
                          <WhatsAppIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-xs font-bold text-stone-800">Chat on WhatsApp</div>
                        <div className="text-[10px] text-stone-500">{config.whatsappMessage}</div>
                        <Button size="sm" className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-[11px] h-8 mt-2 shadow-xs">
                          Start WhatsApp Chat ➔
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 text-[11px]">
                          <div className="bg-white border border-stone-200 p-2 rounded-xl rounded-bl-xs text-stone-800 shadow-2xs max-w-[85%]">
                            <span className="text-[9px] font-bold text-emerald-700 block mb-0.5">{config.agentName}</span>
                            {config.welcomeMessage}
                          </div>
                          <div className="bg-emerald-600 text-white p-2 rounded-xl rounded-br-xs self-end ml-auto max-w-[85%] shadow-2xs">
                            Hi, what are your delivery options?
                          </div>
                          {config.enableAiAgent && (
                            <div className="bg-white border border-stone-200 p-2 rounded-xl rounded-bl-xs text-stone-800 shadow-2xs max-w-[85%]">
                              <span className="text-[9px] font-bold text-amber-600 block mb-0.5">🤖 AI Assistant</span>
                              We provide express shipping across the country within 24 hours!
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 pt-2 border-t border-stone-200/80">
                          <Input
                            placeholder="Type a message..."
                            disabled
                            className="h-7 text-[10px] bg-white border-stone-200"
                          />
                          <Button size="sm" className="h-7 w-7 p-0 bg-emerald-600 text-white shrink-0">
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Floating Trigger Button Mockup */}
              <div
                onClick={() => setPreviewOpen(!previewOpen)}
                className={`absolute z-10 h-11 w-11 rounded-full text-white shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
                  config.position === "bottom-left" ? "bottom-3 left-3" : "bottom-3 right-3"
                }`}
                style={{ backgroundColor: config.primaryColor }}
              >
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
