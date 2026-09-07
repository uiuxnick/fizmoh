"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { toast } from "sonner"
import Link from "next/link"
import { Brand } from "@/components/brand"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  Globe2,
} from "lucide-react"

/**
 * Signing in.
 *
 * Two ways, because the two failure modes are different people. Somebody at
 * their desk has a password manager and wants the password field. Somebody on
 * a phone in a car park has forgotten it and needs a code on WhatsApp — and
 * making them "reset" a password they will forget again is a worse answer than
 * simply letting them in with a code.
 *
 * Nothing here says which accounts exist. The code path answers identically
 * whether or not the address is real, because a different response would turn
 * this into a way to enumerate who works at a business.
 */
export function StaffLogin() {
  const { setStaffAuth, setView } = useApp()
  const [method, setMethod] = useState<"password" | "code">("password")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp")
  const [otp, setOtp] = useState("")
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  /*
   * Sign in with Google.
   *
   * The server has verified Google identity tokens all along — it is how the
   * phone app signs in — but the dashboard never offered it, so on the web the
   * only ways in were a password and a one-time code.
   *
   * No account is created from a Google sign-in. The token proves who somebody
   * is; it does not make them staff. An address with no active account here is
   * refused, which is what stops "sign in with Google" from meaning "anybody
   * with a Gmail address can open this inbox". So this signs in to an account
   * that already exists, matched on the verified email address.
   */
  const [googleClientId, setGoogleClientId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const magic = params.get("magic") || params.get("token")
    if (magic) {
      window.location.href = `/api/auth/magic-login?token=${encodeURIComponent(magic)}`
      return
    }

    const err = params.get("error")
    if (err) {
      if (err === "invalid_or_expired_magic_link") {
        toast.error("That 1-click login link has expired or has already been used. Please request a new code.")
      } else if (err === "too_many_attempts") {
        toast.error("Too many login attempts. Please try again shortly.")
      } else if (err === "account_not_found") {
        toast.error("Account not found or inactive. Please contact your administrator.")
      } else {
        toast.error("Sign-in failed. Please try signing in again.")
      }
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, "", cleanUrl)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/config/public")
      .then(r => r.json())
      .then(d => { if (!cancelled) setGoogleClientId(d.googleClientId || null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!googleClientId || method !== "password") return

    const render = () => {
      const google = (window as any).google
      const target = document.getElementById("google-signin-button")
      if (!google?.accounts?.id || !target) return
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: any) => {
          if (!response?.credential) return
          setBusy(true)
          try {
            const res = await fetch("/api/auth/provider-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ provider: "google", idToken: response.credential }),
            })
            const data = await res.json()
            if (!res.ok) {
              // The server already distinguishes "no account for that address"
              // from "that account is deactivated", and both are things the
              // person has to act on. Its wording is kept.
              toast.error(data.error || "That sign-in could not be completed", { duration: 9000 })
              return
            }
            arrive(data)
          } catch {
            toast.error("Could not reach the server")
          } finally {
            setBusy(false)
          }
        },
      })
      /*
       * Google's own button: it carries the branding rules and the accessible
       * name, and it is the only form Google supports.
       *
       * The locale is pinned to the page's rather than left to Google, which
       * otherwise reads the browser's — so an English dashboard rendered an
       * Arabic button beside an English "Sign in". The width is taken from the
       * card, not the flex wrapper, so it lines up with the fields above it.
       */
      const locale = (document.documentElement.lang || "en").split("-")[0]
      const width = Math.round(
        target.parentElement?.getBoundingClientRect().width || target.clientWidth || 320,
      )
      google.accounts.id.renderButton(target, {
        theme: "outline",
        size: "large",
        width: Math.min(Math.max(width, 200), 400),
        text: "signin_with",
        shape: "rectangular",
        locale,
      })
    }

    if ((window as any).google?.accounts?.id) { render(); return }

    // Injected rather than written as JSX: React renders a <script> in markup
    // as an inert node and never executes it.
    const existing = document.getElementById("google-identity-script") as HTMLScriptElement | null
    if (existing) { existing.addEventListener("load", render); return }
    const script = document.createElement("script")
    script.id = "google-identity-script"
    /*
     * The language is fixed when this script loads, not when the button is
     * rendered.
     *
     * `locale` on renderButton is documented but did not take: the library
     * localises itself from its own load, so it read the browser's language
     * and drew an Arabic button next to an English "Sign in". `?hl=` is the
     * parameter that actually decides it.
     */
    script.src = `https://accounts.google.com/gsi/client?hl=${encodeURIComponent(
      (document.documentElement.lang || "en").split("-")[0],
    )}`
    script.async = true
    script.defer = true
    script.onload = render
    script.onerror = () => toast.error("Google's sign-in script could not be loaded — check for a blocker")
    document.head.appendChild(script)
  }, [googleClientId, method])

  function arrive(data: { token: string; staff: unknown }) {
    setStaffAuth(data.token, data.staff as never)
    const role = (data.staff as any)?.role
    if (role === "SUPER_ADMIN") {
      setView("platform")
      if (typeof window !== "undefined") {
        window.history.replaceState({ view: "platform" }, "", "/platform")
      }
    } else {
      setView("dashboard")
      if (typeof window !== "undefined") {
        window.history.replaceState({ view: "dashboard" }, "", "/dashboard")
      }
    }
  }

  async function signInWithPassword() {
    if (!email || !password) return
    setBusy(true)
    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || "Those details did not work"); return }
      arrive(data)
    } catch {
      toast.error("Could not reach the server")
    } finally {
      setBusy(false)
    }
  }

  async function sendCode() {
    if (!identifier) return
    setBusy(true)
    try {
      const response = await fetch("/api/auth/staff-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, channel }),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || "Could not send a code"); return }
      setSent(true)
      toast.success(data.message || "If that account exists, a code is on its way.")
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(code: string) {
    setBusy(true)
    try {
      const response = await fetch("/api/auth/staff-verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, otp: code }),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || "That code is not valid"); setOtp(""); return }
      arrive(data)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between relative overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* Ambient Radial Blooms & Grid Mesh */}
      <div
        className="absolute -top-40 left-1/4 w-[700px] h-[700px] bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-40 right-10 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-600/10 via-amber-500/5 to-transparent rounded-full blur-[150px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Header Navigation */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 pt-12 pb-4 sm:py-6 flex items-center justify-between">
        <Link
          href="/"
          onClick={() => setView("customer-site")}
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors group cursor-pointer"
        >
          <div className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          </div>
          <span>Back to Homepage</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Meta Cloud API · 99.99% Uptime</span>
          </div>

          <Link
            href="/signup"
            className="text-xs font-bold px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 text-white transition-all cursor-pointer"
          >
            Create Workspace
          </Link>
        </div>
      </header>

      {/* Centerpiece Content Grid */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Brand Showcase & Interactive Enterprise Card (Desktop) */}
          <div className="hidden lg:flex flex-col space-y-8 lg:col-span-6 xl:col-span-7 pr-6">
            <div>
              <Link href="/" className="inline-block transition-transform hover:scale-[1.01]">
                <img
                  src="/brand/fizmoh-mascot-logo.png"
                  alt="Fizmoh — Automate, Connect, Grow"
                  className="h-16 sm:h-20 w-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
                />
              </Link>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11.5px] font-bold text-emerald-400 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Enterprise Operating System</span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
                Powering high-velocity commerce on{" "}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
                  WhatsApp Cloud API
                </span>
              </h1>
              <p className="text-base text-zinc-400 leading-relaxed max-w-xl">
                Unified multi-agent team inbox, automated botflows, digital vCards, and native AmwalPay checkout for high-growth enterprises in Oman & the GCC.
              </p>
            </div>

            {/* Live Interactive Enterprise Card Preview */}
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950/90 p-6 shadow-2xl backdrop-blur-xl space-y-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Status Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <WhatsAppIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-white">Grand Hyatt Muscat VIP Desk</h4>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/20" />
                    </div>
                    <p className="text-xs text-zinc-400">Meta Verified Cloud API · +968 2464 1234</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-300">
                  ⚡ 42ms Live Webhook
                </span>
              </div>

              {/* Message Simulation */}
              <div className="space-y-2.5 pt-1">
                <div className="rounded-xl rounded-tl-none bg-emerald-950/40 border border-emerald-500/20 p-3.5 text-xs text-zinc-200 space-y-2">
                  <p className="leading-relaxed">
                    “Your Royal Suite booking has been confirmed with AmwalPay (OMR 185.00). Your Executive Digital Key & Concierge vCard are ready below.”
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                      ✓ Paid via AmwalPay Gateway
                    </span>
                    <span className="rounded-lg bg-zinc-800/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 border border-white/10">
                      📇 vCard 2.0 Synced
                    </span>
                  </div>
                </div>
              </div>

              {/* Feature Pills */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { icon: Zap, label: "99.99% Delivery SLA", desc: "Meta Tier 3 Verified" },
                  { icon: ShieldCheck, label: "Enterprise Security", desc: "SOC2 & 256-Bit TLS" },
                  { icon: Globe2, label: "GCC Localized", desc: "Oman & GCC Native Gateways" },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left">
                    <item.icon className="h-4 w-4 text-emerald-400 mb-1.5" />
                    <p className="text-[12px] font-bold text-zinc-200">{item.label}</p>
                    <p className="text-[10.5px] text-zinc-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: $10M Auth Card */}
          <div className="w-full max-w-[450px] mx-auto lg:col-span-6 xl:col-span-5">
            {/* Mobile Brand Mascot Logo */}
            <div className="lg:hidden text-center mb-6">
              <Link href="/" className="inline-block">
                <img
                  src="/brand/fizmoh-mascot-logo.png"
                  alt="Fizmoh"
                  className="h-14 w-auto mx-auto object-contain drop-shadow-xl"
                />
              </Link>
            </div>

            <div className="relative rounded-[28px] border border-white/10 bg-zinc-900/80 p-7 sm:p-9 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-emerald-400/50 before:to-transparent">
              {/* Card Header */}
              <div className="space-y-1.5 text-left mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-white">Sign in to Workspace</h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Access your enterprise inbox, botflow canvas, and cards.
                </p>
              </div>

              {/* Segmented Method Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/40 border border-white/10 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMethod("password")
                    setSent(false)
                    setOtp("")
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    method === "password"
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod("code")
                    setSent(false)
                    setOtp("")
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    method === "code"
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>WhatsApp Code</span>
                </button>
              </div>

              {/* Method 1: Password Flow */}
              {method === "password" ? (
                <div className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <Label className="text-xs font-semibold text-zinc-300">Work Email Address</Label>
                    <div className="relative">
                      <Input
                        autoFocus
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") signInWithPassword()
                        }}
                        placeholder="you@company.com"
                        className="h-11 bg-white/[0.04] border-white/10 rounded-xl px-3.5 text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-zinc-300">Password</Label>
                      <button
                        type="button"
                        onClick={() => setMethod("code")}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") signInWithPassword()
                        }}
                        placeholder="••••••••••••"
                        className="h-11 bg-white/[0.04] border-white/10 rounded-xl px-3.5 text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                      />
                    </div>
                  </div>

                  {/* Sign In Primary CTA */}
                  <Button
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer text-sm"
                    disabled={busy || !email || !password}
                    onClick={signInWithPassword}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <span>Sign In to Workspace</span>
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {/* Google SSO Container */}
                  {googleClientId && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                          or continue with
                        </span>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                      <div
                        id="google-signin-button"
                        className="flex justify-center rounded-xl overflow-hidden [&>div]:!w-full border border-white/10 hover:border-white/20 transition-colors"
                      />
                    </div>
                  )}
                </div>
              ) : !sent ? (
                /* Method 2: One-Time Code Request */
                <div className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-300">
                      Work Email or WhatsApp Number
                    </Label>
                    <Input
                      autoFocus
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendCode()
                      }}
                      placeholder="+968 9123 4567 or you@company.com"
                      className="h-11 bg-white/[0.04] border-white/10 rounded-xl px-3.5 text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-400">Dispatch Channel</Label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
                      {[
                        { id: "whatsapp", label: "WhatsApp Chat", icon: WhatsAppIcon },
                        { id: "email", label: "Email Inbox", icon: Mail },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setChannel(opt.id as any)}
                          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${
                            channel === opt.id
                              ? "bg-white/15 text-white border border-white/20 shadow-sm"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          <opt.icon className="h-3.5 w-3.5" />
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer text-sm"
                    disabled={busy || !identifier}
                    onClick={sendCode}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <span>Send 6-Digit Code</span>
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                /* Method 2 (Step 2): One-Time Code Verification */
                <div className="space-y-5 text-left">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSent(false)
                        setOtp("")
                      }}
                      className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Use different address</span>
                    </button>
                    <span className="text-[11px] text-emerald-400 font-semibold">Code Dispatched</span>
                  </div>

                  <div className="space-y-2 text-center">
                    <Label className="text-xs font-semibold text-zinc-300">
                      Enter 6-Digit Verification Code
                    </Label>
                    <p className="text-xs text-zinc-400">
                      Sent to <span className="font-semibold text-white">{identifier}</span>. Valid for 5 minutes.
                    </p>

                    <div className="flex justify-center pt-2">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(value) => {
                          setOtp(value)
                          if (value.length === 6) verifyCode(value)
                        }}
                      >
                        <InputOTPGroup className="gap-2">
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="h-12 w-10 sm:w-11 text-lg font-bold bg-white/[0.04] border-white/20 text-emerald-400 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  {busy && (
                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                      <span>Verifying cryptographic credentials…</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-zinc-500">Didn't receive code?</span>
                    <button
                      type="button"
                      onClick={sendCode}
                      className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Support & Signup Links */}
              <div className="mt-8 pt-5 border-t border-white/10 text-center space-y-3">
                <p className="text-xs text-zinc-400">
                  New to Fizmoh?{" "}
                  <Link
                    href="/signup"
                    className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors underline-offset-4 hover:underline cursor-pointer"
                  >
                    Start 14-day free trial
                  </Link>
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500">
                  <WhatsAppIcon className="h-3 w-3 text-emerald-500" />
                  <span>Need urgent help?</span>
                  <a
                    href="https://wa.me/96892000000"
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-400 hover:text-white transition-colors underline cursor-pointer"
                  >
                    WhatsApp Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11.5px] text-zinc-500">
        <p>© {new Date().getFullYear()} Fizmoh Cloud Platform. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-zinc-300 transition-colors">
            Terms of Service
          </Link>
          <Link href="/acceptable-use" className="hover:text-zinc-300 transition-colors">
            Acceptable Use
          </Link>
          <span className="text-emerald-500/80 font-semibold">Meta Cloud API Certified</span>
        </div>
      </footer>
    </div>
  )
}

