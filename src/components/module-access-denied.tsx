import React from "react"
import Link from "next/link"
import { ShieldAlert, ArrowLeft, CreditCard, Lock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ModuleAccessDeniedProps {
  moduleName: string
  moduleKey?: string
  workspaceName?: string
  onBackToDashboard?: () => void
}

export default function ModuleAccessDenied({
  moduleName,
  moduleKey,
  workspaceName,
  onBackToDashboard,
}: ModuleAccessDeniedProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 md:p-8">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-6 md:p-8 text-center shadow-lg relative overflow-hidden">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-5 text-rose-600 shadow-sm">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100/70 border border-rose-200 text-rose-800 text-[11px] font-black uppercase tracking-wider mb-3">
          <Lock className="h-3 w-3" />
          403 – Access Denied
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight">
          Module Not Entitled
        </h2>

        <p className="mt-2.5 text-xs md:text-sm text-stone-600 leading-relaxed">
          Your workspace {workspaceName ? <strong className="text-stone-900 font-semibold">({workspaceName})</strong> : null} does not have access to the{" "}
          <strong className="text-stone-900 font-semibold">{moduleName}</strong> module.
        </p>

        <div className="mt-4 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 text-left text-xs text-stone-600 space-y-1.5">
          <div className="font-semibold text-stone-800 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Multi-Tenant Module Enforcement
          </div>
          <p className="text-[11px] leading-relaxed text-stone-500">
            Every module, route, and action is isolated and verified on the server. To unlock this module for your organization, ask your workspace owner to activate the module add-on.
          </p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
          {onBackToDashboard ? (
            <Button
              onClick={onBackToDashboard}
              variant="outline"
              className="w-full sm:w-auto h-9 text-xs border-stone-200 text-stone-700 hover:bg-stone-50 gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Dashboard
            </Button>
          ) : (
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full h-9 text-xs border-stone-200 text-stone-700 hover:bg-stone-50 gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Return to Dashboard
              </Button>
            </Link>
          )}

          <Link href="/billing" className="w-full sm:w-auto">
            <Button
              className="w-full h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
            >
              <CreditCard className="h-3.5 w-3.5" /> View Plan &amp; Add-ons
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
