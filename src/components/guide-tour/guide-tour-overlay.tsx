"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import { useTourStore } from "@/lib/tour-store"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ArrowRight, ArrowLeft, X, CheckCircle2, Lightbulb, Compass } from "lucide-react"
import { cn } from "@/lib/utils"

interface RectBounds {
  top: number
  left: number
  width: number
  height: number
  bottom: number
  right: number
}

export function GuideTourOverlay() {
  const { isTourActive, currentStepIndex, getActiveTour, nextStep, prevStep, endTour } = useTourStore()
  const { view, setView, setCampaignChannelFilter, setSubscriberChannelFilter, setSidebarOpen } = useApp()
  const [targetRect, setTargetRect] = useState<RectBounds | null>(null)
  const [isCentered, setIsCentered] = useState(false)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)

  const activeTour = getActiveTour()
  const currentStep = activeTour?.steps[currentStepIndex]

  // Auto-switch view, tabs, or filters if the step specifies it
  useEffect(() => {
    if (!isTourActive || !currentStep) return

    if (currentStep.viewKey && currentStep.viewKey !== view) {
      setView(currentStep.viewKey)
    }

    if (currentStep.tab && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("restaurant-tab", { detail: currentStep.tab }))
    }

    if (currentStep.campaignChannel) {
      setCampaignChannelFilter(currentStep.campaignChannel as any)
    }

    if (currentStep.subscriberChannel) {
      setSubscriberChannelFilter(currentStep.subscriberChannel as any)
    }

    // If target is in sidebar and mobile drawer is closed, open sidebar on smaller screens
    if (currentStep.target.includes("nav-") || currentStep.target.includes("sidebar-") || currentStep.target.includes("group-")) {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setSidebarOpen(true)
      }
    }
  }, [isTourActive, currentStep, view, setView, setCampaignChannelFilter, setSubscriberChannelFilter, setSidebarOpen])

  // Locate and measure target element
  const updateTargetBounds = useCallback(() => {
    if (!isTourActive || !currentStep) {
      setTargetRect(null)
      return
    }

    const el = document.querySelector(currentStep.target) as HTMLElement | null
    if (!el) {
      setTargetRect(null)
      setIsCentered(true)
      return
    }

    setIsCentered(false)
    const rect = el.getBoundingClientRect()
    const padding = 6

    const bounds: RectBounds = {
      top: Math.max(0, rect.top - padding),
      left: Math.max(0, rect.left - padding),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      bottom: rect.bottom + padding,
      right: rect.right + padding,
    }

    setTargetRect(bounds)

    // Calculate tooltip position
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cardWidth = Math.min(380, vw - 32)
    const cardHeight = 260 // approx estimated height
    const gap = 14

    let top = 0
    let left = 0

    const preferred = currentStep.placement || "bottom"

    if (preferred === "right" && bounds.right + gap + cardWidth < vw) {
      left = bounds.right + gap
      top = Math.max(16, Math.min(bounds.top, vh - cardHeight - 20))
    } else if (preferred === "left" && bounds.left - gap - cardWidth > 0) {
      left = bounds.left - gap - cardWidth
      top = Math.max(16, Math.min(bounds.top, vh - cardHeight - 20))
    } else if (preferred === "top" && bounds.top - gap - cardHeight > 0) {
      top = bounds.top - gap - cardHeight
      left = Math.max(16, Math.min(bounds.left + (bounds.width - cardWidth) / 2, vw - cardWidth - 16))
    } else {
      // Default bottom or fallback
      if (bounds.bottom + gap + cardHeight < vh) {
        top = bounds.bottom + gap
        left = Math.max(16, Math.min(bounds.left + (bounds.width - cardWidth) / 2, vw - cardWidth - 16))
      } else if (bounds.top - gap - cardHeight > 0) {
        top = bounds.top - gap - cardHeight
        left = Math.max(16, Math.min(bounds.left + (bounds.width - cardWidth) / 2, vw - cardWidth - 16))
      } else {
        // Center fallback
        top = Math.max(20, (vh - cardHeight) / 2)
        left = Math.max(16, (vw - cardWidth) / 2)
      }
    }

    setTooltipPos({ top, left })
  }, [isTourActive, currentStep])

  // Scroll target into view & update bounds on step change
  useEffect(() => {
    if (!isTourActive || !currentStep) return

    const timer = setTimeout(() => {
      const el = document.querySelector(currentStep.target) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
      }
      updateTargetBounds()
    }, 120)

    return () => clearTimeout(timer)
  }, [isTourActive, currentStep, currentStepIndex, updateTargetBounds])

  // Window resize and scroll listeners
  useEffect(() => {
    if (!isTourActive) return
    const handleScrollOrResize = () => updateTargetBounds()
    window.addEventListener("resize", handleScrollOrResize)
    window.addEventListener("scroll", handleScrollOrResize, true)
    return () => {
      window.removeEventListener("resize", handleScrollOrResize)
      window.removeEventListener("scroll", handleScrollOrResize, true)
    }
  }, [isTourActive, updateTargetBounds])

  // Keyboard navigation
  useEffect(() => {
    if (!isTourActive) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        endTour()
      } else if (e.key === "ArrowRight") {
        nextStep()
      } else if (e.key === "ArrowLeft") {
        prevStep()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isTourActive, nextStep, prevStep, endTour])

  if (!isTourActive || !activeTour || !currentStep) return null

  const totalSteps = activeTour.steps.length
  const stepNumber = currentStepIndex + 1
  const isLastStep = stepNumber === totalSteps
  const progressPercent = Math.round((stepNumber / totalSteps) * 100)

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto select-none overflow-hidden font-sans">
      {/* SVG Spotlight Mask */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300 ease-out"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White background reveals the dark backdrop */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Cut out target element if visible */}
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="10"
                ry="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Semi-transparent dark overlay */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.72)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Target glowing highlight border */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-emerald-400/90 shadow-[0_0_24px_rgba(52,211,153,0.45)] pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      {/* Floating Tour Step Card */}
      <div
        ref={tooltipRef}
        style={
          isCentered
            ? {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(400px, calc(100vw - 32px))",
              }
            : {
                position: "fixed",
                top: tooltipPos.top,
                left: tooltipPos.left,
                width: "min(380px, calc(100vw - 32px))",
              }
        }
        className={cn(
          "bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 text-slate-100 rounded-2xl shadow-2xl p-4 sm:p-5 z-[10000] pointer-events-auto transition-all duration-300 ease-out animate-in fade-in zoom-in-95",
        )}
      >
        {/* Top Header & Progress */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">{activeTour.icon}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/80">
              {activeTour.title}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {stepNumber} of {totalSteps}
            </span>
          </div>
          <button
            type="button"
            onClick={endTour}
            aria-label="Close tour"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-3.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white tracking-tight leading-snug mb-1.5 flex items-center gap-1.5">
          {currentStep.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          {currentStep.description}
        </p>

        {/* Pro Tip Box (if provided) */}
        {currentStep.tip && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-[11px] text-emerald-200 mb-4">
            <Lightbulb className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{currentStep.tip}</span>
          </div>
        )}

        {/* Actions & Navigation Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <button
            type="button"
            onClick={endTour}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={prevStep}
                className="h-8 px-2.5 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white rounded-xl"
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Back
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={nextStep}
              className="h-8 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-950/60"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Got it!
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Keyboard Hint */}
        <div className="mt-2 text-center text-[10px] text-slate-400 font-mono">
          Use <span className="text-slate-300 font-semibold">←</span> / <span className="text-slate-300 font-semibold">→</span> arrow keys or <span className="text-slate-300 font-semibold">Esc</span>
        </div>
      </div>
    </div>
  )
}
