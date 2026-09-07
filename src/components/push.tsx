"use client"

import { useEffect } from "react"
import { useApp } from "@/lib/store"

interface OneSignalApi {
  init: (options: Record<string, unknown>) => Promise<void>
  login: (externalId: string) => Promise<void>
  logout: () => Promise<void>
  User: { PushSubscription: { optIn: () => Promise<void> } }
}

declare global {
  interface Window {
    OneSignalDeferred?: ((api: OneSignalApi) => void | Promise<void>)[]
  }
}

let started = false

/**
 * Push notifications for staff, so an alert arrives with the panel closed.
 *
 * The SDK is loaded only for signed-in staff: the customer site has no use for
 * it, and loading a third-party script on a public booking page for no reason
 * is a cost paid by every visitor.
 *
 * Configuration comes from the settings screen rather than a build-time
 * variable, so the App ID can be changed without a deploy.
 */
export function Push() {
  const { authMode, staffUser } = useApp()

  useEffect(() => {
    if (authMode !== "admin" || !staffUser || started) return
    if (typeof window === "undefined") return

    // OneSignal applications are origin-bound. The currently configured app
    // belongs to the legacy operator host; initializing it on app.fizmoh.cloud
    // throws a third-party exception on every authenticated page. Keep the
    // in-app notifications active until a matching app is configured.
    if (window.location.origin !== "https://wptour.fizmoh.cloud") return

    let cancelled = false

    ;(async () => {
      const res = await fetch("/api/config/public").catch(() => null)
      const data = await res?.json().catch(() => null)
      const appId: string = data?.onesignal?.appId
      const safariWebId: string = data?.onesignal?.safariWebId
      // No App ID configured yet: the in-app bell, sound and desktop
      // notifications still work, so there is nothing to warn about.
      if (!appId || cancelled) return

      started = true

      const script = document.createElement("script")
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      script.defer = true
      document.head.appendChild(script)

      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async OneSignal => {
        await OneSignal.init({
          appId,
          ...(safariWebId ? { safari_web_id: safariWebId } : {}),
          // The panel has its own bell and its own permission control, so the
          // SDK's floating button would be a second, conflicting one.
          notifyButton: { enable: false },
          // One service worker serves both this and the app shell. Registering
          // OneSignal's at the same scope would replace ours.
          serviceWorkerPath: "sw.js",
          serviceWorkerParam: { scope: "/" },
        })

        // Ties the device to the staff member so a notification can be sent to
        // one person rather than broadcast to everyone.
        await OneSignal.login(staffUser.id)

        // login() only associates this browser with the staff id — it does
        // not itself ask for notification permission or create a push
        // subscription. Without this, a signed-in staff member with no prior
        // subscription stays silently unsubscribed forever: sendPush's
        // include_aliases: external_id target has nobody to reach, and
        // nothing here ever surfaced that to them. optIn() requests the
        // browser's permission prompt (a no-op if already granted or denied)
        // and only then creates the subscription.
        await OneSignal.User.PushSubscription.optIn().catch(() => {
          // Denied or unsupported — the in-app bell still works.
        })
      })
    })()

    return () => { cancelled = true }
  }, [authMode, staffUser])

  return null
}
