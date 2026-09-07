"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, X, WifiOff } from "lucide-react"

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "wptour.installDismissed"

/**
 * Registers the service worker and offers installation.
 *
 * Installing matters here beyond convenience: an installed app keeps running in
 * its own window, so alerts are not lost behind a wall of browser tabs, and it
 * is the prerequisite for push notifications on iOS.
 */
export function PWA() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [offline, setOffline] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(error => {
        console.error("Service worker registration failed:", error)
      })
    }

    const dismissedTimer = window.setTimeout(() => {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "1")
    }, 0)

    const onPrompt = (event: Event) => {
      // Chrome fires this instead of showing its own prompt once the criteria
      // are met, so it has to be captured and replayed on a click.
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    const onInstalled = () => { setPrompt(null); localStorage.setItem(DISMISSED_KEY, "1") }
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)

    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    window.addEventListener("offline", goOffline)
    window.addEventListener("online", goOnline)
    const connectivityTimer = window.setTimeout(() => setOffline(!navigator.onLine), 0)

    return () => {
      window.clearTimeout(dismissedTimer)
      window.clearTimeout(connectivityTimer)
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
      window.removeEventListener("offline", goOffline)
      window.removeEventListener("online", goOnline)
    }
  }, [])

  return (
    <>
      {offline && (
        <div className="fixed top-0 inset-x-0 z-[70] bg-amber-500 text-white text-xs font-medium py-1.5 text-center flex items-center justify-center gap-1.5">
          <WifiOff className="h-3.5 w-3.5" />
          You are offline — bookings and messages will not update until the connection returns
        </div>
      )}

      {prompt && !dismissed && (
        <div className="fixed bottom-4 right-4 z-[70] max-w-xs rounded-xl border bg-white shadow-lg p-3">
          <div className="flex items-start gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              FZ
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-stone-900">Install the admin app</div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Runs in its own window, so alerts are not lost behind other tabs.
              </p>
              <div className="flex gap-1.5 mt-2">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                  onClick={async () => {
                    await prompt.prompt()
                    await prompt.userChoice
                    setPrompt(null)
                  }}
                >
                  <Download className="h-3 w-3 mr-1" />Install
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { setDismissed(true); localStorage.setItem(DISMISSED_KEY, "1") }}
                >
                  Not now
                </Button>
              </div>
            </div>
            <button
              aria-label="Dismiss install prompt"
              onClick={() => { setDismissed(true); localStorage.setItem(DISMISSED_KEY, "1") }}
              className="text-stone-400 hover:text-stone-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
