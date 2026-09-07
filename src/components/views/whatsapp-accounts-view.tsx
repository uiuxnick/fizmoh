"use client"

import { WhatsAppCatalogCard } from "@/components/views/whatsapp-catalog-card"

import { useCallback, useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Smartphone, Plus, RefreshCw, ShieldCheck, Copy, Eye, EyeOff, Trash2,
  Star, AlertTriangle, Link2, KeyRound, Gauge, ExternalLink,
} from "lucide-react"

interface Account {
  id: string
  wabaId: string
  phoneNumberId: string
  businessId: string | null
  displayPhone: string | null
  verifiedName: string | null
  qualityRating: string | null
  messagingLimit: string | null
  codeVerification: string | null
  platformType: string | null
  throughput: string | null
  status: string
  lastError: string | null
  connectedVia: string
  isDefault: boolean
  webhookSubscribed: boolean
  registered: boolean
  syncedAt: string | null
  tokenPreview: string
}

/** Meta's own words, in colours that mean the same thing everywhere else. */
const QUALITY: Record<string, { label: string; className: string }> = {
  GREEN: { label: "High quality", className: "bg-emerald-100 text-emerald-700" },
  YELLOW: { label: "Medium quality", className: "bg-amber-100 text-amber-800" },
  RED: { label: "Low quality — at risk", className: "bg-rose-100 text-rose-700" },
  UNKNOWN: { label: "Not rated yet", className: "bg-stone-100 text-stone-600" },
}

/** The tier is a ceiling on how many people can be messaged in 24 hours. */
const LIMITS: Record<string, string> = {
  TIER_50: "50 customers / 24h",
  TIER_250: "250 customers / 24h",
  TIER_1K: "1,000 customers / 24h",
  TIER_10K: "10,000 customers / 24h",
  TIER_100K: "100,000 customers / 24h",
  TIER_UNLIMITED: "Unlimited",
  UNLIMITED: "Unlimited",
}

export default function WhatsAppAccountsView() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [config, setConfig] = useState<{ appId?: string; configId?: string }>({})
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkBlocked, setSdkBlocked] = useState(false)

  /*
   * What Facebook told us about the last completed sign-up.
   *
   * A ref rather than a value on `window`, and cleared before every attempt.
   * On the window it survived the dialog being cancelled, so a second attempt
   * — a different business, or the same one choosing differently — was sent
   * with the first attempt's account ids alongside its own fresh code, and
   * connected the wrong number.
   */
  const signup = useRef<{ waba_id?: string; phone_number_id?: string; business_id?: string; coexistence?: boolean } | null>(null)

  const load = useCallback(async (refresh = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/whatsapp/accounts${refresh ? "?refresh=1" : ""}`)
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch {
      toast.error("Could not load the connected numbers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // The app id and configuration id are public by design — they are in the
    // page source of every site that uses Facebook Login.
    fetch("/api/config/public")
      .then(r => r.json())
      .then(d => setConfig({ appId: d.metaAppId, configId: d.metaConfigId }))
      .catch(() => {})
  }, [load])

  /*
   * Facebook's SDK, loaded once the app id is known.
   *
   * It has to be injected into the document rather than rendered as JSX: React
   * inserts a <script> written in markup as an inert node and never executes
   * it, so window.FB stayed undefined and the button did nothing.
   */
  useEffect(() => {
    if (!config.appId) return

    const initFB = () => {
      const fb = (window as unknown as { FB?: any }).FB
      if (!fb) return false
      try {
        fb.init({
          appId: config.appId,
          autoLogAppEvents: true,
          cookie: true,
          xfbml: true,
          version: "v25.0",
        })
      } catch (e) {
        console.warn("[FB SDK] init error:", e)
      }
      setSdkReady(true)
      return true
    }

    // If the SDK already loaded (StrictMode double-mount, page re-visit), init
    // immediately and skip the whole injection dance.
    if (initFB()) return

    // Must be set BEFORE the <script> is appended. The SDK calls this
    // synchronously after it parses, so assigning it afterwards loses the race.
    ;(window as unknown as { fbAsyncInit?: () => void }).fbAsyncInit = () => {
      initFB()
    }

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script")
      script.id = "facebook-jssdk"
      // crossOrigin must NOT be set: Facebook's CDN does not send the
      // Access-Control-Allow-Origin header for script loads, so adding
      // crossOrigin="anonymous" makes the browser refuse to execute the SDK
      // and window.FB stays undefined.
      script.src = "https://connect.facebook.net/en_US/sdk.js"
      script.async = true
      script.defer = true
      script.onerror = () => {
        setSdkReady(true)
        setSdkBlocked(true)
      }
      document.head.appendChild(script)
    }

    // Belt-and-suspenders: if fbAsyncInit never fires within 6 seconds,
    // the SDK was blocked by an ad blocker (ERR_BLOCKED_BY_CLIENT) or the
    // network is down. Unblock the UI and show the warning.
    const timeout = window.setTimeout(() => {
      // Only flag as blocked if FB still didn't load
      if (!(window as unknown as { FB?: any }).FB) {
        setSdkBlocked(true)
      }
      setSdkReady(true)
    }, 6000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [config.appId])


  const act = async (id: string, action: string) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/whatsapp/accounts/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "That did not work")
      if (action === "reveal_token") {
        setRevealed(r => ({ ...r, [id]: data.token }))
        // Said out loud, because a revealed token on a shared screen is the
        // whole account.
        toast.warning("This is the full token. It has been written to the audit log.")
      } else {
        toast.success("Done")
        load()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That did not work")
    } finally {
      setBusy(null)
    }
  }

  const disconnect = async (account: Account) => {
    if (!confirm(
      `Disconnect ${account.displayPhone || account.phoneNumberId}?\n\n` +
      "Messages can no longer be sent from it. Conversations and their history stay.",
    )) return
    setBusy(account.id)
    try {
      const res = await fetch(`/api/whatsapp/accounts/${account.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Disconnected")
      load()
    } catch {
      toast.error("Could not disconnect it")
    } finally {
      setBusy(null)
    }
  }

  /**
   * Embedded Signup.
   *
   * The window is Facebook's; everything that matters happens after it closes.
   * The code it returns lives for thirty seconds, which is why it goes
   * straight to the server rather than being held in state.
   */
  /**
   * @param existingApp The business already uses this number in the WhatsApp
   * Business app on their phone, and wants to keep using it there.
   *
   * The two are genuinely different flows and only one of them can be offered
   * at a time: `featureType: "whatsapp_business_app_onboarding"` restricts the
   * dialog to connecting a number that is already running on a phone, so
   * setting it unconditionally — as this did — meant a business with no
   * WhatsApp Business app, wanting a brand new number, was shown a flow that
   * could not help them.
   */
  const startEmbeddedSignup = (existingApp: boolean) => {
    if (!config.appId || !config.configId) {
      toast.error("Add the Meta app ID and login configuration ID in Settings first")
      return
    }
    const fb = (window as unknown as { FB?: any }).FB
    if (!fb) {
      // Distinguished from a missing setting, because the fix is completely
      // different: an ad blocker or a slow network, not a wrong value.
      toast.error("Facebook's script has not loaded yet. Disable any ad blocker and try again.")
      return
    }

    // Nothing from a previous attempt may reach this one.
    signup.current = null

    try {
      fb.login(
        (response: any) => {
          const code = response?.authResponse?.code
          const accessToken = response?.authResponse?.accessToken
          if (!code && !accessToken) {
            console.warn("[embedded signup] Facebook returned no code:", response)

          /*
           * And to the server, where it can be read.
           *
           * This has now been diagnosed twice from a screenshot and a toast,
           * and twice wrongly. What Facebook actually returns is the only
           * thing that settles it, and asking somebody to open developer
           * tools mid-signup is not a diagnostic anybody will reliably
           * perform — least of all a customer of a customer.
           */
          fetch("/api/whatsapp/signup-diagnostic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ response, existingApp, configId: config.configId }),
          }).catch(() => {})

          const reason =
            response?.error_description ||
            response?.error?.message ||
            response?.error ||
            null

          /*
           * Signed in, but handed back a token instead of a code.
           *
           * `response_type: "code"` is only honoured by a *Facebook Login for
           * Business* configuration. Point the same call at an ordinary
           * Facebook Login configuration and the dialog completes happily,
           * returns an access token, and never produces the code Embedded
           * Signup needs — which from inside this callback is indistinguishable
           * from the window being closed, and was reported as a cancellation.
           */
          if (reason) {
            toast.error(`Facebook refused the sign-up: ${reason}`, { duration: 10000 })
          } else if (response?.status === "unknown" || !response?.status) {
            // The window closed without an answer. Genuinely a cancellation —
            // or a pop-up that never opened, which looks identical from here.
            toast.error(
              "The sign-up window closed before it finished. If you did not close it, allow pop-ups for this site and try again.",
              { duration: 10000 },
            )
          } else {
            toast.error(`The sign-up did not complete (${response.status}).`, { duration: 10000 })
          }
          return
        }
        // The account ids arrive on a window message, which only reaches this
        // page when the flow ran in a popup. It opens in a tab when popups are
        // blocked, and then the message never comes — so they are sent when
        // present and worked out from the token when not.
        const session = signup.current
        signup.current = null
        toast.loading("Connecting the number…", { id: "wa-connect" })
        fetch("/api/whatsapp/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "embedded",
            code,
            accessToken,
            wabaId: session?.waba_id,
            phoneNumberId: session?.phone_number_id,
            businessId: session?.business_id,
            /*
             * Whether the number stays live on the owner's phone.
             *
             * This decides three things on the server: that the number must
             * not be registered again, that their contacts and history have to
             * be asked for inside Meta's 24-hour window, and that a failed
             * registration is not reported as a broken connection. It was
             * being worked out here and then not sent, so none of it ran and
             * every coexistence connection was saved as "not registered".
             *
             * Facebook's own answer is trusted over the button that was
             * pressed, and the button is the fallback for a flow that finished
             * in a tab where no message could reach us.
             */
            coexistence: session?.coexistence ?? existingApp,
          }),
        })
          .then(async r => {
            const data = await r.json()
            toast.dismiss("wa-connect")
            if (!r.ok) throw new Error(data.error || "That number was not connected")
            ;(data.warnings || []).forEach((w: string) => toast.warning(w))
            if (data.importing) {
              toast.info(
                "Their contacts and chat history are on the way. It can take a few minutes to appear.",
                { duration: 8000 },
              )
            }
            toast.success("Number connected")
            load()
          })
          .catch(e => { toast.dismiss("wa-connect"); toast.error(e.message) })
      },
      {
        config_id: config.configId,
        response_type: "code",
        override_default_response_type: true,
        /*
         * Exactly what Meta documents for each flow, and nothing more.
         *
         * The standard sample is `extras: { setup: {} }`. `sessionInfoVersion`
         * appears only in the WhatsApp Business app onboarding documentation,
         * alongside `featureType` — and it was being sent on both, so the
         * ordinary "new number" flow was making a request in a shape Meta
         * publishes nowhere. Undocumented combinations are not a good place to
         * stand when the answer coming back is a plain login.
         */
        extras: existingApp
          ? { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" }
          : { setup: {} },
      },
    )
    } catch (e) {
      console.error("[embedded signup] fb.login error:", e)
      toast.error("Could not launch Facebook Login — allow pop-ups for this site and try again.")
    }
  }

  useEffect(() => {
    // Facebook posts the WABA and number ids back through the window, not
    // through the login callback. Both halves are needed to connect anything.
    const onMessage = (event: MessageEvent) => {
      /*
       * Only Facebook may hand us account ids.
       *
       * The previous test was `/facebook\.com$/` against the hostname, which
       * any page on `evilfacebook.com` also satisfies — and this message
       * decides which WhatsApp account gets connected to this workspace. An
       * exact host, or a subdomain of the real one, and nothing else.
       *
       * The origin is parsed inside the guard because a sandboxed frame sends
       * the literal string "null", which `new URL` throws on — and a throw
       * here used to take out the listener for every later message too.
       */
      let host: string
      try {
        host = new URL(event.origin).hostname
      } catch {
        return
      }
      if (host !== "facebook.com" && !host.endsWith(".facebook.com")) return

      try {
        const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data
        if (payload && payload.type === "WA_EMBEDDED_SIGNUP" && payload.event?.startsWith("FINISH")) {
          // FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING means the number stays on
          // the owner's phone and is already registered. Everything after this
          // differs, so the distinction is carried through rather than lost.
          signup.current = {
            ...payload.data,
            coexistence: payload.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
          }
        }
      } catch {
        // Facebook sends plenty of other things through this channel.
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  const copy = (value: string, what: string) => {
    navigator.clipboard.writeText(value)
    toast.success(`${what} copied`)
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-none space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-emerald-600" />
            </div>
            WhatsApp numbers
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            The numbers this platform can send from, and how Meta rates them
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load(true)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowManual(true)}>
            <KeyRound className="h-4 w-4 mr-1.5" /> Connect manually
          </Button>
          {/*
            * Two buttons, because Meta draws two different dialogs and the
            * choice has to be made before it opens. A business already using
            * WhatsApp Business on a phone keeps that phone working; a business
            * without one is creating an account from nothing. Offering only
            * the first — which is what a hardcoded featureType did — left the
            * second with a flow that could not help them.
            */}
          <Button
            variant="outline"
            onClick={() => startEmbeddedSignup(true)}
            disabled={!config.configId || !sdkReady}
            title={
              !config.configId
                ? "Add the login configuration ID in Settings"
                : !sdkReady
                  ? "Loading Facebook…"
                  : "Keeps the number working in their WhatsApp Business app, and brings their contacts and chat history across"
            }
          >
            <Smartphone className="h-4 w-4 mr-1.5" />
            Connect a number in use
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => startEmbeddedSignup(false)}
            disabled={!config.configId || !sdkReady}
            title={!config.configId ? "Add the login configuration ID in Settings" : !sdkReady ? "Loading Facebook…" : ""}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {sdkReady ? "New number" : "Loading Facebook…"}

          </Button>
        </div>
      </div>

      {!config.configId && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            <strong>Embedded Signup is not configured yet.</strong> Add the Meta app ID, app secret
            and login configuration ID in Settings → Embedded Signup. Connecting a number manually
            works without any of that.
          </CardContent>
        </Card>
      )}

      {sdkBlocked && config.configId && (
        <Card className="border-rose-300 bg-rose-50">
          <CardContent className="p-4 text-sm text-rose-900 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
            <div>
              <strong>An ad blocker is preventing Facebook Login from loading.</strong>
              <p className="mt-1 text-rose-800">
                Your browser blocked <code className="font-mono text-xs">connect.facebook.net</code> — the script Facebook
                requires to open the sign-up dialog. Disable your ad blocker (or content blocker extension) for{" "}
                <strong>app.fizmoh.cloud</strong>, then hard-refresh the page{" "}
                <kbd className="font-mono text-xs border border-rose-300 rounded px-1">Cmd+Shift+R</kbd> /{" "}
                <kbd className="font-mono text-xs border border-rose-300 rounded px-1">Ctrl+Shift+R</kbd>.
                The <strong>Connect manually</strong> button works without Facebook and does not require this.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && accounts.length === 0 ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
      ) : accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Smartphone className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">No number is connected yet.</p>
            <p className="text-xs text-stone-400 mt-1">
              Connect with Facebook if this app is an approved Tech Provider, or paste a token from
              your own Meta app.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {accounts.map(a => {
            const quality = QUALITY[String(a.qualityRating || "UNKNOWN").toUpperCase()] ?? QUALITY.UNKNOWN
            return (
              <Card key={a.id} className={a.isDefault ? "border-emerald-300" : ""}>
                <CardHeader className="flex-row items-start justify-between space-y-0 gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {a.verifiedName || "Unnamed business"}
                      {a.isDefault && (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <Star className="h-3 w-3 mr-1" /> Sends from this
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-stone-500 mt-0.5">
                      {a.displayPhone || "Number not confirmed"} ·{" "}
                      {a.connectedVia === "EMBEDDED_SIGNUP" ? "connected with Facebook" : "connected manually"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <Badge className={quality.className}>{quality.label}</Badge>
                    {a.status !== "CONNECTED" && (
                      <Badge className="bg-rose-100 text-rose-700">
                        <AlertTriangle className="h-3 w-3 mr-1" /> {a.status.toLowerCase()}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {a.lastError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                      {a.lastError}
                    </div>
                  )}

                  {/* What Meta will let this number do, which is the part that
                      decides whether a campaign is possible at all. */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-stone-500">
                        <Gauge className="h-3.5 w-3.5" /> Messaging limit
                      </div>
                      <div className="mt-1 font-semibold text-stone-900">
                        {LIMITS[String(a.messagingLimit || "").toUpperCase()] || a.messagingLimit || "Not set"}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-[11px] uppercase tracking-wide text-stone-500">Number verification</div>
                      <div className="mt-1 font-semibold text-stone-900">
                        {(a.codeVerification || "unknown").toLowerCase().replace(/_/g, " ")}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-[11px] uppercase tracking-wide text-stone-500">Throughput</div>
                      <div className="mt-1 font-semibold text-stone-900">
                        {a.throughput || a.platformType || "Standard"}
                      </div>
                    </div>
                  </div>

                  {/* The identifiers, because every support conversation with
                      Meta starts by asking for them. */}
                  <div className="rounded-lg border divide-y text-sm">
                    <IdRow label="Phone number ID" value={a.phoneNumberId} onCopy={copy} />
                    <IdRow label="WhatsApp business account ID" value={a.wabaId} onCopy={copy} />
                    {a.businessId && <IdRow label="Business portfolio ID" value={a.businessId} onCopy={copy} />}
                    <div className="flex items-center gap-3 p-3">
                      <span className="w-56 shrink-0 text-stone-500">Access token</span>
                      <code className="flex-1 truncate font-mono text-xs">
                        {revealed[a.id] ?? a.tokenPreview}
                      </code>
                      {revealed[a.id] ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => copy(revealed[a.id], "Token")}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRevealed(r => { const n = { ...r }; delete n[a.id]; return n })}
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" disabled={busy === a.id} onClick={() => act(a.id, "reveal_token")}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={a.webhookSubscribed ? "bg-emerald-50 text-emerald-700" : "bg-amber-100 text-amber-800"}>
                      <Link2 className="h-3 w-3 mr-1" />
                      {a.webhookSubscribed ? "Webhook subscribed" : "Webhook not subscribed"}
                    </Badge>
                    <Badge className={a.registered ? "bg-emerald-50 text-emerald-700" : "bg-amber-100 text-amber-800"}>
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      {a.registered ? "Registered for Cloud API" : "Not registered"}
                    </Badge>
                    {a.syncedAt && (
                      <span className="text-[11px] text-stone-400">
                        checked {new Date(a.syncedAt).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {!a.isDefault && (
                      <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => act(a.id, "make_default")}>
                        Send from this number
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => act(a.id, "refresh")}>
                      Check with Meta
                    </Button>
                    {!a.webhookSubscribed && (
                      <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => act(a.id, "resubscribe")}>
                        Subscribe webhook
                      </Button>
                    )}
                    {!a.registered && (
                      <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => act(a.id, "reregister")}>
                        Register number
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 ml-auto"
                      disabled={busy === a.id}
                      onClick={() => disconnect(a)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Disconnect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <WhatsAppCatalogCard />

      {showManual && <ManualConnectDialog onClose={() => setShowManual(false)} onDone={() => { setShowManual(false); load() }} />}
    </div>
  )
}



function IdRow({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string, w: string) => void }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <span className="w-56 shrink-0 text-stone-500">{label}</span>
      <code className="flex-1 truncate font-mono text-xs">{value}</code>
      <Button size="sm" variant="ghost" onClick={() => onCopy(value, label)}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

/**
 * The manual path.
 *
 * Embedded Signup needs Tech Provider approval, which takes weeks. Until then
 * — and for anybody running their own Meta app — this is the way in, and it
 * does exactly the same three things afterwards: check the token, point the
 * webhook at the business account, register the number.
 */
function ManualConnectDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [wabaId, setWabaId] = useState("")
  const [phoneNumberId, setPhoneNumberId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [saving, setSaving] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("https://app.fizmoh.cloud/api/whatsapp/webhook")
  const [webhookVerifyToken, setWebhookVerifyToken] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/whatsapp/config")
      .then(r => r.json())
      .then(d => {
        if (d.webhookUrl) setWebhookUrl(d.webhookUrl)
        if (d.fields?.webhookVerifyToken?.value) setWebhookVerifyToken(d.fields.webhookVerifyToken.value)
      })
      .catch(() => {})
  }, [])

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  const submit = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/whatsapp/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          wabaId: wabaId.trim(),
          phoneNumberId: phoneNumberId.trim(),
          accessToken: accessToken.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "That number was not connected")
      ;(data.warnings || []).forEach((w: string) => toast.warning(w))
      toast.success("Number connected")
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That number was not connected")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-stone-500" />
            Connect a number manually
          </CardTitle>
          <p className="text-xs text-stone-500 mt-1">
            Use this if you have your own Meta app and want to connect a number directly with a permanent token.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Step-by-step guide */}
          <div className="rounded-lg border bg-stone-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide">How to get these values</p>
            <ol className="space-y-2.5 text-xs text-stone-700">
              <li className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center text-[11px]">1</span>
                <span>
                  Open{" "}
                  <a
                    href="https://developers.facebook.com/apps/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 underline underline-offset-2 inline-flex items-center gap-0.5"
                  >
                    Meta Developer Portal <ExternalLink className="h-2.5 w-2.5" />
                  </a>{" "}
                  → select your app → <strong>WhatsApp → API Setup</strong>.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center text-[11px]">2</span>
                <span>
                  Copy the <strong>WhatsApp Business Account ID</strong> and <strong>Phone Number ID</strong> from the "From" section on that page.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center text-[11px]">3</span>
                <span>
                  In{" "}
                  <a
                    href="https://business.facebook.com/settings/system-users"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 underline underline-offset-2 inline-flex items-center gap-0.5"
                  >
                    Business Settings → System Users <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                  , create a system user, add the WhatsApp number as an asset, then generate a permanent token with{" "}
                  <code className="bg-stone-200 px-1 rounded">whatsapp_business_messaging</code> and{" "}
                  <code className="bg-stone-200 px-1 rounded">whatsapp_business_management</code> permissions.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex-none w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center text-[11px]">4</span>
                <span>
                  In your Meta app → <strong>WhatsApp → Configuration</strong>, set the webhook URL and verify token below, then subscribe to <strong>messages</strong> webhook field.
                </span>
              </li>
            </ol>
          </div>

          {/* Webhook details */}
          <div className="rounded-lg border divide-y">
            <div className="p-3">
              <p className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2 flex items-center gap-1.5">
                <Link2 className="h-3 w-3" /> Webhook URL
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-stone-50 border rounded px-2 py-1.5 truncate text-stone-800">
                  {webhookUrl}
                </code>
                <Button size="sm" variant="outline" onClick={() => copyText(webhookUrl, "Webhook URL")}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
              </div>
            </div>
            {webhookVerifyToken && (
              <div className="p-3">
                <p className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-2">
                  Webhook verify token
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-stone-50 border rounded px-2 py-1.5 truncate text-stone-800">
                    {webhookVerifyToken}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyText(webhookVerifyToken, "Verify token")}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs">WhatsApp business account ID</Label>
              <Input value={wabaId} onChange={e => setWabaId(e.target.value)} placeholder="1234567890" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Phone number ID</Label>
              <Input value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} placeholder="0987654321" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Permanent access token</Label>
              <Input
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder="EAA…"
                type="password"
                className="mt-1 font-mono"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Must be a permanent system user token — a temporary token stops working in 24 hours and every message fails without warning.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={saving || !wabaId.trim() || !phoneNumberId.trim() || accessToken.trim().length < 20}
              onClick={submit}
            >
              {saving ? "Checking with Meta…" : "Connect"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

