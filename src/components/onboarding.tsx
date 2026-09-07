"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Brand } from "@/components/brand"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Check, Loader2, ArrowRight, LogOut, Sparkles, ShieldCheck, X } from "lucide-react"
import { useApp, type ViewKey } from "@/lib/store"

interface Step {
  id: string
  title: string
  body: string
  href: string
  action: string
  done: boolean
  required: boolean
}

function hrefToView(href: string): ViewKey | null {
  if (href.includes("numbers")) return "whatsapp-numbers"
  if (href.includes("settings")) return "settings"
  if (href.includes("tours")) return "tours"
  if (href.includes("automation") || href.includes("bot")) return "bot-builder"
  if (href.includes("whatsapp") || href.includes("inbox")) return "inbox"
  if (href.includes("dashboard")) return "dashboard"
  return null
}

export function Onboarding({ onSkip, staffName }: { onSkip: () => void; staffName?: string }) {
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const { setView } = useApp()

  useEffect(() => {
    fetch("/api/onboarding")
      .then(r => r.json())
      .then(d => { setSteps(d.steps ?? []); setReady(Boolean(d.ready)) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-stone-50">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    )
  }

  const done = steps.filter(step => step.done).length

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
          <Brand href={null} size="md" />
          <button
            onClick={() => { fetch("/api/auth/logout", { method: "POST" }).finally(() => location.reload()) }}
            className="text-sm text-stone-500 hover:text-stone-800 inline-flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {done} of {steps.length} done
        </p>
        <h1 className="mt-1.5 text-3xl font-bold text-stone-900">
          {staffName ? `Welcome, ${staffName.split(" ")[0]}` : "Welcome"}
        </h1>
        <p className="mt-2 text-stone-600">
          A few things and you are trading. The first one is the only one that has to happen
          now — until your number is connected, nothing can reach your customers.
        </p>

        <div className="mt-8 space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`rounded-2xl border p-5 transition ${
                step.done
                  ? "border-stone-200 bg-white/60"
                  : step.required
                    ? "border-emerald-300 bg-white ring-1 ring-emerald-100"
                    : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`h-8 w-8 rounded-full grid place-items-center text-sm font-bold shrink-0 ${
                  step.done ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-500"
                }`}>
                  {step.done ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className={`font-semibold ${step.done ? "text-stone-500 line-through" : "text-stone-900"}`}>
                      {step.title}
                    </h2>
                    {step.required && !step.done && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Needed first
                      </span>
                    )}
                  </div>
                  {!step.done && (
                    <>
                      <p className="mt-1 text-sm text-stone-600 leading-relaxed">{step.body}</p>
                      <Button
                        size="sm"
                        className={`mt-3 ${step.required ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                        variant={step.required ? "default" : "outline"}
                        onClick={() => {
                          const target = hrefToView(step.href)
                          if (target) {
                            setView(target)
                            onSkip()
                          } else {
                            window.location.href = step.href
                          }
                        }}
                      >
                        {step.action} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-stone-500">
            This list is here whenever you want it — it disappears once everything is ticked.
          </p>
          <Button variant="outline" onClick={onSkip}>
            {ready ? "Go to the dashboard" : "Look around first"}
          </Button>
        </div>
      </main>
    </div>
  )
}

/** The reminder that sits on top of the app until the list is finished. */
export function OnboardingBanner({ onOpen }: { onOpen?: () => void }) {
  const [state, setState] = useState<{ done: number; total: number; ready: boolean } | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const { setView } = useApp()

  const loadState = () => {
    fetch("/api/onboarding")
      .then(r => r.json())
      .then(d => {
        if (!d.applies || d.complete) {
          setState(null)
          return
        }
        setState({ done: d.done, total: d.total, ready: Boolean(d.ready) })
        setSteps(d.steps ?? [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadState()
  }, [])

  if (!state) return null

  return (
    <>
      <div
        className={`w-full px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between gap-3 shrink-0 border-b ${
          state.ready
            ? "bg-gradient-to-r from-stone-100 to-emerald-50/50 text-stone-700 border-stone-200/80"
            : "bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium border-amber-600"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className={`inline-flex rounded-full h-2 w-2 ${state.ready ? "bg-emerald-500" : "bg-white"}`} />
          </span>
          <span className="font-medium truncate">
            {state.ready
              ? `Setup ${state.done} of ${state.total} done — finish when you have a minute.`
              : "Your WhatsApp number is not connected yet, so nothing can be sent or received."}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            loadState()
            setModalOpen(true)
            onOpen?.()
          }}
          className={`shrink-0 font-bold underline px-2 py-0.5 rounded cursor-pointer transition-opacity hover:opacity-80 ${
            state.ready ? "text-emerald-800" : "text-white"
          }`}
        >
          Finish setup →
        </button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-5 sm:p-6 rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Setup {state.done} of {state.total} Completed
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-stone-900">
              Workspace Setup Checklist
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Complete these initial tasks to unleash full automated messaging, catalog showcase, and payments.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden my-2 border border-stone-200">
            <div
              className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${Math.round((state.done / Math.max(state.total, 1)) * 100)}%` }}
            />
          </div>

          {/* Steps List */}
          <div className="space-y-3 mt-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`p-4 rounded-xl border transition-all ${
                  step.done
                    ? "bg-stone-50/60 border-stone-200/80"
                    : step.required
                      ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-100"
                      : "bg-white border-stone-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      step.done
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {step.done ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-bold ${step.done ? "text-stone-500 line-through" : "text-stone-900"}`}>
                        {step.title}
                      </h4>
                      {step.required && !step.done && (
                        <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                          Required
                        </span>
                      )}
                      {step.done && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                          Completed ✓
                        </span>
                      )}
                    </div>

                    {!step.done && (
                      <>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">{step.body}</p>
                        <Button
                          size="sm"
                          className={`mt-2.5 text-xs font-semibold rounded-lg ${
                            step.required ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                          }`}
                          variant={step.required ? "default" : "outline"}
                          onClick={() => {
                            const target = hrefToView(step.href)
                            if (target) {
                              setView(target)
                              setModalOpen(false)
                            } else {
                              window.location.href = step.href
                            }
                          }}
                        >
                          {step.action} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between">
            <span className="text-xs text-stone-400">
              Auto-saved as tasks are completed.
            </span>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="rounded-xl text-xs">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
