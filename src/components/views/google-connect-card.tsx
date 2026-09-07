"use client"

import { useEffect, useState } from "react"
import { Video, Calendar, Link2, Unlink, CheckCircle2, AlertCircle, Loader2, Sparkles, ExternalLink, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export function GoogleConnectCard({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [status, setStatus] = useState<{ connected: boolean; account: string | null; ready: boolean }>({
    connected: false,
    account: null,
    ready: false,
  })

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/google/status")
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (err) {
      console.error("Failed to load Google OAuth status", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()

    // Handle OAuth redirect return status query param
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const googleParam = urlParams.get("google")
      if (googleParam === "connected") {
        toast.success("Google account connected successfully! Appointments & Meet links enabled.")
        loadStatus()
        // Clean URL
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, "", cleanUrl)
      } else if (googleParam) {
        toast.error(`Google connection issue: ${googleParam}`)
      }
    }
  }, [])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch("/api/google/connect")
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to start Google sign in")
        setConnecting(false)
      }
    } catch (err) {
      toast.error("Network error starting Google sign in")
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm("Disconnect your Google account? Appointments will no longer auto-create Google Meet links.")) return
    setDisconnecting(true)
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clear: ["google_oauth_refresh_token", "google_oauth_account"],
        }),
      })
      if (res.ok) {
        toast.success("Google account disconnected")
        await loadStatus()
      } else {
        toast.error("Failed to disconnect Google account")
      }
    } catch {
      toast.error("Error disconnecting account")
    } finally {
      setDisconnecting(false)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-stone-50">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Video className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-900">Google Calendar & Meet</span>
              {status.connected ? (
                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px]">Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">Not Connected</Badge>
              )}
            </div>
            <p className="text-[11px] text-stone-500">
              {status.connected
                ? `Active account: ${status.account || "Connected Gmail"}`
                : "Connect your Gmail to auto-create Google Meet rooms for bookings."}
            </p>
          </div>
        </div>

        <div>
          {status.connected ? (
            <Button size="sm" variant="ghost" onClick={handleDisconnect} disabled={disconnecting} className="h-8 text-xs text-rose-600 hover:bg-rose-50">
              <Unlink className="h-3 w-3 mr-1" /> Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={handleConnect} disabled={connecting || loading} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
              {connecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
              Connect Gmail
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30 overflow-hidden shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                Google Calendar & Google Meet Integration
                {status.connected && (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-stone-500">
                Connect your Google account so customer appointments auto-sync to your Google Calendar and generate instant Google Meet video call links.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="py-4 flex items-center gap-2 text-xs text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> Checking connection state...
          </div>
        ) : status.connected ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Signed in as: <span className="font-mono text-emerald-800">{status.account || "Google Account"}</span>
              </div>
              <p className="text-xs text-emerald-700">
                ✓ All new appointments will automatically receive their own unique Google Meet video room link and sync to your Google Calendar.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={handleConnect} disabled={connecting} className="text-xs bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100">
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reconnect Account
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDisconnect} disabled={disconnecting} className="text-xs text-rose-600 hover:bg-rose-100">
                <Unlink className="h-3.5 w-3.5 mr-1" /> Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900">No Google Account Connected</h4>
                <p className="text-xs text-amber-800 leading-normal">
                  Connect your Gmail or Google Workspace account to enable automated Google Meet video links for every scheduled customer meeting.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
              <span className="text-[11px] text-amber-700">Requires 1-click Google OAuth sign in</span>
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
              >
                {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                Connect Google Account
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs text-stone-600">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-stone-50 border">
            <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Auto-syncs booked consultations to your Google Calendar</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-stone-50 border">
            <Video className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Generates instant HD Google Meet video links for clients</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
