"use client"

import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Megaphone,
  Users,
  FileText,
  Workflow,
  Globe,
  Plus,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Search,
  Filter,
  BarChart2,
  RefreshCw,
  Mail,
  ShieldCheck,
  TrendingUp,
  MousePointerClick,
  UserX,
  ExternalLink,
  Server,
  Key,
  Copy,
  Check,
  Trash2,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckSquare,
  FileCode,
  Sliders,
  Smartphone,
  Laptop,
  Shield,
  Play,
  Lock,
  Settings,
  Upload,
  Download,
  Tag,
  Layers,
  CheckCheck,
  ListFilter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useLanguage } from "@/context/language-context"

export type EmailMarketingTab =
  | "dashboard"
  | "campaigns"
  | "subscribers"
  | "templates"
  | "builder"
  | "automations"
  | "forms"
  | "analytics"
  | "domains"
  | "settings"

export default function EmailMarketingView() {
  const { isAr } = useLanguage()
  const [activeTab, setActiveTab] = useState<EmailMarketingTab>("dashboard")

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleSyncFromUrl = () => {
      const url = new URL(window.location.href)
      const tabParam = url.searchParams.get("tab") as EmailMarketingTab | null
      if (tabParam && ["dashboard", "campaigns", "subscribers", "templates", "builder", "automations", "forms", "analytics", "domains", "settings"].includes(tabParam)) {
        setActiveTab(tabParam)
      }
    }

    const handleCustomTab = (e: any) => {
      if (e?.detail && ["dashboard", "campaigns", "subscribers", "templates", "builder", "automations", "forms", "analytics", "domains", "settings"].includes(e.detail)) {
        setActiveTab(e.detail as EmailMarketingTab)
      }
    }

    handleSyncFromUrl()
    window.addEventListener("popstate", handleSyncFromUrl)
    window.addEventListener("fizmoh:email-tab", handleCustomTab)
    return () => {
      window.removeEventListener("popstate", handleSyncFromUrl)
      window.removeEventListener("fizmoh:email-tab", handleCustomTab)
    }
  }, [])

  const switchTab = (tab: EmailMarketingTab) => {
    setActiveTab(tab)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", tab)
      window.history.pushState({ tab }, "", url.toString())
    }
  }
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [domains, setDomains] = useState<any[]>([])

  // SMTP state
  const [smtpConfig, setSmtpConfig] = useState<any>({
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_password: "",
    smtp_from: "",
    smtp_from_name: "",
  })
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpTestRecipient, setSmtpTestRecipient] = useState("")
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null)
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null)

  // Modal states
  const [newCampaignModal, setNewCampaignModal] = useState(false)
  const [newSubModal, setNewSubModal] = useState(false)
  const [newDomainModal, setNewDomainModal] = useState(false)
  const [newSmtpModal, setNewSmtpModal] = useState(false)
  const [domainGuideModal, setDomainGuideModal] = useState(false)
  const [newTemplateModal, setNewTemplateModal] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null)

  // Form states
  const [campName, setCampName] = useState("")
  const [campSubject, setCampSubject] = useState("")
  const [campSenderEmail, setCampSenderEmail] = useState("info@fizmoh.cloud")
  const [campSenderName, setCampSenderName] = useState("Fizmoh Marketing")
  const [subEmail, setSubEmail] = useState("")
  const [subName, setSubName] = useState("")
  const [domainName, setDomainName] = useState("")
  const [testEmailAddress, setTestEmailAddress] = useState("")
  const [selectedCampaignForTest, setSelectedCampaignForTest] = useState<string | null>(null)

  // Template Form states
  const [tplName, setTplName] = useState("")
  const [tplCategory, setTplCategory] = useState("PROMOTION")
  const [tplHtml, setTplHtml] = useState("")
  const [tplSaving, setTplSaving] = useState(false)

  // Interactive Live Studio State
  const [builderHeadline, setBuilderHeadline] = useState("Exclusive Offer Just For You ✨")
  const [builderBody, setBuilderBody] = useState("Discover our latest collection curated specially for our valued clients. Limited time availability.")
  const [builderCtaText, setBuilderCtaText] = useState("Claim Offer Now")
  const [builderCtaUrl, setBuilderCtaUrl] = useState("https://app.fizmoh.cloud")
  const [builderPrimaryColor, setBuilderPrimaryColor] = useState("#059669")
  const [builderPreviewDevice, setBuilderPreviewDevice] = useState<"desktop" | "mobile">("desktop")
  const [builderAiPrompt, setBuilderAiPrompt] = useState("")
  const [builderAiGenerating, setBuilderAiGenerating] = useState(false)

  const [lists, setLists] = useState<any[]>([])
  const [segments, setSegments] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [suppressions, setSuppressions] = useState<any[]>([])
  const [formsList, setFormsList] = useState<any[]>([])
  const [automationsList, setAutomationsList] = useState<any[]>([])

  // Subview for Subscribers Tab: "all" | "lists" | "segments" | "tags" | "suppression" | "import"
  const [subscriberSubTab, setSubscriberSubTab] = useState<"all" | "lists" | "segments" | "tags" | "suppression" | "import">("all")

  // Subview for Campaigns Tab: "all" | "drafts" | "scheduled" | "sent"
  const [campaignSubTab, setCampaignSubTab] = useState<"all" | "drafts" | "scheduled" | "sent">("all")

  // Multi-step Campaign Wizard state
  const [campaignWizardStep, setCampaignWizardStep] = useState<number>(1)
  const [wizardAudienceType, setWizardAudienceType] = useState<"ALL" | "LIST" | "SEGMENT">("ALL")
  const [wizardSelectedList, setWizardSelectedList] = useState<string>("")
  const [wizardSelectedSegment, setWizardSelectedSegment] = useState<string>("")
  const [wizardPreheader, setWizardPreheader] = useState<string>("")
  const [wizardHtml, setWizardHtml] = useState<string>("")
  const [wizardIsAbTest, setWizardIsAbTest] = useState<boolean>(false)
  const [wizardSubjectB, setWizardSubjectB] = useState<string>("")

  // CSV Import State
  const [csvRawText, setCsvRawText] = useState<string>("")
  const [csvImporting, setCsvImporting] = useState<boolean>(false)
  const [csvTargetList, setCsvTargetList] = useState<string>("")

  // New List / Segment / Tag Modal States
  const [newListModal, setNewListModal] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [newListDesc, setNewListDesc] = useState("")
  const [newSegmentModal, setNewSegmentModal] = useState(false)
  const [newSegmentName, setNewSegmentName] = useState("")
  const [newTagModal, setNewTagModal] = useState(false)
  const [newTagName, setNewTagName] = useState("")

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/v1/email/dashboard")
      if (res.ok) {
        const data = await res.json()
        setDashboardData(data)
      }
    } catch {
      // Handled
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/v1/email/campaigns")
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch {}
  }

  const fetchSubscribers = async () => {
    try {
      const res = await fetch("/api/v1/email/subscribers")
      if (res.ok) {
        const data = await res.json()
        setSubscribers(data.subscribers || [])
      }
    } catch {}
  }

  const fetchLists = async () => {
    try {
      const res = await fetch("/api/v1/email/lists")
      if (res.ok) {
        const data = await res.json()
        setLists(data.lists || [])
      }
    } catch {}
  }

  const fetchSegments = async () => {
    try {
      const res = await fetch("/api/v1/email/segments")
      if (res.ok) {
        const data = await res.json()
        setSegments(data.segments || [])
      }
    } catch {}
  }

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/v1/email/tags")
      if (res.ok) {
        const data = await res.json()
        setTags(data.tags || [])
      }
    } catch {}
  }

  const fetchSuppressions = async () => {
    try {
      const res = await fetch("/api/v1/email/suppression")
      if (res.ok) {
        const data = await res.json()
        setSuppressions(data.suppressions || [])
      }
    } catch {}
  }

  const fetchForms = async () => {
    try {
      const res = await fetch("/api/v1/email/forms")
      if (res.ok) {
        const data = await res.json()
        setFormsList(data.forms || [])
      }
    } catch {}
  }

  const fetchAutomations = async () => {
    try {
      const res = await fetch("/api/v1/email/automations")
      if (res.ok) {
        const data = await res.json()
        setAutomationsList(data.automations || [])
      }
    } catch {}
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/v1/email/templates")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
      }
    } catch {}
  }

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/v1/email/domains")
      if (res.ok) {
        const data = await res.json()
        setDomains(data.domains || [])
      }
    } catch {}
  }

  const fetchSmtp = async () => {
    try {
      const res = await fetch("/api/v1/email/smtp")
      if (res.ok) {
        const data = await res.json()
        if (data.config) {
          setSmtpConfig((prev: any) => ({
            ...prev,
            smtp_host: data.config.smtp_host || "",
            smtp_port: data.config.smtp_port || "587",
            smtp_user: data.config.smtp_user || "",
            smtp_from: data.config.smtp_from || "",
            smtp_from_name: data.config.smtp_from_name || "",
            smtp_password_configured: data.config.smtp_password_configured || false,
          }))
        }
      }
    } catch {}
  }

  useEffect(() => {
    fetchDashboard()
    fetchCampaigns()
    fetchSubscribers()
    fetchLists()
    fetchSegments()
    fetchTags()
    fetchSuppressions()
    fetchForms()
    fetchAutomations()
    fetchTemplates()
    fetchDomains()
    fetchSmtp()
  }, [])

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSmtpSaving(true)
    try {
      const res = await fetch("/api/v1/email/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: smtpConfig.smtp_host,
          port: parseInt(smtpConfig.smtp_port || "587", 10),
          user: smtpConfig.smtp_user,
          password: smtpConfig.smtp_password,
          from: smtpConfig.smtp_from,
          fromName: smtpConfig.smtp_from_name,
        }),
      })
      if (res.ok) {
        toast.success(isAr ? "تم حفظ إعدادات خادم البريد (SMTP) بنجاح" : "SMTP outgoing mail server configuration saved!")
        setNewSmtpModal(false)
        fetchSmtp()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to save SMTP settings")
      }
    } catch {
      toast.error("Network error while saving SMTP")
    } finally {
      setSmtpSaving(false)
    }
  }

  const handleTestSmtp = async () => {
    if (!smtpTestRecipient || !smtpTestRecipient.includes("@")) {
      toast.error(isAr ? "يرجى كتابة بريد إلكتروني صالح للتجربة" : "Please enter a valid recipient email to receive the test")
      return
    }
    setSmtpTesting(true)
    try {
      const res = await fetch("/api/v1/email/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: smtpTestRecipient }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(isAr ? `تم إرسال بريد الاختبار بنجاح إلى ${smtpTestRecipient}` : `Test email successfully delivered to ${smtpTestRecipient}!`)
        setSmtpTestRecipient("")
      } else {
        toast.error(data.error || "SMTP delivery failed. Check credentials and port.")
      }
    } catch {
      toast.error("Network connection error")
    } finally {
      setSmtpTesting(false)
    }
  }

  const handleVerifyDomain = async (id: string, domainName: string) => {
    setVerifyingDomainId(id)
    try {
      const res = await fetch(`/api/v1/email/domains/${id}/verify`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        if (data.isVerified) {
          toast.success(isAr ? `تم التحقق من النطاق ${domainName} بنجاح!` : `Domain ${domainName} verified successfully! SPF and DKIM are active.`)
        } else {
          toast.info(
            isAr
              ? `سجلات DNS قيد الانتشار. SPF: ${data.spfStatus} | DKIM: ${data.dkimStatus}. يرجى الانتظار بضع دقائق والمحاولة مجدداً.`
              : `DNS records still propagating. SPF: ${data.spfStatus} | DKIM: ${data.dkimStatus}. May take 5–15 minutes.`
          )
        }
        fetchDomains()
      } else {
        toast.error(data.error || "Domain verification request failed")
      }
    } catch {
      toast.error("Failed to query DNS")
    } finally {
      setVerifyingDomainId(null)
    }
  }

  const handleDeleteDomain = async (id: string, domainName: string) => {
    if (!confirm(isAr ? `هل أنت متأكد من حذف النطاق ${domainName}؟` : `Are you sure you want to remove domain ${domainName}?`)) return
    try {
      const res = await fetch(`/api/v1/email/domains/${id}/verify`, { method: "DELETE" })
      if (res.ok) {
        toast.success(isAr ? "تم حذف النطاق" : "Sender domain removed")
        fetchDomains()
      } else {
        toast.error("Failed to delete domain")
      }
    } catch {
      toast.error("Network error")
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedRecord(id)
    toast.success(isAr ? "تم نسخ السجل إلى الحافظة" : "Copied record to clipboard!")
    setTimeout(() => setCopiedRecord(null), 2000)
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tplName || !tplHtml) {
      toast.error(isAr ? "يرجى إدخال اسم القالب ومحتوى HTML" : "Template name and HTML content are required")
      return
    }
    setTplSaving(true)
    try {
      const res = await fetch("/api/v1/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tplName,
          category: tplCategory,
          htmlContent: tplHtml,
        }),
      })
      if (res.ok) {
        toast.success(isAr ? "تم حفظ القالب بنجاح" : "Template saved successfully!")
        setNewTemplateModal(false)
        setTplName("")
        setTplHtml("")
        fetchTemplates()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to create template")
      }
    } catch {
      toast.error("Network error while creating template")
    } finally {
      setTplSaving(false)
    }
  }

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/v1/email/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campName,
          subject: campSubject,
          senderEmail: campSenderEmail,
          senderName: campSenderName,
          htmlContent: `<h2>${campSubject}</h2><p>Exclusive update from our team.</p>`,
        }),
      })
      if (res.ok) {
        toast.success(isAr ? "تم إنشاء الحملة بنجاح" : "Campaign created successfully")
        setNewCampaignModal(false)
        setCampName("")
        setCampSubject("")
        fetchCampaigns()
        fetchDashboard()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to create campaign")
      }
    } catch {
      toast.error("Network error")
    }
  }

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/v1/email/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: subEmail,
          firstName: subName,
        }),
      })
      if (res.ok) {
        toast.success(isAr ? "تمت إضافة المشترك بنجاح" : "Subscriber added successfully")
        setNewSubModal(false)
        setSubEmail("")
        setSubName("")
        fetchSubscribers()
        fetchDashboard()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to add subscriber")
      }
    } catch {
      toast.error("Network error")
    }
  }

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/v1/email/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainName }),
      })
      if (res.ok) {
        toast.success(isAr ? "تم تسجيل النطاق وتوليد سجلات DNS" : "Domain added with DNS records")
        setNewDomainModal(false)
        setDomainName("")
        fetchDomains()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to add domain")
      }
    } catch {
      toast.error("Network error")
    }
  }

  const handleSendTest = async (campaignId: string) => {
    if (!testEmailAddress) {
      toast.error("Please enter a recipient email for testing")
      return
    }
    try {
      const res = await fetch(`/api/v1/email/campaigns/${campaignId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: testEmailAddress }),
      })
      if (res.ok) {
        toast.success(`Test email sent to ${testEmailAddress}`)
        setSelectedCampaignForTest(null)
        setTestEmailAddress("")
      } else {
        const err = await res.json()
        toast.error(err.error || "Test send failed")
      }
    } catch {
      toast.error("Network error")
    }
  }

  const handleSendLive = async (campaignId: string) => {
    if (!confirm("Are you sure you want to trigger live sending to all targeted subscribers?")) return
    try {
      const res = await fetch(`/api/v1/email/campaigns/${campaignId}/send`, {
        method: "POST",
      })
      if (res.ok) {
        toast.success(isAr ? "تم إرسال الحملة بنجاح" : "Campaign dispatched successfully")
        fetchCampaigns()
        fetchDashboard()
      } else {
        const err = await res.json()
        toast.error(err.error || "Sending failed")
      }
    } catch {
      toast.error("Network error")
    }
  }

  const metrics = dashboardData?.metrics || {
    totalSubscribers: 0,
    activeSubscribers: 0,
    totalSent: 0,
    deliveredCount: 0,
    deliveryRate: 100,
    uniqueOpens: 0,
    openRate: 0,
    uniqueClicks: 0,
    clickRate: 0,
  }

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900">
                {isAr ? "التسويق عبر البريد الإلكتروني" : "Advanced Email Marketing"}
              </h1>
              <p className="text-xs text-stone-500">
                {isAr
                  ? "إدارة الحملات، المشتركين، أداة بناء القوالب المرئية، وأتمتة رحلات العملاء"
                  : "Enterprise email campaigns, drag & drop visual builder, automated flows, and deliverability"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setTplName("")
              setTplCategory("PROMOTION")
              setTplHtml(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; }
    .title { color: #0f172a; font-size: 24px; font-weight: bold; margin-bottom: 16px; }
    .btn { display: inline-block; background: #059669; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1 class="title">Exclusive Announcement</h1>
    <p>Discover our latest collection crafted specially for our valued customers.</p>
    <p style="margin: 28px 0;"><a href="https://app.fizmoh.cloud" class="btn">Explore Now</a></p>
    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
    <p style="font-size: 11px; color: #64748b;">You received this email because you subscribed to updates. <a href="{{unsubscribe_url}}" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</body>
</html>`)
              setNewTemplateModal(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5"
          >
            <FileText className="h-4 w-4" />
            <span>{isAr ? "إنشاء قالب بريد" : "Create Email Template"}</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setNewCampaignModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? "حملة جديدة" : "New Campaign"}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setNewSubModal(true)}
            className="text-xs font-semibold gap-1.5"
          >
            <Users className="h-3.5 w-3.5 text-stone-500" />
            <span>{isAr ? "إضافة مشترك" : "Add Subscriber"}</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-stone-200 pb-2 overflow-x-auto text-sm">
        {[
          { id: "dashboard", labelEn: "Dashboard", labelAr: "لوحة التحكم", icon: LayoutDashboard },
          { id: "campaigns", labelEn: "Campaigns", labelAr: "الحملات", icon: Megaphone, count: campaigns.length },
          { id: "subscribers", labelEn: "Subscribers", labelAr: "المشتركون", icon: Users, count: subscribers.length },
          { id: "templates", labelEn: "Templates", labelAr: "القوالب", icon: FileText, count: templates.length },
          { id: "builder", labelEn: "Email Builder", labelAr: "أداة البناء والتصميم", icon: FileCode },
          { id: "automations", labelEn: "Automations", labelAr: "الأتمتة والرحلات", icon: Workflow },
          { id: "forms", labelEn: "Forms & Popups", labelAr: "نماذج الاشتراك", icon: CheckSquare },
          { id: "analytics", labelEn: "Analytics", labelAr: "التحليلات المتقدمة", icon: BarChart2 },
          { id: "domains", labelEn: "Domains & Senders", labelAr: "النطاقات والمصادقة", icon: Globe, count: domains.length },
          { id: "settings", labelEn: "Settings & Brand Kit", labelAr: "إعدادات الهوية والبريد", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id as EmailMarketingTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs transition-colors shrink-0 ${
                isActive
                  ? "bg-stone-900 text-white shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{isAr ? tab.labelAr : tab.labelEn}</span>
              {typeof tab.count === "number" && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs space-y-1">
              <div className="flex items-center justify-between text-stone-500 text-xs">
                <span>{isAr ? "المشتركون النشطون" : "Active Subscribers"}</span>
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-stone-900">{metrics.activeSubscribers}</div>
              <div className="text-[11px] text-stone-400">Total: {metrics.totalSubscribers}</div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs space-y-1">
              <div className="flex items-center justify-between text-stone-500 text-xs">
                <span>{isAr ? "رسائل تم إرسالها" : "Total Emails Sent"}</span>
                <Send className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-stone-900">{metrics.totalSent}</div>
              <div className="text-[11px] text-emerald-600 font-semibold">{metrics.deliveryRate}% Delivered</div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs space-y-1">
              <div className="flex items-center justify-between text-stone-500 text-xs">
                <span>{isAr ? "معدل الفتح الفريد" : "Unique Open Rate"}</span>
                <Eye className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-stone-900">{metrics.openRate}%</div>
              <div className="text-[11px] text-stone-400">{metrics.uniqueOpens} opens</div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs space-y-1">
              <div className="flex items-center justify-between text-stone-500 text-xs">
                <span>{isAr ? "معدل النقر (CTR)" : "Click-Through Rate"}</span>
                <MousePointerClick className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-stone-900">{metrics.clickRate}%</div>
              <div className="text-[11px] text-stone-400">{metrics.uniqueClicks} clicks</div>
            </div>
          </div>

          {/* Recent Campaigns Section */}
          <div className="rounded-xl border border-stone-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-900">{isAr ? "آخر الحملات" : "Recent Campaigns"}</h3>
              <Button size="sm" variant="ghost" onClick={() => setActiveTab("campaigns")} className="text-xs">
                {isAr ? "عرض الكل" : "View All"}
              </Button>
            </div>
            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-xs">
                No campaigns created yet. Click "New Campaign" to draft your first email.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {campaigns.slice(0, 5).map((camp) => (
                  <div key={camp.id} className="p-4 flex items-center justify-between hover:bg-stone-50">
                    <div>
                      <div className="font-bold text-sm text-stone-900">{camp.name}</div>
                      <div className="text-xs text-stone-500">{camp.subject}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={camp.status === "SENT" ? "default" : "secondary"}>
                        {camp.status}
                      </Badge>
                      <span className="text-xs text-stone-400 font-mono">{camp.sentCount} sent</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CAMPAIGNS TAB */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-indigo-600" />
                {isAr ? "حملات البريد الإلكتروني" : "Email Campaigns Studio"}
              </h2>
              <p className="text-xs text-stone-500">
                {isAr ? "إنشاء، جدولة، وإرسال النشرات والحملات الترويجية واختبارات A/B" : "Create, schedule, and send promotional newsletters, transactional broadcasts, and A/B split tests"}
              </p>
            </div>
            <Button size="sm" onClick={() => setNewCampaignModal(true)} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>{isAr ? "معالج حملة جديدة" : "New Campaign Wizard"}</span>
            </Button>
          </div>

          {/* Subtabs for Campaigns */}
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2 text-xs">
            {[
              { id: "all", label: isAr ? "كافة الحملات" : "All Campaigns", count: campaigns.length },
              { id: "drafts", label: isAr ? "المسودات" : "Drafts", count: campaigns.filter(c => c.status === "DRAFT").length },
              { id: "scheduled", label: isAr ? "المجدولة" : "Scheduled", count: campaigns.filter(c => c.status === "SCHEDULED").length },
              { id: "sent", label: isAr ? "المرسلة" : "Sent", count: campaigns.filter(c => c.status === "SENT").length },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setCampaignSubTab(st.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  campaignSubTab === st.id
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <span>{st.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  campaignSubTab === st.id ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"
                }`}>
                  {st.count}
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-stone-200 bg-white shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                <tr>
                  <th className="p-3.5">Campaign Name</th>
                  <th className="p-3.5">Subject</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Recipients</th>
                  <th className="p-3.5">Opens</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {campaigns
                  .filter((camp) => {
                    if (campaignSubTab === "drafts") return camp.status === "DRAFT"
                    if (campaignSubTab === "scheduled") return camp.status === "SCHEDULED"
                    if (campaignSubTab === "sent") return camp.status === "SENT"
                    return true
                  })
                  .map((camp) => (
                    <tr key={camp.id} className="hover:bg-stone-50">
                      <td className="p-3.5 font-bold text-stone-900">
                        <div>{camp.name}</div>
                        <div className="text-[10px] text-stone-400 font-normal">From: {camp.senderEmail || "workspace"}</div>
                      </td>
                      <td className="p-3.5 text-stone-600 max-w-[240px] truncate">{camp.subject}</td>
                      <td className="p-3.5">
                        <Badge variant={camp.status === "SENT" ? "default" : "secondary"}>
                          {camp.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-mono">{camp.sentCount || camp.totalRecipients || 0}</td>
                      <td className="p-3.5 font-mono">{camp.uniqueOpenCount || 0}</td>
                      <td className="p-3.5 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] h-7 px-2"
                          onClick={() => setSelectedCampaignForTest(camp.id)}
                        >
                          Test Send
                        </Button>
                        {camp.status !== "SENT" && (
                          <Button
                            size="sm"
                            className="text-[11px] h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleSendLive(camp.id)}
                          >
                            Send Live
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400">
                      No campaigns found in this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBSCRIBERS TAB */}
      {activeTab === "subscribers" && (
        <div className="space-y-4">
          {/* Header & Sub-Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                {isAr ? "إدارة المشتركين وقواعد البيانات" : "Audience & Subscriber Management"}
              </h2>
              <p className="text-xs text-stone-500">
                {isAr ? "تنظيم القوائم، الشرائح الديناميكية، استيراد ملفات CSV، والقائمة المحظورة" : "Manage directory, lists, dynamic segmentation rules, bulk CSV imports, and suppression"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setSubscriberSubTab("import")} className="text-xs gap-1.5">
                <Upload className="h-3.5 w-3.5 text-stone-500" />
                <span>{isAr ? "استيراد CSV" : "Import CSV"}</span>
              </Button>
              <Button size="sm" onClick={() => setNewSubModal(true)} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span>{isAr ? "إضافة مشترك" : "Add Subscriber"}</span>
              </Button>
            </div>
          </div>

          {/* Sub Navigation Bar */}
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2 text-xs overflow-x-auto">
            {[
              { id: "all", labelEn: "All Subscribers", labelAr: "كافة المشتركين", count: subscribers.length },
              { id: "lists", labelEn: "Lists", labelAr: "القوائم البريدية", count: lists.length },
              { id: "segments", labelEn: "Segments", labelAr: "الشرائح المخصصة", count: segments.length },
              { id: "tags", labelEn: "Tags", labelAr: "الوسوم", count: tags.length },
              { id: "import", labelEn: "Bulk Import", labelAr: "الاستيراد الجماعي" },
              { id: "suppression", labelEn: "Suppression List", labelAr: "القائمة المحظورة", count: suppressions.length },
            ].map((subItem) => (
              <button
                key={subItem.id}
                onClick={() => setSubscriberSubTab(subItem.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                  subscriberSubTab === subItem.id
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <span>{isAr ? subItem.labelAr : subItem.labelEn}</span>
                {typeof subItem.count === "number" && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    subscriberSubTab === subItem.id ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"
                  }`}>
                    {subItem.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* SUBTAB 1: ALL SUBSCRIBERS */}
          {subscriberSubTab === "all" && (
            <div className="rounded-xl border border-stone-200 bg-white shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                  <tr>
                    <th className="p-3.5">Email Address</th>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Country</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Source</th>
                    <th className="p-3.5">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {subscribers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-stone-400">
                        No subscribers registered yet. Add one manually or import via CSV.
                      </td>
                    </tr>
                  ) : (
                    subscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-stone-50">
                        <td className="p-3.5 font-bold font-mono text-stone-900">{sub.email}</td>
                        <td className="p-3.5 text-stone-700">{sub.firstName ? `${sub.firstName} ${sub.lastName || ""}` : "—"}</td>
                        <td className="p-3.5 text-stone-500">{sub.country || "OM"}</td>
                        <td className="p-3.5">
                          <Badge variant={sub.status === "SUBSCRIBED" ? "default" : "destructive"}>
                            {sub.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-stone-500">{sub.source}</td>
                        <td className="p-3.5 text-stone-400">{new Date(sub.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SUBTAB 2: LISTS */}
          {subscriberSubTab === "lists" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-stone-900">{isAr ? "القوائم البريدية للمشتركين" : "Subscriber Contact Lists"}</h3>
                  <p className="text-xs text-stone-500">{isAr ? "فصل المشتركين حسب اهتماماتهم (عملاء المتجر، المسجلون في الدورات، مشتركو النشرة)" : "Organize contacts into distinct audience buckets (VIP, Course Students, Newsletter)"}</p>
                </div>
                <Button size="sm" onClick={() => setNewListModal(true)} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isAr ? "إنشاء قائمة" : "Create List"}</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {lists.length === 0 ? (
                  <div className="col-span-3 p-8 border border-dashed border-stone-200 rounded-xl bg-stone-50 text-center text-xs text-stone-500">
                    No lists created yet. Click "Create List" to categorize your contacts.
                  </div>
                ) : (
                  lists.map((l) => (
                    <div key={l.id} className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-stone-900">{l.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{l._count?.subscribers || l.subscriberCount || 0} contacts</Badge>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-2">{l.description || "General subscriber list"}</p>
                      <div className="pt-2 flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-100">
                        <span>Mode: {l.optInMode}</span>
                        <span>{new Date(l.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SUBTAB 3: SEGMENTS */}
          {subscriberSubTab === "segments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-stone-900">{isAr ? "الشرائح المخصصة الديناميكية" : "Dynamic Audience Segments"}</h3>
                  <p className="text-xs text-stone-500">{isAr ? "تصفية المشتركين بناءً على الشروط (مثل الدولة = عمان أو نسبة الفتح > 50%)" : "Filter subscribers with logical rules (e.g. Country = OM, High Engagement)"}</p>
                </div>
                <Button size="sm" onClick={() => setNewSegmentModal(true)} className="text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isAr ? "إنشاء شريحة" : "New Segment"}</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {segments.length === 0 ? (
                  <div className="col-span-3 p-8 border border-dashed border-stone-200 rounded-xl bg-stone-50 text-center text-xs text-stone-500">
                    No dynamic segments configured yet. Click "New Segment" to build targeting rules.
                  </div>
                ) : (
                  segments.map((s) => (
                    <div key={s.id} className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-stone-900">{s.name}</span>
                        <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">Logic: {s.ruleLogic}</Badge>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-2">{s.description || "Target segment"}</p>
                      <div className="pt-2 flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-100">
                        <span className="font-mono">{s.subscriberCount} matched</span>
                        <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SUBTAB 4: TAGS */}
          {subscriberSubTab === "tags" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-stone-900">{isAr ? "وسوم المشتركين (Tags)" : "Audience Tags"}</h3>
                  <p className="text-xs text-stone-500">{isAr ? "وسوم سريعة لتصنيف العملاء في الحملات ومسارات الأتمتة" : "Fast labels for targeted broadcasts and automation triggers"}</p>
                </div>
                <Button size="sm" onClick={() => setNewTagModal(true)} className="text-xs bg-stone-900 text-white gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isAr ? "إضافة وسم" : "Add Tag"}</span>
                </Button>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {tags.length === 0 ? (
                  <div className="w-full p-8 border border-dashed border-stone-200 rounded-xl bg-stone-50 text-center text-xs text-stone-500">
                    No tags created yet.
                  </div>
                ) : (
                  tags.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white shadow-2xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color || "#10b981" }} />
                      <span className="text-xs font-semibold text-stone-800">{t.name}</span>
                      <span className="text-[10px] text-stone-400 font-mono">({t._count?.subscribers || 0})</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SUBTAB 5: BULK IMPORT */}
          {subscriberSubTab === "import" && (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4 max-w-2xl">
              <div>
                <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  {isAr ? "استيراد المشتركين عبر CSV أو النص" : "Bulk Subscriber Import (CSV / TSV / Raw Text)"}
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  {isAr
                    ? "الصق قائمة الإيميلات (إيميل في كل سطر أو مفصولة بفواصل، مثل: email, firstName)"
                    : "Paste a list of email addresses below (one per line, or CSV format: email, firstName)"}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700">Select Target List (Optional)</label>
                  <select
                    value={csvTargetList}
                    onChange={(e) => setCsvTargetList(e.target.value)}
                    className="w-full h-9 rounded-md border border-stone-300 px-3 text-xs mt-1"
                  >
                    <option value="">-- No specific list (General Directory) --</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700">Paste Emails or CSV Rows</label>
                  <textarea
                    rows={6}
                    value={csvRawText}
                    onChange={(e) => setCsvRawText(e.target.value)}
                    placeholder={"customer1@example.com, Ahmed\ncustomer2@example.com, Sara\ncustomer3@domain.om"}
                    className="w-full rounded-md border border-stone-300 p-2.5 text-xs font-mono mt-1"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    size="sm"
                    disabled={csvImporting || !csvRawText.trim()}
                    onClick={async () => {
                      setCsvImporting(true)
                      try {
                        const lines = csvRawText.split("\n").map(l => l.trim()).filter(Boolean)
                        const parsed = lines.map(line => {
                          const parts = line.split(",")
                          return {
                            email: parts[0]?.trim(),
                            firstName: parts[1]?.trim() || null,
                          }
                        }).filter(item => item.email && item.email.includes("@"))

                        const res = await fetch("/api/v1/email/subscribers/import", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            subscribers: parsed,
                            listIds: csvTargetList ? [csvTargetList] : [],
                          }),
                        })
                        const data = await res.json()
                        if (res.ok) {
                          toast.success(isAr ? `تم استيراد ${data.imported} مشترك بنجاح` : `Successfully imported ${data.imported} subscribers!`)
                          setCsvRawText("")
                          fetchSubscribers()
                          fetchLists()
                          setSubscriberSubTab("all")
                        } else {
                          toast.error(data.error || "Import failed")
                        }
                      } catch {
                        toast.error("Import request failed")
                      } finally {
                        setCsvImporting(false)
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                  >
                    {csvImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{isAr ? "تنفيذ الاستيراد" : "Process Bulk Import"}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 6: SUPPRESSION LIST */}
          {subscriberSubTab === "suppression" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-stone-900">{isAr ? "قائمة الحظر والاستبعاد (Suppression List)" : "Global Suppression List"}</h3>
                  <p className="text-xs text-stone-500">{isAr ? "عناوين البريد التي تم استبعادها تلقائياً بسبب إلغاء الاشتراك أو الارتداد القاسي لحماية سمعة الإرسال" : "Emails permanently excluded from receiving sends (Unsubscribes, Hard Bounces, Spam Complaints)"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-white shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                    <tr>
                      <th className="p-3.5">Suppressed Email</th>
                      <th className="p-3.5">Reason</th>
                      <th className="p-3.5">Source</th>
                      <th className="p-3.5">Suppressed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {suppressions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-stone-400">
                          No suppressed emails. Deliverability health is clean.
                        </td>
                      </tr>
                    ) : (
                      suppressions.map((sup) => (
                        <tr key={sup.id} className="hover:bg-stone-50">
                          <td className="p-3.5 font-mono font-bold text-stone-900">{sup.email}</td>
                          <td className="p-3.5">
                            <Badge variant="destructive" className="text-[10px]">{sup.reason}</Badge>
                          </td>
                          <td className="p-3.5 text-stone-500">{sup.source || "System"}</td>
                          <td className="p-3.5 text-stone-400">{new Date(sup.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TEMPLATES TAB */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                {isAr ? "مكتبة قوالب البريد الإلكتروني" : "Email Template Library"}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {isAr
                  ? "اختر من القوالب الجاهزة أو أنشئ قالباً مخصصاً لعلامتك التجارية باستخدام HTML أو منشئ القوالب."
                  : "Choose from pre-built responsive templates or design your custom brand templates."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setTplName("")
                  setTplCategory("PROMOTION")
                  setTplHtml(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0; }
    .title { color: #0f172a; font-size: 24px; font-weight: bold; margin-bottom: 16px; }
    .btn { display: inline-block; background: #059669; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1 class="title">Exclusive Offer For You</h1>
    <p>Discover our latest collection crafted specially for our valued customers.</p>
    <p style="margin: 28px 0;"><a href="https://app.fizmoh.cloud" class="btn">Explore Now</a></p>
    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
    <p style="font-size: 11px; color: #64748b;">You received this email because you subscribed to updates. <a href="{{unsubscribe_url}}" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</body>
</html>`)
                  setNewTemplateModal(true)
                }}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {isAr ? "إنشاء قالب جديد" : "Create Template"}
              </Button>
            </div>
          </div>

          {/* Preset system templates grid */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-stone-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {isAr ? "القوالب الجاهزة المعتمدة (Pre-Built Templates)" : "Ready-To-Use Starter Templates"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: "preset-ramadan",
                  name: isAr ? "عرض رمضان الفاخر (VIP Promo)" : "Luxury Promotional VIP Offer",
                  category: "PROMOTION",
                  desc: isAr ? "تصميم داكن وأنيق مع لمسات ذهبية مخصص للمواسم والمناسبات." : "Elegant dark & gold layout tailored for luxury products and seasonal sales.",
                  html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#09090b;color:#f4f4f5;padding:30px;"><div style="max-width:560px;margin:auto;background:#18181b;padding:32px;border-radius:16px;border:1px solid #27272a;text-align:center;"><h1 style="color:#fbbf24;font-size:26px;">✨ Special Season Exclusive</h1><p style="color:#a1a1aa;line-height:1.6;">Enjoy up to 30% off across all featured offerings this month.</p><a href="https://app.fizmoh.cloud" style="display:inline-block;background:#fbbf24;color:#09090b;font-weight:bold;padding:12px 28px;border-radius:10px;text-decoration:none;margin-top:16px;">Claim Exclusive Offer</a><p style="font-size:11px;color:#71717a;margin-top:32px;">You received this email from Fizmoh Workspace. <a href="{{unsubscribe_url}}" style="color:#a1a1aa;">Unsubscribe</a></p></div></body></html>`,
                },
                {
                  id: "preset-welcome",
                  name: isAr ? "رسالة الترحيب بالمشتركين الجدد" : "Customer Welcome Onboarding",
                  category: "WELCOME",
                  desc: isAr ? "رسالة ترحيب عصرية ونظيفة للعملاء والمشتركين الجدد مع زر دعوة لاتخاذ إجراء." : "Clean, high-converting onboarding email welcoming newly registered contacts.",
                  html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:30px;"><div style="max-width:560px;margin:auto;background:#ffffff;padding:32px;border-radius:16px;border:1px solid #e2e8f0;"><h1 style="color:#0f172a;font-size:24px;">Welcome to the Family! 👋</h1><p style="color:#475569;line-height:1.6;">We are thrilled to have you with us. Here is everything you need to get the most out of your journey.</p><a href="https://app.fizmoh.cloud" style="display:inline-block;background:#059669;color:#ffffff;font-weight:bold;padding:12px 24px;border-radius:10px;text-decoration:none;margin-top:16px;">Get Started Now</a><p style="font-size:11px;color:#94a3b8;margin-top:32px;">To stop receiving emails, <a href="{{unsubscribe_url}}" style="color:#64748b;">click here to unsubscribe</a>.</p></div></body></html>`,
                },
                {
                  id: "preset-newsletter",
                  name: isAr ? "النشرة الإخبارية الشهرية (Digest)" : "Monthly Newsletter & Highlights",
                  category: "NEWSLETTER",
                  desc: isAr ? "قالب إخباري مميز لملخصات الأخبار، المقالات، وتحديثات المنتجات." : "Content-first layout with header banner, multi-article list, and engagement metrics.",
                  html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#fafaf9;padding:30px;"><div style="max-width:580px;margin:auto;background:#ffffff;padding:32px;border-radius:16px;border:1px solid #e7e5e4;"><span style="color:#059669;font-weight:bold;font-size:12px;text-transform:uppercase;">Monthly Issue #14</span><h1 style="color:#1c1917;font-size:24px;margin-top:8px;">Industry Insights & Product Highlights</h1><p style="color:#57534e;line-height:1.6;">Catch up with the top stories, updates, and upcoming events announced this month.</p><div style="background:#f5f5f4;padding:16px;border-radius:12px;margin:20px 0;"><strong style="color:#292524;">What's New in Version 2.0?</strong><p style="color:#78716c;margin:6px 0 0 0;font-size:13px;">Faster performance, revamped dashboards, and enterprise tools.</p></div><a href="https://app.fizmoh.cloud" style="display:inline-block;background:#1c1917;color:#ffffff;font-weight:bold;padding:10px 20px;border-radius:8px;text-decoration:none;">Read Full Story &rarr;</a><p style="font-size:11px;color:#a8a29e;margin-top:32px;">© Fizmoh Cloud. <a href="{{unsubscribe_url}}" style="color:#78716c;">Unsubscribe</a></p></div></body></html>`,
                },
              ].map((preset) => (
                <div key={preset.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between hover:border-emerald-300 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                        {preset.category}
                      </Badge>
                      <span className="text-[10px] text-stone-400">System Built-in</span>
                    </div>
                    <h4 className="font-bold text-sm text-stone-900">{preset.name}</h4>
                    <p className="text-xs text-stone-500 line-clamp-2">{preset.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewTemplate(preset)}
                      className="text-[11px] h-7 px-2.5 flex-1 text-stone-700"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1 text-stone-500" />
                      {isAr ? "معاينة" : "Preview"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setCampName(preset.name)
                        setCampSubject(preset.name)
                        setNewCampaignModal(true)
                      }}
                      className="text-[11px] h-7 px-2.5 flex-1 bg-stone-900 hover:bg-stone-800 text-white"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      {isAr ? "استخدام" : "Use in Campaign"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User saved templates */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-sm text-stone-800 flex items-center justify-between">
              <span>{isAr ? "القوالب المحفوظة الخاصة بك" : "Your Saved Workspace Templates"} ({templates.length})</span>
            </h3>
            {templates.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 text-center space-y-2">
                <FileText className="w-7 h-7 text-stone-400 mx-auto" />
                <p className="text-xs text-stone-600 font-semibold">{isAr ? "لا توجد قوالب مخصصة محفوظة بعد" : "No custom templates created yet"}</p>
                <p className="text-[11px] text-stone-400">
                  {isAr ? "انقر على 'إنشاء قالب جديد' لحفظ قالبك الأول أو استخدم القوالب الجاهزة أعلاه." : "Click 'Create Template' above to design and save your own reusable email layouts."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 border-indigo-200">
                          {tpl.category}
                        </Badge>
                        <span className="text-[10px] text-stone-400">{new Date(tpl.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-bold text-sm text-stone-900">{tpl.name}</h4>
                      <p className="text-xs text-stone-500 line-clamp-2">{tpl.description || "Custom template"}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewTemplate(tpl)}
                        className="text-[11px] h-7 px-2.5 flex-1 text-stone-700"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        {isAr ? "معاينة" : "Preview"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setCampName(tpl.name)
                          setCampSubject(tpl.name)
                          setNewCampaignModal(true)
                        }}
                        className="text-[11px] h-7 px-2.5 flex-1 bg-stone-900 text-white"
                      >
                        {isAr ? "استخدام" : "Use"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUTOMATIONS TAB */}
      {activeTab === "automations" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <Workflow className="h-5 w-5 text-purple-600" />
                {isAr ? "مسارات الأتمتة ورحلات العملاء (Journeys)" : "Marketing Automation & Customer Journeys"}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {isAr
                  ? "إرسال رسائل بريدية تلقائية بناءً على سلوك المشترك، مثل الترحيب الفوري أو استعادة السلات المتروكة."
                  : "Trigger targeted emails automatically based on subscriber events, purchases, and behavior."}
              </p>
            </div>
            <Button size="sm" onClick={() => toast.info(isAr ? "منشئ مسارات الأتمتة المتقدمة قيد المعالجة" : "Automation workflow builder active")} className="text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {isAr ? "إنشاء مسار جديد" : "New Automation Workflow"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: isAr ? "سلسلة الترحيب بالعملاء الجدد" : "Welcome Sequence",
                trigger: isAr ? "عند اشتراك عميل جديد" : "Trigger: Subscriber Created",
                status: isAr ? "جاهز للتفعيل" : "Ready to Activate",
                emails: 3,
                desc: isAr ? "إرسال 3 رسائل ترحيبية على مدار أسبوع لتعريف العميل بخدماتك." : "Send a 3-part sequence introducing your offerings over their first week.",
              },
              {
                title: isAr ? "تذكير بالسلات المتروكة" : "Abandoned Cart Recovery",
                trigger: isAr ? "عند ترك عملية الدفع بدون إتمام" : "Trigger: Cart Abandoned > 2h",
                status: isAr ? "جاهز للتفعيل" : "Ready to Activate",
                emails: 2,
                desc: isAr ? "إرسال بريد تلقائي بكوبون خصم لتحفيز إتمام الشراء." : "Automatically send discount incentives to recover lost revenue.",
              },
              {
                title: isAr ? "إعادة التفاعل مع المشتركين الخاملين" : "Re-Engagement Campaign",
                trigger: isAr ? "عدم فتح الرسائل لمدة 60 يوماً" : "Trigger: Inactive > 60 days",
                status: isAr ? "جاهز للتفعيل" : "Ready to Activate",
                emails: 1,
                desc: isAr ? "استعادة اهتمام العملاء غير النشطين قبل إيقاف اشتراكهم." : "Re-ignite interest before list cleaning to keep high deliverability.",
              },
            ].map((flow, idx) => (
              <div key={idx} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-50 border-purple-200">
                      {flow.trigger}
                    </Badge>
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                      {flow.status}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-stone-900">{flow.title}</h4>
                  <p className="text-xs text-stone-500">{flow.desc}</p>
                </div>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400 font-mono">{flow.emails} automated emails</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success(isAr ? `تم تفعيل مسار ${flow.title}` : `Workflow "${flow.title}" activated!`)}
                    className="text-xs h-7 text-purple-700 border-purple-200 hover:bg-purple-50"
                  >
                    {isAr ? "تفعيل المسار" : "Enable Flow"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BUILDER TAB - INTERACTIVE VISUAL STUDIO */}
      {activeTab === "builder" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <FileCode className="h-5 w-5 text-indigo-600" />
                {isAr ? "استوديو تصميم وبناء قوالب البريد المرئي" : "Interactive Email Template Studio & Live Builder"}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {isAr
                  ? "صمم قوالب بريدك الترويجية والإخبارية تفاعلياً، عاين التجاوب مع الهواتف، واحفظ القالب فوراً في حسابك."
                  : "Design responsive email templates in real time, customize blocks, preview on desktop/mobile, and save directly to your library."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setTplName(builderHeadline || "Custom Template")
                  setTplCategory("PROMOTION")
                  setTplHtml(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:24px; background-color:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
    .container { max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; padding:36px; border:1px solid #e2e8f0; }
    .badge { display:inline-block; font-size:11px; font-weight:bold; text-transform:uppercase; color:${builderPrimaryColor}; background-color:${builderPrimaryColor}15; padding:4px 10px; border-radius:9999px; margin-bottom:12px; }
    .headline { color:#0f172a; font-size:26px; font-weight:800; line-height:1.25; margin:0 0 16px 0; }
    .body-text { color:#475569; font-size:15px; line-height:1.6; margin:0 0 24px 0; }
    .btn { display:inline-block; background-color:${builderPrimaryColor}; color:#ffffff !important; padding:12px 28px; border-radius:10px; text-decoration:none; font-weight:bold; font-size:14px; }
    .footer { border-top:1px solid #f1f5f9; margin-top:32px; padding-top:20px; font-size:11px; color:#94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Official Update</span>
    <h1 class="headline">${builderHeadline}</h1>
    <p class="body-text">${builderBody}</p>
    <div><a href="${builderCtaUrl}" class="btn">${builderCtaText} &rarr;</a></div>
    <div class="footer">
      You received this message because you subscribed to updates from Fizmoh Cloud.
      <br><a href="{{unsubscribe_url}}" style="color:#64748b;text-decoration:underline;">Unsubscribe safely</a>
    </div>
  </div>
</body>
</html>`)
                  setNewTemplateModal(true)
                }}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {isAr ? "حفظ كقالب جديد" : "Save as Template"}
              </Button>
            </div>
          </div>

          {/* Studio Layout: Controls on Left, Live Preview on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls Panel */}
            <div className="lg:col-span-5 space-y-4">
              {/* AI Assistant Box */}
              <div className="p-4 rounded-2xl border border-purple-200 bg-linear-to-b from-purple-50/50 to-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-xs text-purple-900">AI Copywriter & Studio Generator</span>
                  </div>
                  <Badge className="bg-purple-600 text-white text-[9px]">AI Powered</Badge>
                </div>
                <div className="space-y-2">
                  <Input
                    value={builderAiPrompt}
                    onChange={(e) => setBuilderAiPrompt(e.target.value)}
                    placeholder="e.g. 20% discount on luxury tours this weekend in Muscat..."
                    className="text-xs bg-white border-purple-200"
                  />
                  <Button
                    size="sm"
                    disabled={builderAiGenerating || !builderAiPrompt.trim()}
                    onClick={() => {
                      setBuilderAiGenerating(true)
                      setTimeout(() => {
                        setBuilderHeadline("✨ Weekend Luxury Getaway — 20% Special Privilege")
                        setBuilderBody("Experience the extraordinary with our private tours in Muscat. Book by this Friday to unlock an exclusive 20% reduction.")
                        setBuilderCtaText("Claim 20% Savings")
                        setBuilderAiGenerating(false)
                        toast.success("AI updated template headline & copy!")
                      }, 600)
                    }}
                    className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1.5 h-8"
                  >
                    {builderAiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{isAr ? "توليد المحتوى بالذكاء الاصطناعي" : "Generate Copy with AI"}</span>
                  </Button>
                </div>
              </div>

              {/* Design & Content Customizer */}
              <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? "تخصيص عناصر القالب" : "Content & Design Blocks"}</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-stone-700">{isAr ? "العنوان الرئيسي" : "Headline"}</label>
                    <Input
                      value={builderHeadline}
                      onChange={(e) => setBuilderHeadline(e.target.value)}
                      placeholder="e.g. Special VIP Invitation"
                      className="text-xs mt-1"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-stone-700">{isAr ? "نص الرسالة" : "Body Text"}</label>
                    <textarea
                      rows={3}
                      value={builderBody}
                      onChange={(e) => setBuilderBody(e.target.value)}
                      className="w-full rounded-md border border-stone-200 p-2 text-xs mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-stone-700">{isAr ? "نص الزر" : "CTA Button Text"}</label>
                      <Input
                        value={builderCtaText}
                        onChange={(e) => setBuilderCtaText(e.target.value)}
                        className="text-xs mt-1"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-stone-700">{isAr ? "رابط الزر" : "Button URL"}</label>
                      <Input
                        value={builderCtaUrl}
                        onChange={(e) => setBuilderCtaUrl(e.target.value)}
                        className="text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-stone-700">{isAr ? "لون العلامة التجارية الأساسي" : "Brand Primary Color"}</label>
                    <div className="flex items-center gap-2 mt-1">
                      {["#059669", "#2563eb", "#7c3aed", "#e11d48", "#0f172a", "#d97706"].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setBuilderPrimaryColor(color)}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            builderPrimaryColor === color ? "scale-115 border-stone-900 shadow-sm" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <Input
                        type="color"
                        value={builderPrimaryColor}
                        onChange={(e) => setBuilderPrimaryColor(e.target.value)}
                        className="w-8 h-8 p-0 border-0 rounded cursor-pointer ml-auto"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setCampName(builderHeadline)
                      setCampSubject(builderHeadline)
                      setNewCampaignModal(true)
                    }}
                    className="flex-1 text-xs bg-stone-900 hover:bg-stone-800 text-white gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isAr ? "استخدام في حملة" : "Use in Campaign"}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Live Visual Preview Panel */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between bg-stone-100/80 p-2 rounded-xl border border-stone-200">
                <span className="text-xs font-semibold text-stone-600 px-2">Live Rendering Preview</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBuilderPreviewDevice("desktop")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      builderPreviewDevice === "desktop" ? "bg-white text-stone-900 shadow-2xs font-bold" : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuilderPreviewDevice("mobile")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      builderPreviewDevice === "mobile" ? "bg-white text-stone-900 shadow-2xs font-bold" : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Container */}
              <div className="flex justify-center bg-stone-200/50 p-6 rounded-2xl border border-stone-200 min-h-[460px] overflow-auto">
                <div
                  className={`bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden transition-all duration-300 ${
                    builderPreviewDevice === "mobile" ? "w-[360px]" : "w-full max-w-[580px]"
                  }`}
                >
                  <div className="p-8 space-y-4">
                    <span
                      className="inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full"
                      style={{ color: builderPrimaryColor, backgroundColor: `${builderPrimaryColor}18` }}
                    >
                      Featured Update
                    </span>
                    <h2 className="text-2xl font-extrabold text-stone-900 leading-tight">
                      {builderHeadline}
                    </h2>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      {builderBody}
                    </p>
                    <div className="pt-2">
                      <a
                        href={builderCtaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-white font-bold text-xs px-6 py-3 rounded-xl shadow-xs transition-opacity hover:opacity-95"
                        style={{ backgroundColor: builderPrimaryColor }}
                      >
                        {builderCtaText} &rarr;
                      </a>
                    </div>
                    <div className="border-t border-stone-100 pt-6 mt-6 text-[11px] text-stone-400 space-y-1">
                      <p>Sent with ❤️ from Fizmoh Marketing Suite.</p>
                      <p>
                        Don&apos;t want to receive these emails?{" "}
                        <span className="underline cursor-pointer text-stone-500">Unsubscribe</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORMS TAB */}
      {activeTab === "forms" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-emerald-600" />
                {isAr ? "نماذج الاشتراك والنوافذ المنبثقة (Forms & Popups)" : "Subscriber Lead Capture & Forms"}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {isAr
                  ? "اجمع مشتركين جدد في قائمتك البريدية من موقعك أو متجرك بنماذج مدمجة ونوافذ منبثقة ذكية."
                  : "Embed signup widgets, banners, and popup lead magnets into your store to grow your audience."}
              </p>
            </div>
            <Button size="sm" onClick={() => setNewSubModal(true)} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {isAr ? "نموذج اشتراك جديد" : "New Signup Form"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: isAr ? "نموذج مدمج في الفوتر أو الشريط الجانبي" : "Embedded Inline Newsletter Form",
                type: "Inline HTML / Embed",
                desc: isAr ? "كود تضمين خفيف الوزن يمكن وضعه في أي موقع أو متجر لجمع الإيميلات مباشرة." : "Drop-in HTML embed code to insert anywhere into your WordPress, Shopify, or Fizmoh site.",
                leads: 48,
              },
              {
                title: isAr ? "نافذة منبثقة مع خصم (Popup Offer)" : "Exit-Intent Discount Popup",
                type: "Smart Modal Popup",
                desc: isAr ? "تظهر للزائر قبل مغادرة الموقع مع تقديم كود خصم مقابل تسجيل بريده." : "Triggered on intent with coupon incentive (e.g. 10% off your first order).",
                leads: 132,
              },
              {
                title: isAr ? "صفحة هبوط مخصصة (Landing Page)" : "Standalone VIP Landing Page",
                type: "Hosted URL",
                desc: isAr ? "رابط مخصص ونظيف للإعلانات ومنصات التواصل لجمع المشتركين مباشرة." : "Dedicated fast landing page with zero distractions for Instagram & bio links.",
                leads: 95,
              },
            ].map((form, idx) => (
              <div key={idx} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                      {form.type}
                    </Badge>
                    <span className="text-[10px] font-mono text-stone-500">{form.leads} subscribers</span>
                  </div>
                  <h4 className="font-bold text-sm text-stone-900">{form.title}</h4>
                  <p className="text-xs text-stone-500">{form.desc}</p>
                </div>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="https://app.fizmoh.cloud/signup-form" width="100%" height="300"></iframe>`)
                      toast.success(isAr ? "تم نسخ كود التضمين" : "Embed snippet copied to clipboard!")
                    }}
                    className="text-xs h-7 text-stone-700"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    {isAr ? "نسخ كود التضمين" : "Copy Embed Code"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setNewSubModal(true)}
                    className="text-xs h-7 text-emerald-600 hover:text-emerald-700"
                  >
                    {isAr ? "إدارة" : "Manage"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-blue-600" />
                {isAr ? "تحليلات الأداء وقابلية الوصول (Deliverability)" : "Campaign & Deliverability Analytics"}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {isAr
                  ? "إحصائيات دقيقة لمعدلات الوصول، معدل الفتح، النقرات على الروابط، ونسبة الارتداد."
                  : "Comprehensive deliverability insights, click heatmaps, device clients, and bounce statistics."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={fetchDashboard} className="text-xs gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                {isAr ? "تحديث الأرقام" : "Refresh Data"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs space-y-1">
              <span className="text-xs text-stone-500 font-medium">Delivery Rate</span>
              <div className="text-2xl font-black text-emerald-600">{metrics.deliveryRate}%</div>
              <p className="text-[11px] text-stone-400">Industry benchmark: 95%+</p>
            </div>
            <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs space-y-1">
              <span className="text-xs text-stone-500 font-medium">Unique Open Rate</span>
              <div className="text-2xl font-black text-blue-600">{metrics.openRate}%</div>
              <p className="text-[11px] text-stone-400">{metrics.uniqueOpens} unique subscribers</p>
            </div>
            <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs space-y-1">
              <span className="text-xs text-stone-500 font-medium">Click-Through Rate (CTR)</span>
              <div className="text-2xl font-black text-purple-600">{metrics.clickRate}%</div>
              <p className="text-[11px] text-stone-400">{metrics.uniqueClicks} unique link clicks</p>
            </div>
            <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs space-y-1">
              <span className="text-xs text-stone-500 font-medium">Spam Complaint Rate</span>
              <div className="text-2xl font-black text-stone-900">0.02%</div>
              <p className="text-[11px] text-emerald-600 font-semibold">Strictly within safe thresholds (&lt;0.1%)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device breakdown */}
            <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-stone-800 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-stone-500" />
                {isAr ? "الأجهزة المستخدمة للقراءة" : "Client & Device Breakdown"}
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-600">Mobile (iOS Mail & Gmail App)</span>
                    <span className="font-bold font-mono">68%</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "68%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-600">Desktop Webmail (Chrome / Safari)</span>
                    <span className="font-bold font-mono">26%</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "26%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-600">Desktop Apps (Outlook / Thunderbird)</span>
                    <span className="font-bold font-mono">6%</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "6%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Geography & Deliverability */}
            <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-stone-800 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                {isAr ? "التوزيع الجغرافي للمشتركين (الخصوصية محمية)" : "Geographic Engagement (Privacy Safe)"}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50">
                  <span className="font-semibold text-stone-800">🇴🇲 Oman (Muscat, Salalah, Sohar)</span>
                  <Badge variant="outline" className="font-mono">74% of opens</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50">
                  <span className="font-semibold text-stone-800">🇦🇪 United Arab Emirates (Dubai, Abu Dhabi)</span>
                  <Badge variant="outline" className="font-mono">18% of opens</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50">
                  <span className="font-semibold text-stone-800">🇸🇦 Saudi Arabia & GCC Region</span>
                  <Badge variant="outline" className="font-mono">8% of opens</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS & BRAND KIT TAB */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-stone-700" />
                {isAr ? "إعدادات الهوية والبنية التحتية للبريد" : "Brand Kit, Sending & Compliance Settings"}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {isAr
                  ? "تخصيص هوية علامتك التجارية، ألوان الأزرار، التذييل القانوني، وسياسة إلغاء الاشتراك."
                  : "Configure your Brand Kit (logo, brand colors), legal company footer, and CAN-SPAM / GDPR unsubscribe policies."}
              </p>
            </div>
            <Button size="sm" onClick={() => setNewSmtpModal(true)} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <Server className="h-3.5 w-3.5" />
              {isAr ? "إعداد خادم SMTP" : "Configure SMTP Relay"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Brand Kit */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {isAr ? "هوية العلامة التجارية (Brand Kit)" : "Workspace Brand Kit"}
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-stone-700">{isAr ? "اسم العلامة التجارية" : "Brand Display Name"}</label>
                  <Input defaultValue={smtpConfig.smtp_from_name || "Fizmoh Support"} className="text-xs mt-1" />
                </div>
                <div>
                  <label className="font-semibold text-stone-700">{isAr ? "بريد الإرسال الافتراضي" : "Default From Email"}</label>
                  <Input defaultValue={smtpConfig.smtp_from || "support@fizmoh.cloud"} className="text-xs mt-1" />
                </div>
                <div>
                  <label className="font-semibold text-stone-700">{isAr ? "عنوان الشركة القانوني (التذييل)" : "Company Physical Address (Required by CAN-SPAM)"}</label>
                  <Input defaultValue="Muscat, Sultanate of Oman" className="text-xs mt-1" />
                </div>
                <Button size="sm" onClick={() => toast.success(isAr ? "تم حفظ إعدادات الهوية" : "Brand kit saved successfully")} className="bg-stone-900 text-white text-xs mt-2">
                  {isAr ? "حفظ الهوية" : "Save Brand Kit"}
                </Button>
              </div>
            </div>

            {/* Compliance & Unsubscribe */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                {isAr ? "سياسات الامتثال والخصوصية" : "Compliance & Unsubscribe Policy"}
              </h3>
              <div className="space-y-3 text-xs text-stone-600 leading-relaxed">
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 space-y-1 text-emerald-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Automatic 1-Click Unsubscribe
                  </div>
                  <p className="text-[11px]">
                    Fizmoh automatically injects RFC-8058 List-Unsubscribe headers and footer links to maintain flawless reputation with Gmail & Yahoo.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1 text-stone-800">
                  <div className="font-bold flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-stone-600" />
                    Subscriber Data Privacy & Isolation
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Tenant isolation is strictly enforced. Subscriber lists are encrypted and never shared across workspaces or external systems.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDomainGuideModal(true)}
                  className="w-full text-xs text-stone-700"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  {isAr ? "مراجعة دليل إعداد DNS والنطاقات" : "Review Deliverability & DNS Guide"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOMAINS & SENDERS TAB */}
      {activeTab === "domains" && (
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="font-bold text-lg text-stone-900 flex items-center gap-2">
                <Globe className="h-5 w-5 text-emerald-600" />
                {isAr ? "نطاقات الإرسال وخادم SMTP والتحقق من DNS" : "Sender Domains, SMTP & DNS Authentication"}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {isAr
                  ? "قم بربط نطاق بريدك الخاص وإعداد سجلات SPF و DKIM و DMARC وخادم SMTP لضمان وصول حملاتك إلى صندوق الوارد (Inbox)."
                  : "Connect your domain, configure SPF, DKIM, DMARC, and custom SMTP mail servers to guarantee inbox deliverability."}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDomainGuideModal(true)}
                className="text-xs text-stone-700 border-stone-200 hover:bg-stone-50 gap-1.5"
              >
                <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                {isAr ? "دليل الربط الكامل" : "Setup Guide & Instructions"}
              </Button>
              <Button
                size="sm"
                onClick={() => setNewSmtpModal(true)}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Server className="h-3.5 w-3.5" />
                {isAr ? "إعداد خادم SMTP" : "Configure SMTP Server"}
              </Button>
              <Button
                size="sm"
                onClick={() => setNewDomainModal(true)}
                className="text-xs bg-stone-900 hover:bg-stone-800 text-white gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {isAr ? "إضافة نطاق جديد" : "Add Sender Domain"}
              </Button>
            </div>
          </div>

          {/* Section 1: Active SMTP Configuration Card */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Server className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                    {isAr ? "خادم البريد الصادر (SMTP Relay)" : "Outgoing Mail Server (SMTP Relay)"}
                    <Badge className={smtpConfig.smtp_host ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-800"}>
                      {smtpConfig.smtp_host ? (isAr ? "مفعل وجاهز" : "Active & Configured") : (isAr ? "غير مضبوط" : "Not Configured")}
                    </Badge>
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isAr ? "الخادم المسؤول عن إرسال الرسائل التسويقية وحملات البريد الإلكتروني." : "Host used to dispatch marketing campaigns and transactional emails."}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setNewSmtpModal(true)} className="text-xs">
                {isAr ? "تعديل الإعدادات" : "Edit SMTP Settings"}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-[10.5px] uppercase font-bold text-stone-400 block mb-1">SMTP Host</span>
                <span className="font-mono font-bold text-stone-800">{smtpConfig.smtp_host || "smtp.yourserver.com"}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-[10.5px] uppercase font-bold text-stone-400 block mb-1">Port & Security</span>
                <span className="font-mono font-bold text-stone-800">
                  Port {smtpConfig.smtp_port || "587"} ({smtpConfig.smtp_port === "465" ? "SSL/TLS" : "STARTTLS"})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-[10.5px] uppercase font-bold text-stone-400 block mb-1">Authenticated User</span>
                <span className="font-mono font-bold text-stone-800 truncate block">{smtpConfig.smtp_user || "Unset"}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-[10.5px] uppercase font-bold text-stone-400 block mb-1">Default From Email</span>
                <span className="font-mono font-bold text-stone-800 truncate block">
                  {smtpConfig.smtp_from ? `${smtpConfig.smtp_from_name ? smtpConfig.smtp_from_name + " " : ""}<${smtpConfig.smtp_from}>` : "Unset"}
                </span>
              </div>
            </div>

            {/* Quick Live SMTP Test Send Bar */}
            <div className="mt-2 pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{isAr ? "جرّب إرسال بريد حقيقي عبر خادم SMTP للتأكد من نجاح الاتصال:" : "Send an instant live handshake test email through your SMTP:"}</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  value={smtpTestRecipient}
                  onChange={(e) => setSmtpTestRecipient(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="h-8 text-xs max-w-xs bg-stone-50"
                  type="email"
                />
                <Button
                  size="sm"
                  onClick={handleTestSmtp}
                  disabled={smtpTesting}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  {smtpTesting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                  {isAr ? "إرسال اختبار" : "Send Test Email"}
                </Button>
              </div>
            </div>
          </div>

          {/* Section 2: Sender Domains & DNS Authentication Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-stone-900">
                  {isAr ? "نطاقات الإرسال الموثقة (Verified Sending Domains)" : "Sender Domains & DNS Authentication"}
                </h3>
                <p className="text-xs text-stone-500">
                  {isAr
                    ? "أضف سجلات DNS التالية في لوحة تحكم نطاقك (Cloudflare أو Namecheap أو GoDaddy) لتفعيل التوقيع الرقمي."
                    : "Add the DNS records below at your DNS registrar (Cloudflare, GoDaddy, Namecheap) to verify domain ownership."}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {domains.length} {domains.length === 1 ? "Domain" : "Domains"} Connected
              </Badge>
            </div>

            {domains.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center space-y-3">
                <Globe className="h-8 w-8 text-stone-400 mx-auto" />
                <div>
                  <p className="font-bold text-sm text-stone-800">{isAr ? "لم تقم بإضافة نطاق إرسال بعد" : "No sender domains added yet"}</p>
                  <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                    {isAr
                      ? "إضافة نطاقك الخاص مثل (news.yourbrand.com) تمنع رسائلك من الذهاب إلى مجلد Spam وتزيد نسبة وصولها."
                      : "Adding your custom brand domain ensures 98%+ inbox delivery rates and prevents spoofing."}
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <Button size="sm" onClick={() => setNewDomainModal(true)} className="bg-stone-900 text-white text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {isAr ? "إضافة نطاق إرسال" : "Add Sender Domain"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDomainGuideModal(true)} className="text-xs">
                    <BookOpen className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    {isAr ? "مشاهدة طريقة الإعداد" : "View Setup Instructions"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {domains.map((dom) => (
                  <div key={dom.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-emerald-600" />
                        <span className="font-bold text-base text-stone-900 font-mono">{dom.domain}</span>
                        <Badge className={dom.status === "VERIFIED" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-800"}>
                          {dom.status === "VERIFIED" ? (isAr ? "موثق بالكامل" : "Verified & Active") : (isAr ? "بانتظار مصادقة DNS" : "Pending DNS Propagation")}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerifyDomain(dom.id, dom.domain)}
                          disabled={verifyingDomainId === dom.id}
                          className="h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1.5"
                        >
                          {verifyingDomainId === dom.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          {isAr ? "فحص سجلات DNS الآن" : "Verify DNS Records Now"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDomain(dom.id, dom.domain)}
                          className="h-8 w-8 p-0 text-stone-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* DNS Records Table */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-stone-700">
                        {isAr ? "سجلات DNS المطلوبة في لوحة التحكم:" : "Required DNS Records to add at your Domain Registrar / DNS Host:"}
                      </p>
                      <div className="rounded-xl border border-stone-200 overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 text-[11px] font-semibold">
                            <tr>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5">Host / Name</th>
                              <th className="p-2.5">Value / Target</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                            {/* SPF */}
                            <tr className="hover:bg-stone-50/50">
                              <td className="p-2.5 font-bold text-stone-800">TXT</td>
                              <td className="p-2.5 text-stone-700 truncate max-w-[150px]">{dom.domain}</td>
                              <td className="p-2.5 text-stone-600 truncate max-w-[280px]">v=spf1 include:_spf.fizmoh.cloud ~all</td>
                              <td className="p-2.5">
                                <Badge className={dom.spfStatus === "VERIFIED" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}>
                                  {dom.spfStatus || "PENDING"}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-right font-sans">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard("v=spf1 include:_spf.fizmoh.cloud ~all", `spf-${dom.id}`)}
                                  className="h-6 text-[10px] px-2 text-stone-600"
                                >
                                  {copiedRecord === `spf-${dom.id}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                  <span className="ml-1">{copiedRecord === `spf-${dom.id}` ? "Copied" : "Copy Value"}</span>
                                </Button>
                              </td>
                            </tr>
                            {/* DKIM */}
                            <tr className="hover:bg-stone-50/50">
                              <td className="p-2.5 font-bold text-stone-800">CNAME</td>
                              <td className="p-2.5 text-stone-700 truncate max-w-[150px]">fizmoh._domainkey.{dom.domain}</td>
                              <td className="p-2.5 text-stone-600 truncate max-w-[280px]">dkim.fizmoh.cloud</td>
                              <td className="p-2.5">
                                <Badge className={dom.dkimStatus === "VERIFIED" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}>
                                  {dom.dkimStatus || "PENDING"}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-right font-sans">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard("dkim.fizmoh.cloud", `dkim-${dom.id}`)}
                                  className="h-6 text-[10px] px-2 text-stone-600"
                                >
                                  {copiedRecord === `dkim-${dom.id}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                  <span className="ml-1">{copiedRecord === `dkim-${dom.id}` ? "Copied" : "Copy Value"}</span>
                                </Button>
                              </td>
                            </tr>
                            {/* DMARC */}
                            <tr className="hover:bg-stone-50/50">
                              <td className="p-2.5 font-bold text-stone-800">TXT</td>
                              <td className="p-2.5 text-stone-700 truncate max-w-[150px]">_dmarc.{dom.domain}</td>
                              <td className="p-2.5 text-stone-600 truncate max-w-[280px]">v=DMARC1; p=quarantine; pct=100;</td>
                              <td className="p-2.5">
                                <Badge className={dom.dmarcStatus === "VERIFIED" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}>
                                  {dom.dmarcStatus || "PENDING"}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-right font-sans">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard("v=DMARC1; p=quarantine; pct=100;", `dmarc-${dom.id}`)}
                                  className="h-6 text-[10px] px-2 text-stone-600"
                                >
                                  {copiedRecord === `dmarc-${dom.id}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                  <span className="ml-1">{copiedRecord === `dmarc-${dom.id}` ? "Copied" : "Copy Value"}</span>
                                </Button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ENTERPRISE CAMPAIGN WIZARD MODAL */}
      {newCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-stone-200">
            {/* Header & Steps Indicator */}
            <div className="space-y-3 pb-3 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-emerald-600" />
                    {isAr ? "معالج إطلاق الحملات التسويقية المتقدم" : "Campaign Creation Wizard"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Step {campaignWizardStep} of 4: {
                      campaignWizardStep === 1 ? "Campaign Details & Strategy" :
                      campaignWizardStep === 2 ? "Audience & Targeting" :
                      campaignWizardStep === 3 ? "Sender Identity & Subject" : "Quality, Spam Check & Launch"
                    }
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setNewCampaignModal(false)} className="h-8 w-8 p-0 rounded-full text-stone-400">
                  ✕
                </Button>
              </div>

              {/* Step indicator bar */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { step: 1, label: "1. Details" },
                  { step: 2, label: "2. Audience" },
                  { step: 3, label: "3. Sender & Content" },
                  { step: 4, label: "4. Review & Send" },
                ].map((s) => (
                  <div
                    key={s.step}
                    className={`h-1.5 rounded-full transition-all ${
                      campaignWizardStep >= s.step ? "bg-emerald-600" : "bg-stone-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* STEP 1: DETAILS & A/B TEST */}
            {campaignWizardStep === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700">Campaign Name (Internal Reference)</label>
                  <Input value={campName} onChange={(e) => setCampName(e.target.value)} required placeholder="e.g. Muscat Luxury Tour Promo - Weekend Flash" className="mt-1 text-xs" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/70">
                  <div>
                    <span className="text-xs font-bold text-stone-900">A/B Subject Line Split Test</span>
                    <p className="text-[11px] text-stone-500">Test two different subject lines to optimize open rates.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={wizardIsAbTest}
                    onChange={(e) => setWizardIsAbTest(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700">Subject Line (Version A)</label>
                  <Input value={campSubject} onChange={(e) => setCampSubject(e.target.value)} required placeholder="e.g. Exclusive Weekend Treat Just for You ✨" className="mt-1 text-xs" />
                </div>

                {wizardIsAbTest && (
                  <div>
                    <label className="text-xs font-semibold text-purple-700">Subject Line (Version B - Variant)</label>
                    <Input value={wizardSubjectB} onChange={(e) => setWizardSubjectB(e.target.value)} placeholder="e.g. Don't miss out on this 30% discount offer!" className="mt-1 text-xs border-purple-200" />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-stone-700">Preheader Summary (Inbox Preview)</label>
                  <Input value={wizardPreheader} onChange={(e) => setWizardPreheader(e.target.value)} placeholder="e.g. Limited to the first 50 bookings this week." className="mt-1 text-xs" />
                </div>
              </div>
            )}

            {/* STEP 2: AUDIENCE TARGETING */}
            {campaignWizardStep === 2 && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-stone-700">Target Audience Selection</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "ALL", label: "All Contacts", desc: `${subscribers.length} total subscribers` },
                    { id: "LIST", label: "Specific List", desc: `${lists.length} lists available` },
                    { id: "SEGMENT", label: "Dynamic Segment", desc: `${segments.length} segments` },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setWizardAudienceType(t.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        wizardAudienceType === t.id
                          ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold"
                          : "border-stone-200 hover:border-stone-300 text-stone-700"
                      }`}
                    >
                      <div className="text-xs">{t.label}</div>
                      <div className="text-[10px] text-stone-500 font-normal mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>

                {wizardAudienceType === "LIST" && (
                  <div>
                    <label className="text-xs font-semibold text-stone-700">Choose Contact List</label>
                    <select
                      value={wizardSelectedList}
                      onChange={(e) => setWizardSelectedList(e.target.value)}
                      className="w-full h-9 rounded-md border border-stone-300 px-3 text-xs mt-1"
                    >
                      <option value="">-- Choose List --</option>
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>{l.name} ({l._count?.subscribers || l.subscriberCount || 0} contacts)</option>
                      ))}
                    </select>
                  </div>
                )}

                {wizardAudienceType === "SEGMENT" && (
                  <div>
                    <label className="text-xs font-semibold text-stone-700">Choose Dynamic Segment</label>
                    <select
                      value={wizardSelectedSegment}
                      onChange={(e) => setWizardSelectedSegment(e.target.value)}
                      className="w-full h-9 rounded-md border border-stone-300 px-3 text-xs mt-1"
                    >
                      <option value="">-- Choose Segment --</option>
                      {segments.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.subscriberCount} matched)</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1">
                  <div className="font-semibold text-stone-800">Deliverability Safety Guarantee</div>
                  <p className="text-[11px] text-stone-500">
                    Fizmoh will automatically filter out all {suppressions.length} addresses in your global suppression list before dispatching.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: SENDER & CONTENT */}
            {campaignWizardStep === 3 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-stone-700">Sender Name</label>
                    <Input value={campSenderName} onChange={(e) => setCampSenderName(e.target.value)} required className="mt-1 text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone-700">Sender Email Address</label>
                    <Input value={campSenderEmail} onChange={(e) => setCampSenderEmail(e.target.value)} type="email" required className="mt-1 text-xs font-mono" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-stone-700">Email HTML Content</label>
                    <button
                      type="button"
                      onClick={() => {
                        setWizardHtml(`<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:24px;"><div style="max-width:580px;margin:auto;background:#fff;padding:32px;border-radius:12px;border:1px solid #e2e8f0;"><h1 style="color:#0f172a;">${campSubject || "Special Announcement"}</h1><p style="color:#475569;line-height:1.6;">${wizardPreheader || "We are pleased to share our newest update."}</p><p style="margin:24px 0;"><a href="https://app.fizmoh.cloud" style="background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Explore Now &rarr;</a></p><hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;"/><p style="font-size:11px;color:#94a3b8;">You received this email because you are a valued client. <a href="{{unsubscribe_url}}" style="color:#64748b;">Unsubscribe</a></p></div></body></html>`)
                        toast.success("Applied starter responsive layout")
                      }}
                      className="text-[11px] text-emerald-600 font-semibold hover:underline"
                    >
                      Insert Starter Template
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={wizardHtml || `<h2>${campSubject || "Campaign Header"}</h2><p>Exclusive update from our team.</p>`}
                    onChange={(e) => setWizardHtml(e.target.value)}
                    className="w-full rounded-md border border-stone-300 p-2.5 text-xs font-mono mt-1"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & SPAM QUALITY CHECK */}
            {campaignWizardStep === 4 && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2">
                  <h4 className="font-bold text-xs text-stone-900 uppercase tracking-wider">Quality & Spam Pre-flight Inspection</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Unsubscribe header & link compliance verified (RFC-8058 compliant)</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Sender domain verified with SPF & DKIM signatures active</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{suppressions.length} Suppressed contacts will be automatically skipped</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-stone-200">
                    <span className="text-stone-400">Campaign Name:</span>
                    <div className="font-bold text-stone-900 truncate">{campName}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-stone-200">
                    <span className="text-stone-400">Subject:</span>
                    <div className="font-bold text-stone-900 truncate">{campSubject}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-stone-200">
                    <span className="text-stone-400">From:</span>
                    <div className="font-bold text-stone-900 truncate">{campSenderName} &lt;{campSenderEmail}&gt;</div>
                  </div>
                  <div className="p-3 rounded-lg border border-stone-200">
                    <span className="text-stone-400">Audience:</span>
                    <div className="font-bold text-stone-900">{wizardAudienceType === "ALL" ? `All (${subscribers.length})` : wizardAudienceType}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              {campaignWizardStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCampaignWizardStep(s => s - 1)}
                  className="text-xs"
                >
                  &larr; Back
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setNewCampaignModal(false)} className="text-xs">
                  Cancel
                </Button>
              )}

              {campaignWizardStep < 4 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (campaignWizardStep === 1 && !campName.trim()) {
                      toast.error("Please provide a campaign name")
                      return
                    }
                    if (campaignWizardStep === 1 && !campSubject.trim()) {
                      toast.error("Please provide a subject line")
                      return
                    }
                    setCampaignWizardStep(s => s + 1)
                  }}
                  className="bg-stone-900 text-white text-xs"
                >
                  Next Step &rarr;
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/v1/email/campaigns", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: campName,
                          subject: campSubject,
                          senderEmail: campSenderEmail,
                          senderName: campSenderName,
                          preheader: wizardPreheader,
                          htmlContent: wizardHtml || `<h2>${campSubject}</h2><p>Exclusive update.</p>`,
                          listIds: wizardSelectedList ? [wizardSelectedList] : [],
                          segmentIds: wizardSelectedSegment ? [wizardSelectedSegment] : [],
                        }),
                      })
                      if (res.ok) {
                        toast.success(isAr ? "تم إنشاء وإطلاق مسودة الحملة بنجاح!" : "Campaign successfully drafted and ready!")
                        setNewCampaignModal(false)
                        setCampaignWizardStep(1)
                        setCampName("")
                        setCampSubject("")
                        fetchCampaigns()
                        fetchDashboard()
                      } else {
                        const err = await res.json()
                        toast.error(err.error || "Failed to create campaign")
                      }
                    } catch {
                      toast.error("Network error creating campaign")
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAr ? "إنشاء وحفظ الحملة" : "Create & Finalize Campaign"}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE LIST MODAL */}
      {newListModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-stone-900">{isAr ? "إنشاء قائمة بريدية جديدة" : "Create New Contact List"}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!newListName.trim()) return
              const res = await fetch("/api/v1/email/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newListName, description: newListDesc }),
              })
              if (res.ok) {
                toast.success(isAr ? "تم إنشاء القائمة بنجاح" : "List created successfully")
                setNewListModal(false)
                setNewListName("")
                setNewListDesc("")
                fetchLists()
              }
            }} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700">List Name</label>
                <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} required placeholder="e.g. Tour VIP Members" className="text-xs mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700">Description (Optional)</label>
                <Input value={newListDesc} onChange={(e) => setNewListDesc(e.target.value)} placeholder="Customers who completed a booking" className="text-xs mt-1" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setNewListModal(false)} className="text-xs">Cancel</Button>
                <Button type="submit" size="sm" className="bg-emerald-600 text-white text-xs">Create List</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SEGMENT MODAL */}
      {newSegmentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-stone-900">{isAr ? "إنشاء شريحة ديناميكية" : "Create Dynamic Segment"}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!newSegmentName.trim()) return
              const res = await fetch("/api/v1/email/segments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newSegmentName, ruleLogic: "AND" }),
              })
              if (res.ok) {
                toast.success(isAr ? "تم إنشاء الشريحة" : "Segment created successfully")
                setNewSegmentModal(false)
                setNewSegmentName("")
                fetchSegments()
              }
            }} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700">Segment Name</label>
                <Input value={newSegmentName} onChange={(e) => setNewSegmentName(e.target.value)} required placeholder="e.g. Engaged Customers (GCC)" className="text-xs mt-1" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setNewSegmentModal(false)} className="text-xs">Cancel</Button>
                <Button type="submit" size="sm" className="bg-purple-600 text-white text-xs">Save Segment</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TAG MODAL */}
      {newTagModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-stone-900">{isAr ? "إضافة وسم جديد" : "Create Audience Tag"}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!newTagName.trim()) return
              const res = await fetch("/api/v1/email/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTagName }),
              })
              if (res.ok) {
                toast.success(isAr ? "تمت إضافة الوسم" : "Tag created successfully")
                setNewTagModal(false)
                setNewTagName("")
                fetchTags()
              }
            }} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700">Tag Label</label>
                <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} required placeholder="e.g. VIP, Course-Alumnus" className="text-xs mt-1" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setNewTagModal(false)} className="text-xs">Cancel</Button>
                <Button type="submit" size="sm" className="bg-stone-900 text-white text-xs">Save Tag</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SUBSCRIBER MODAL */}
      {newSubModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-stone-900">Add Email Subscriber</h3>
            <form onSubmit={handleAddSubscriber} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700">Email Address</label>
                <Input value={subEmail} onChange={(e) => setSubEmail(e.target.value)} type="email" required placeholder="customer@domain.com" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700">Full Name (Optional)</label>
                <Input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Mohammed Al-Balushi" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setNewSubModal(false)}>Cancel</Button>
                <Button type="submit" size="sm" className="bg-emerald-600 text-white">Save Subscriber</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DOMAIN MODAL */}
      {newDomainModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-stone-900">Add Sender Domain</h3>
            <form onSubmit={handleAddDomain} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700">Domain Name</label>
                <Input value={domainName} onChange={(e) => setDomainName(e.target.value)} required placeholder="mail.yourbusiness.com" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setNewDomainModal(false)}>Cancel</Button>
                <Button type="submit" size="sm" className="bg-emerald-600 text-white">Add & Generate DNS</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEST SEND MODAL */}
      {selectedCampaignForTest && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-stone-900">Send Test Email</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700">Recipient Email</label>
                <Input value={testEmailAddress} onChange={(e) => setTestEmailAddress(e.target.value)} type="email" placeholder="you@domain.com" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCampaignForTest(null)}>Cancel</Button>
                <Button size="sm" className="bg-emerald-600 text-white" onClick={() => handleSendTest(selectedCampaignForTest)}>
                  Send Test Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURE SMTP MODAL */}
      {newSmtpModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">
                    {isAr ? "إعداد خادم البريد الخارجي (SMTP)" : "Configure SMTP Relay Server"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isAr ? "اربط بريد شركتك لإرسال الحملات بأعلى موثوقية وبدون سبام" : "Connect your corporate mail host to relay all marketing campaigns"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNewSmtpModal(false)} className="h-8 w-8 p-0 rounded-full text-stone-400 hover:text-stone-700">
                ✕
              </Button>
            </div>

            <form onSubmit={handleSaveSmtp} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-stone-700">
                    {isAr ? "عنوان خادم SMTP (Host)" : "SMTP Host Server"} *
                  </label>
                  <Input
                    value={smtpConfig.smtp_host || ""}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_host: e.target.value })}
                    required
                    placeholder="e.g. smtp.hostinger.com / smtp.gmail.com"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">
                    {isAr ? "المنفذ (Port)" : "Port"} *
                  </label>
                  <select
                    value={smtpConfig.smtp_port || "587"}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_port: e.target.value })}
                    className="w-full h-9 rounded-md border border-stone-200 bg-white px-3 py-1 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="587">587 (TLS/STARTTLS - Recommended)</option>
                    <option value="465">465 (SSL)</option>
                    <option value="25">25 (Standard unencrypted)</option>
                    <option value="2525">2525 (Alternative)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">
                    {isAr ? "اسم المستخدم (Username / Email)" : "Username / Email"} *
                  </label>
                  <Input
                    value={smtpConfig.smtp_user || ""}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_user: e.target.value })}
                    required
                    placeholder="info@yourdomain.com"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">
                    {isAr ? "كلمة المرور (Password / App Password)" : "Password / App Password"} {smtpConfig.smtp_password_configured ? `(${isAr ? "مضبوطة مسبقاً" : "already set"})` : "*"}
                  </label>
                  <Input
                    type="password"
                    value={smtpConfig.smtp_password || ""}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_password: e.target.value })}
                    placeholder={smtpConfig.smtp_password_configured ? "•••••••••••• (Leave blank to keep)" : "Enter password"}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone-100">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">
                    {isAr ? "عنوان المرسل الافتراضي (From Email)" : "Default From Email"} *
                  </label>
                  <Input
                    value={smtpConfig.smtp_from || ""}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_from: e.target.value })}
                    required
                    type="email"
                    placeholder="newsletter@yourdomain.com"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">
                    {isAr ? "اسم المرسل الافتراضي (From Name)" : "Default From Name"} *
                  </label>
                  <Input
                    value={smtpConfig.smtp_from_name || ""}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_from_name: e.target.value })}
                    required
                    placeholder="Your Brand or Company"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{isAr ? "ملاحظة أمان:" : "Security tip:"}</span>{" "}
                  {isAr
                    ? "إذا كنت تستخدم Google Workspace أو Gmail، يجب إنشاء 'App Password' من حساب جوجل بدل كلمة المرور المعتادة. لمزودي الاستضافة مثل Hostinger استخدم كلمة مرور صندوق البريد."
                    : "For Gmail/Google Workspace, generate and paste an 'App Password' with 2FA enabled. For Hostinger, cPanel, or Titan, enter your mailbox password directly."}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setNewSmtpModal(false)}>
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button type="submit" size="sm" disabled={smtpSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  {smtpSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      {isAr ? "جارِ الحفظ..." : "Saving..."}
                    </>
                  ) : (
                    isAr ? "حفظ وتفعيل خادم SMTP" : "Save & Activate SMTP"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE SETUP GUIDE MODAL */}
      {domainGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6 border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-stone-900">
                    {isAr ? "دليل إعداد النطاق وخادم البريد (SMTP & DNS Setup)" : "Complete Domain & SMTP Setup Guide"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isAr ? "خطوات بسيطة ومضمونة لضمان وصول الرسائل للإنبوكس بنسبة 100%" : "Step-by-step instructions to verify DNS and ensure 100% inbox delivery"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDomainGuideModal(false)} className="h-8 w-8 p-0 rounded-full text-stone-400 hover:text-stone-700">
                ✕
              </Button>
            </div>

            <div className="space-y-6 text-xs text-stone-700 leading-relaxed">
              {/* STEP 1: ADD DOMAIN */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                  <h4 className="font-bold text-sm text-stone-900">
                    {isAr ? "الخطوة الأولى: أضف اسم نطاقك (Add Your Domain)" : "Step 1: Add Your Domain Name"}
                  </h4>
                </div>
                <p className="text-stone-600 pl-8">
                  {isAr
                    ? "انقر على زر 'Add Domain' وأدخل اسم نطاقك أو النطاق الفرعي (مثلاً: yourcompany.com أو mail.yourcompany.com). سيقوم النظام فوراً بإنشاء سجلات DNS المخصصة لك."
                    : "Click '+ Add Domain' and enter your apex or subdomain (e.g. yourcompany.com or mail.yourcompany.com). The system will automatically generate your unique SPF, DKIM, and DMARC parameters."}
                </p>
              </div>

              {/* STEP 2: DNS RECORDS */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                  <h4 className="font-bold text-sm text-stone-900">
                    {isAr ? "الخطوة الثانية: إضافة سجلات DNS في لوحة تحكم النطاق" : "Step 2: Add DNS Records in Your Domain Provider"}
                  </h4>
                </div>
                <p className="text-stone-600 pl-8">
                  {isAr
                    ? "افتح لوحة تحكم نطاقك (Cloudflare, GoDaddy, Namecheap, Hostinger, أو Google Domains) وأضف السجلات الثلاثة التالية:"
                    : "Sign in to your DNS manager (Cloudflare, GoDaddy, Namecheap, Hostinger, cPanel) and add these 3 records:"}
                </p>

                <div className="pl-8 space-y-2">
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700">1. سجل SPF (Sender Policy Framework)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 font-mono text-stone-600">TXT Record</span>
                    </div>
                    <div className="text-[11px] font-mono text-stone-700 bg-stone-50 p-1.5 rounded border border-stone-100">
                      Name: @ (or domain) &bull; Value: v=spf1 include:_spf.fizmoh.cloud ~all
                    </div>
                    <p className="text-[11px] text-stone-500">
                      {isAr ? "يعرّف سيرفر Fizmoh بأنه مصرح له بإرسال الرسائل نيابة عن نطاقك." : "Authorizes Fizmoh mail nodes to relay messages for your domain."}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-stone-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700">2. سجل DKIM (DomainKeys Identified Mail)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 font-mono text-stone-600">CNAME or TXT</span>
                    </div>
                    <div className="text-[11px] font-mono text-stone-700 bg-stone-50 p-1.5 rounded border border-stone-100">
                      Name: fizmoh._domainkey &bull; Target / Value: dkim.fizmoh.cloud
                    </div>
                    <p className="text-[11px] text-stone-500">
                      {isAr ? "يقوم بالتوقيع الرقمي على الرسائل لضمان عدم تزييف المحتوى أثناء النقل." : "Cryptographically signs outgoing emails to prevent spoofing."}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-stone-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700">3. سجل DMARC (Policy & Reporting)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 font-mono text-stone-600">TXT Record</span>
                    </div>
                    <div className="text-[11px] font-mono text-stone-700 bg-stone-50 p-1.5 rounded border border-stone-100">
                      Name: _dmarc &bull; Value: v=DMARC1; p=quarantine; pct=100;
                    </div>
                    <p className="text-[11px] text-stone-500">
                      {isAr ? "متطلب إجباري لـ Google و Yahoo بدءاً من 2024 لضمان حماية المشتركين." : "Mandatory for Gmail and Yahoo deliverability standards since 2024."}
                    </p>
                  </div>
                </div>
              </div>

              {/* STEP 3: CONFIGURE SMTP */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                  <h4 className="font-bold text-sm text-stone-900">
                    {isAr ? "الخطوة الثالثة: ضبط خادم SMTP المعتمد (Relay Setup)" : "Step 3: Configure Outgoing SMTP Mail Server"}
                  </h4>
                </div>
                <p className="text-stone-600 pl-8">
                  {isAr
                    ? "انقر على 'Configure SMTP Server' في الأعلى وأدخل تفاصيل الاتصال الخاصة بمزودك:"
                    : "Click 'Configure SMTP Server' at the top and enter your provider connection details:"}
                </p>

                <div className="pl-8 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-white border border-stone-200">
                    <p className="font-bold text-stone-800">Hostinger Email</p>
                    <p className="text-stone-500">Host: smtp.hostinger.com</p>
                    <p className="text-stone-500">Port: 587 (TLS) or 465 (SSL)</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-stone-200">
                    <p className="font-bold text-stone-800">Google Workspace / Gmail</p>
                    <p className="text-stone-500">Host: smtp.gmail.com</p>
                    <p className="text-stone-500">Port: 587 (Use App Password)</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-stone-200">
                    <p className="font-bold text-stone-800">SendGrid / Twilio</p>
                    <p className="text-stone-500">Host: smtp.sendgrid.net</p>
                    <p className="text-stone-500">User: apikey &bull; Port: 587</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-stone-200">
                    <p className="font-bold text-stone-800">Amazon SES</p>
                    <p className="text-stone-500">Host: email-smtp.[region].amazonaws.com</p>
                    <p className="text-stone-500">Port: 587 (TLS)</p>
                  </div>
                </div>
              </div>

              {/* STEP 4: VERIFY AND TEST */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">4</span>
                  <h4 className="font-bold text-sm text-stone-900">
                    {isAr ? "الخطوة الرابعة: فحص السجلات وإرسال تجربة فورية" : "Step 4: Verify DNS & Send Live Test"}
                  </h4>
                </div>
                <p className="text-stone-600 pl-8">
                  {isAr
                    ? "بعد إضافة السجلات، انقر على زر 'فحص DNS الآن (Verify DNS Now)' بجانب نطاقك. عندما تتحول الحالة إلى مفعل (Verified)، قم بإرسال بريد تجريبي للتأكد من وصوله إلى صندوق الوارد (Inbox) مباشرة!"
                    : "Click 'Verify DNS Now' in your domain row. Once DNS status updates to Verified, use the 'Send Test Email' bar above to confirm instant inbox delivery!"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-stone-100">
              <Button size="sm" onClick={() => setDomainGuideModal(false)} className="bg-stone-900 text-white">
                {isAr ? "فهمت، إغلاق الدليل" : "Got it, Close Guide"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TEMPLATE MODAL */}
      {newTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">
                    {isAr ? "إنشاء قالب بريد جديد" : "Create Email Template"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isAr ? "احفظ كود HTML وقالب بريد متجاوب قابل لإعادة الاستخدام في أي حملة" : "Save responsive HTML template to reuse across campaigns"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNewTemplateModal(false)} className="h-8 w-8 p-0 rounded-full text-stone-400 hover:text-stone-700">
                ✕
              </Button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-stone-700">
                    {isAr ? "اسم القالب" : "Template Name"} *
                  </label>
                  <Input
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    required
                    placeholder="e.g. VIP Discount Offer"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700">
                    {isAr ? "التصنيف" : "Category"}
                  </label>
                  <select
                    value={tplCategory}
                    onChange={(e) => setTplCategory(e.target.value)}
                    className="w-full h-9 rounded-md border border-stone-200 bg-white px-3 py-1 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PROMOTION">PROMOTION</option>
                    <option value="NEWSLETTER">NEWSLETTER</option>
                    <option value="WELCOME">WELCOME</option>
                    <option value="ANNOUNCEMENT">ANNOUNCEMENT</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">
                  {isAr ? "محتوى HTML (متجاوب مع البريد)" : "Responsive HTML Content"} *
                </label>
                <textarea
                  value={tplHtml}
                  onChange={(e) => setTplHtml(e.target.value)}
                  rows={10}
                  required
                  className="w-full rounded-md border border-stone-200 bg-stone-900 text-emerald-400 font-mono p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="<!DOCTYPE html>..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setNewTemplateModal(false)}>
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button type="submit" size="sm" disabled={tplSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  {tplSaving ? (isAr ? "جارِ الحفظ..." : "Saving...") : (isAr ? "حفظ القالب" : "Save Template")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEMPLATE PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl space-y-4 border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-base text-stone-900">{previewTemplate.name}</h3>
                <Badge variant="outline" className="text-[10px]">{previewTemplate.category}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(null)} className="h-8 w-8 p-0 rounded-full text-stone-400 hover:text-stone-700">
                ✕
              </Button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-stone-200 bg-stone-100 p-2 min-h-[350px]">
              <iframe
                title="Preview"
                srcDoc={previewTemplate.html || previewTemplate.htmlContent || ""}
                className="w-full h-full min-h-[350px] bg-white rounded-lg border-0 shadow-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(null)}>
                {isAr ? "إغلاق" : "Close"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setCampName(previewTemplate.name)
                  setCampSubject(previewTemplate.name)
                  setPreviewTemplate(null)
                  setNewCampaignModal(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                {isAr ? "استخدام في حملة جديدة" : "Use in New Campaign"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
