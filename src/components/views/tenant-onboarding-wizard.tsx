"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles,
  ArrowRight, ShieldCheck, CreditCard, Bot, Settings,
  Megaphone, X, ExternalLink
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

interface TenantOnboardingWizardProps {
  onNavigate: (view: any) => void
  conversationCount?: number
  orderCount?: number
}

interface StepItem {
  id: string
  title: string
  description: string
  badge: string
  badgeColor: string
  icon: any
  iconBg: string
  iconColor: string
  view: string
  isCompleted: boolean
  actionText: string
}

export function TenantOnboardingWizard({
  onNavigate,
  conversationCount = 0,
  orderCount = 0,
}: TenantOnboardingWizardProps) {
  const [settings, setSettings] = useState<Record<string, any> | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem("fizmoh_tenant_onboarding_dismissed") === "true"
      if (isDismissed) setDismissed(true)
      const isCollapsed = localStorage.getItem("fizmoh_tenant_onboarding_collapsed") === "true"
      if (isCollapsed) setCollapsed(true)
    } catch {}

    fetch("/api/settings")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.settings) setSettings(data.settings)
      })
      .catch(() => {})
  }, [])

  if (dismissed) return null

  // Evaluate step completion
  const isWhatsAppConnected = Boolean(
    settings && (
      (settings.whatsapp_phone_id && (settings.whatsapp_access_token_set || settings.whatsapp_access_token)) ||
      settings.whatsapp_access_token_set
    )
  )

  const isProfileConfigured = Boolean(
    settings && settings.business_name && settings.business_name.trim().length > 0
  )

  const isAiConfigured = Boolean(
    settings && (
      (settings.assistant_name && settings.assistant_name.trim() !== "AI") ||
      settings.ai_agent_greeting ||
      settings.system_prompt
    )
  )

  const isPaymentConfigured = Boolean(
    settings && (
      settings.amwalpay_merchant_id ||
      settings.amwalpay_secure_key_set ||
      settings.paymob_api_key_set ||
      settings.payment_bank_transfer_enabled
    )
  )

  const isCampaignOrTemplateActive = Boolean(
    conversationCount > 0 || orderCount > 0
  )

  const steps: StepItem[] = [
    {
      id: "whatsapp",
      title: "Connect WhatsApp Business Cloud API",
      description: "Link your Meta Business Manager number to send official templates, interactive lists, and real-time replies.",
      badge: "Required",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: WhatsAppIcon,
      iconBg: "bg-emerald-100 text-emerald-700",
      iconColor: "text-emerald-700",
      view: "whatsapp-setup",
      isCompleted: isWhatsAppConnected,
      actionText: isWhatsAppConnected ? "Manage API" : "Connect Number",
    },
    {
      id: "profile",
      title: "Complete Business Profile & Branding",
      description: "Set your legal company name, support phone, default currency (OMR/AED/USD), and customer communication details.",
      badge: "Essential",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Settings,
      iconBg: "bg-blue-100 text-blue-700",
      iconColor: "text-blue-700",
      view: "settings",
      isCompleted: isProfileConfigured,
      actionText: isProfileConfigured ? "Update Info" : "Setup Profile",
    },
    {
      id: "ai",
      title: "Configure AI Assistant & Auto-Greeting",
      description: "Train your AI assistant with custom tone of voice, FAQ knowledge base, and automated 24/7 customer workflows.",
      badge: "Automation",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      icon: Bot,
      iconBg: "bg-purple-100 text-purple-700",
      iconColor: "text-purple-700",
      view: "bot-builder",
      isCompleted: isAiConfigured,
      actionText: isAiConfigured ? "Edit Prompts" : "Customize AI",
    },
    {
      id: "payments",
      title: "Configure Payment Gateway (AmwalPay / Cards)",
      description: "Enable instant card and digital wallet checkout with verified payment notifications right inside WhatsApp chats.",
      badge: "Payments",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      icon: CreditCard,
      iconBg: "bg-amber-100 text-amber-700",
      iconColor: "text-amber-700",
      view: "settings",
      isCompleted: isPaymentConfigured,
      actionText: isPaymentConfigured ? "Review Gateway" : "Enable Payments",
    },
    {
      id: "campaign",
      title: "Launch First WhatsApp Broadcast / Template",
      description: "Engage your contacts and subscribers with approved Meta interactive templates and promotional announcements.",
      badge: "Growth",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
      icon: Megaphone,
      iconBg: "bg-rose-100 text-rose-700",
      iconColor: "text-rose-700",
      view: "campaigns",
      isCompleted: isCampaignOrTemplateActive,
      actionText: isCampaignOrTemplateActive ? "View Campaigns" : "Create Broadcast",
    },
  ]

  const completedCount = steps.filter(s => s.isCompleted).length
  const progressPercent = Math.round((completedCount / steps.length) * 100)

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem("fizmoh_tenant_onboarding_dismissed", "true")
    } catch {}
  }

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem("fizmoh_tenant_onboarding_collapsed", String(next))
    } catch {}
  }

  return (
    <Card className="border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-stone-50/60 rounded-2xl overflow-hidden shadow-xs">
      <CardContent className="p-4 sm:p-5">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-stone-900">
                  Tenant Setup &amp; Onboarding Checklist
                </h3>
                <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-100/70 text-emerald-800 border-emerald-300">
                  {completedCount} of {steps.length} Completed ({progressPercent}%)
                </Badge>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Complete these initial steps to fully activate your WhatsApp &amp; Omnichannel business workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-8 w-8 p-0 text-stone-500 hover:text-stone-800 rounded-lg"
              title={collapsed ? "Expand Checklist" : "Collapse Checklist"}
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            {completedCount === steps.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 w-8 p-0 text-stone-400 hover:text-stone-700 rounded-lg"
                title="Dismiss Checklist"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3.5 mb-2">
          <div className="w-full bg-stone-200/70 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Steps List */}
        {!collapsed && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-3 border-t border-stone-200/60">
            {steps.map((step, idx) => {
              const Icon = step.icon
              return (
                <div
                  key={step.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    step.isCompleted
                      ? "bg-white/80 border-stone-200/70 text-stone-700"
                      : "bg-white border-emerald-200/90 shadow-2xs hover:border-emerald-400"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${step.iconBg}`}>
                          <Icon className={`h-3.5 w-3.5 ${step.iconColor}`} />
                        </div>
                        <span className="text-[11px] font-bold text-stone-400 font-mono">
                          STEP 0{idx + 1}
                        </span>
                      </div>
                      {step.isCompleted ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>Ready</span>
                        </div>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${step.badgeColor}`}>
                          {step.badge}
                        </span>
                      )}
                    </div>

                    <h4 className={`text-xs sm:text-[13px] font-bold leading-snug ${step.isCompleted ? "text-stone-800 line-through opacity-85" : "text-stone-950"}`}>
                      {step.title}
                    </h4>
                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-stone-400">
                      {step.isCompleted ? "Configured" : "Pending setup"}
                    </span>
                    <Button
                      size="sm"
                      variant={step.isCompleted ? "outline" : "default"}
                      onClick={() => onNavigate(step.view)}
                      className={`h-7 text-xs font-semibold px-2.5 rounded-lg shadow-2xs ${
                        step.isCompleted
                          ? "border-stone-200 text-stone-600 hover:bg-stone-50"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      <span>{step.actionText}</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
