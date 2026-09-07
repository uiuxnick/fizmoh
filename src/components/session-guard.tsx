"use client"

import { useEffect } from "react"
import { useApp } from "@/lib/store"
import { toast } from "sonner"

/**
 * Resilient session guard.
 *
 * Signs the operator out ONLY when the session cookie has genuinely expired.
 * Ignores temporary 401s caused by deployment restarts, server reloads, or transient network glitches.
 */
export function SessionGuard() {
  const { authMode, logout } = useApp()

  useEffect(() => {
    if (authMode !== "admin") return

    const original = window.fetch
    let signingOut = false

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await original(...args)

      try {
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || ""
        const path = url.startsWith("http") ? new URL(url).pathname : url

        const ours = path.startsWith("/api/") && !path.startsWith("/api/auth/") && !path.startsWith("/api/staff/me")
        if (response.status === 401 && ours && !signingOut) {
          // Double-check with a 1-second delay & /api/staff/me to confirm it's not a deployment restart glitch
          setTimeout(async () => {
            if (signingOut) return
            try {
              const check = await original("/api/staff/me")
              if (check.status === 401) {
                signingOut = true
                toast.error("Your session has expired — please sign in again")
                setTimeout(() => logout(), 1200)
              }
            } catch {
              // Ignore network error during deployment restart
            }
          }, 1500)
        }
      } catch {
        /* never let the guard break the request it is watching */
      }

      return response
    }

    return () => { window.fetch = original }
  }, [authMode, logout])

  return null
}
