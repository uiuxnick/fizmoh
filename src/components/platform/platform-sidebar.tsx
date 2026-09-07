"use client"

import {
  BarChart3, Building2, CreditCard, FileText, Globe, Headphones,
  LayoutDashboard, Megaphone, Package, Activity, Shield, LogOut,
  Settings, ChevronDown, ChevronRight, Smartphone, Gauge,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { cn } from "@/lib/utils"

export type PlatformSection =
  | "command-center"
  | "tenants"
  | "tenant-detail"
  | "billing"
  | "invoices"
  | "revenue"
  | "whatsapp-numbers"
  | "whatsapp-quality"
  | "support-tickets"
  | "announcements"
  | "plans"
  | "usage"
  | "webhooks"
  | "audit"
  | "leads"
  | "analytics"
  | "backups"

interface SidebarItem {
  key: PlatformSection
  label: string
  icon: React.ReactNode
  children?: { key: PlatformSection; label: string }[]
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    key: "command-center",
    label: "Command Center",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    key: "tenants",
    label: "Tenants",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    key: "billing",
    label: "Billing & Revenue",
    icon: <CreditCard className="h-4 w-4" />,
    children: [
      { key: "billing", label: "Subscriptions" },
      { key: "invoices", label: "Invoices & Dunning" },
      { key: "revenue", label: "Revenue Analytics" },
    ],
  },
  {
    key: "whatsapp-numbers",
    label: "WhatsApp Numbers",
    icon: <WhatsAppIcon className="h-4 w-4" />,
    children: [
      { key: "whatsapp-numbers", label: "Number Pool" },
      { key: "whatsapp-quality", label: "Quality Monitor" },
    ],
  },
  {
    key: "support-tickets",
    label: "Support Tickets",
    icon: <Headphones className="h-4 w-4" />,
  },
  {
    key: "announcements",
    label: "Announcements",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    key: "plans",
    label: "Plans & Modules",
    icon: <Package className="h-4 w-4" />,
  },
  {
    key: "usage",
    label: "Usage & Limits",
    icon: <Gauge className="h-4 w-4" />,
  },
  {
    key: "webhooks",
    label: "Webhooks & Health",
    icon: <Activity className="h-4 w-4" />,
  },
  {
    key: "audit",
    label: "Audit & Security",
    icon: <Shield className="h-4 w-4" />,
    children: [
      { key: "audit", label: "Audit Log" },
      { key: "leads", label: "Platform Leads" },
      { key: "backups", label: "Backups & Snapshots" },
    ],
  },
]

interface PlatformSidebarProps {
  activeSection: PlatformSection
  onSectionChange: (section: PlatformSection) => void
  operatorEmail?: string
  onLogout?: () => void
}

export function PlatformSidebar({
  activeSection,
  onSectionChange,
  operatorEmail = "operator@fizmoh.cloud",
  onLogout,
}: PlatformSidebarProps) {

  // Determine which parent groups should be expanded
  const expandedParent = (item: SidebarItem) => {
    if (!item.children) return false
    return item.children.some(c => c.key === activeSection) || item.key === activeSection
  }

  return (
    <aside className="w-64 bg-[#0A1628] text-white flex flex-col h-full shrink-0 overflow-hidden">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Globe className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white">FIZMOH</h1>
            <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Platform Control</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {SIDEBAR_ITEMS.map(item => {
          const isActive = item.key === activeSection
          const isExpanded = expandedParent(item)
          const hasChildren = !!item.children

          return (
            <div key={item.key}>
              <button
                onClick={() => onSectionChange(item.key)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150",
                  isActive && !hasChildren
                    ? "bg-emerald-500/15 text-emerald-400"
                    : isExpanded
                    ? "text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <span className={cn(
                  "shrink-0",
                  isActive && !hasChildren ? "text-emerald-400" : isExpanded ? "text-emerald-400" : ""
                )}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {hasChildren && (
                  <span className="text-slate-500">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </span>
                )}
              </button>

              {/* Children */}
              {hasChildren && isExpanded && (
                <div className="ml-6 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                  {item.children!.map(child => (
                    <button
                      key={child.key}
                      onClick={() => onSectionChange(child.key)}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150",
                        activeSection === child.key
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      )}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Operator Footer */}
      <div className="px-4 py-3 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-400">
            {operatorEmail.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-white truncate">{operatorEmail}</p>
            <p className="text-[9px] text-emerald-400/80 font-bold">PLATFORM OPERATOR</p>
          </div>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        )}
      </div>
    </aside>
  )
}
