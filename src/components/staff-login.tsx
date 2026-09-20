"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/store"
import { useLanguage } from "@/context/language-context"
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
  Globe,
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
  const { isAr, toggleLang } = useLanguage()
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
    <div className={`min-h-screen bg-white text-[#1D1D1D] flex ${isAr ? "rtl font-sans" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Left: Branding & Pitch */}
      <aside className="hidden lg:flex w-[44%] flex-col justify-between p-12 bg-gradient-to-b from-[#FFF6DA]/60 via-[#FAFAFA] to-[#F2F2F2] border-r border-[#E5E7EB]">
        <div className="flex items-center justify-between">
          <Brand href="/" size="sm" className="text-[#1D1D1D]" />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              onClick={() => setView("customer-site")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[12px] font-bold text-[#1D1D1D] hover:bg-[#F2F2F2] transition shadow-xs"
            >
              <ArrowLeft className={`h-3.5 w-3.5 ${isAr ? "rotate-180" : ""}`} />
              <span>{isAr ? "الرئيسية" : "Home"}</span>
            </Link>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[12px] font-bold text-[#1D1D1D] hover:bg-[#F2F2F2] transition shadow-xs"
            >
              <Globe className="h-3.5 w-3.5 text-[#00B96A]" />
              <span>{isAr ? "English" : "العربية"}</span>
            </button>
          </div>
        </div>

        <div className="max-w-sm space-y-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight text-[#1D1D1D]">
            {isAr ? "عملاؤك ينتظرونك على واتساب الآن." : "Your customers are already on WhatsApp."}
          </h2>
          <p className="text-[#717680] leading-relaxed text-[14px]">
            {isAr
              ? "14 يوماً تجربة مجانية، بدون بطاقة بنكية. اربط رقمك التجاري وابدأ بالرد على الرسائل خلال دقائق."
              : "Fourteen days, no card, nothing to install. Connect your number and reply to the first message this afternoon."}
          </p>
          <ul className="space-y-3 pt-2">
            {[
              {
                icon: Zap,
                text: isAr ? "صندوق وارد موحد لكل محادثات فريقك" : "One inbox for every conversation",
              },
              {
                icon: Sparkles,
                text: isAr ? "أتمتة بالذكاء الاصطناعي تجيب العملاء 24/7" : "Automations that answer while you sleep",
              },
              {
                icon: ShieldCheck,
                text: isAr ? "بياناتك مشفرة ومعزولة بأعلى معايير الأمان" : "Your data stays yours, always",
              },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-[13.5px] font-medium text-[#1D1D1D]">
                <span className="h-7 w-7 rounded-[6px] bg-white border border-[#E5E7EB] grid place-items-center shrink-0 shadow-xs">
                  <item.icon className="h-4 w-4 text-[#00B96A]" />
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[12px] text-[#717680] font-medium">
          {isAr
            ? "مدعوم رسمياً من منصة واتساب للأعمال (Meta Cloud API)."
            : "Built on the official WhatsApp Business Platform."}
        </p>
      </aside>

      {/* Main Login Form */}
      <main className="flex-1 bg-white text-[#1D1D1D] flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden border-b border-[#E5E7EB] px-5 h-14 flex items-center justify-between">
          <Brand href="/" size="sm" className="text-[#1D1D1D]" />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              onClick={() => setView("customer-site")}
              className="text-[12px] font-bold text-[#1D1D1D] flex items-center gap-1 border border-[#E5E7EB] rounded-[6px] px-2.5 py-1 bg-[#F2F2F2]"
            >
              <ArrowLeft className={`h-3 w-3 ${isAr ? "rotate-180" : ""}`} />
            </Link>
            <button
              onClick={toggleLang}
              className="text-[12px] font-bold text-[#1D1D1D] flex items-center gap-1 border border-[#E5E7EB] rounded-[6px] px-2.5 py-1 bg-[#F2F2F2]"
            >
              <Globe className="h-3.5 w-3.5 text-[#00B96A]" />
              {isAr ? "EN" : "عربي"}
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm space-y-6">
            {/* Header / Intro */}
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-[#00B96A]">
                {isAr ? "تسجيل الدخول" : "WELCOME BACK"}
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#1D1D1D]">
                {isAr ? "تسجيل الدخول إلى مساحة العمل" : "Sign in to workspace"}
              </h1>
              <p className="mt-1 text-base text-[#717680]">
                {isAr
                  ? "الوصول إلى صندوق الوارد، أتمتة المحادثات، والبطاقات."
                  : "Access your enterprise inbox, botflow canvas, and cards."}
              </p>
            </div>

            {/* Segmented Method Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-[10px] bg-[#F2F2F2] border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => {
                  setMethod("password")
                  setSent(false)
                  setOtp("")
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                  method === "password"
                    ? "bg-white text-[#1D1D1D] border border-[#E5E7EB] shadow-xs"
                    : "text-[#717680] hover:text-[#1D1D1D]"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isAr ? "كلمة المرور" : "Password"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod("code")
                  setSent(false)
                  setOtp("")
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                  method === "code"
                    ? "bg-white text-[#1D1D1D] border border-[#E5E7EB] shadow-xs"
                    : "text-[#717680] hover:text-[#1D1D1D]"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isAr ? "رمز واتساب" : "WhatsApp Code"}</span>
              </button>
            </div>

            {/* Method 1: Password Flow */}
            {method === "password" ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-[13px] font-semibold text-[#1D1D1D] block mb-1.5">
                    {isAr ? "البريد الإلكتروني للعمل" : "Work Email Address"}
                  </Label>
                  <Input
                    autoFocus
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") signInWithPassword()
                    }}
                    placeholder="you@company.com"
                    className="h-11 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] placeholder:text-[#717680]/60 text-base focus:ring-2 focus:ring-[#00E785] focus:border-transparent transition ltr-force"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-[13px] font-semibold text-[#1D1D1D]">
                      {isAr ? "كلمة المرور" : "Password"}
                    </Label>
                    <button
                      type="button"
                      onClick={() => setMethod("code")}
                      className="text-[12px] text-[#00B96A] hover:text-[#009655] font-semibold transition-colors cursor-pointer"
                    >
                      {isAr ? "نسيت كلمة المرور؟" : "Forgot password?"}
                    </button>
                  </div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") signInWithPassword()
                    }}
                    placeholder="••••••••••••"
                    className="h-11 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] placeholder:text-[#717680]/60 text-base focus:ring-2 focus:ring-[#00E785] focus:border-transparent transition ltr-force"
                  />
                </div>

                {/* Sign In Primary CTA */}
                <Button
                  className="w-full h-11 bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] font-bold text-base rounded-[8px] border border-[#00B96A]/20 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  disabled={busy || !email || !password}
                  onClick={signInWithPassword}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#1D1D1D]" />
                  ) : (
                    <>
                      <span>{isAr ? "تسجيل الدخول إلى مساحة العمل" : "Sign In to Workspace"}</span>
                      <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                    </>
                  )}
                </Button>

                {/* Google SSO Container */}
                {googleClientId && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-[#E5E7EB]" />
                      <span className="text-[11px] uppercase tracking-wider text-[#717680] font-bold">
                        {isAr ? "أو المتابعة عبر" : "or continue with"}
                      </span>
                      <div className="h-px flex-1 bg-[#E5E7EB]" />
                    </div>
                    <div
                      id="google-signin-button"
                      className="flex justify-center rounded-[8px] overflow-hidden [&>div]:!w-full border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors"
                    />
                  </div>
                )}
              </div>
            ) : !sent ? (
              /* Method 2: One-Time Code Request */
              <div className="space-y-4">
                <div>
                  <Label className="text-[13px] font-semibold text-[#1D1D1D] block mb-1.5">
                    {isAr ? "البريد الإلكتروني أو رقم هاتف واتساب" : "Work Email or WhatsApp Number"}
                  </Label>
                  <Input
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendCode()
                    }}
                    placeholder="+968 9123 4567 or you@company.com"
                    className="h-11 rounded-[8px] bg-white border-[#E5E7EB] text-[#1D1D1D] placeholder:text-[#717680]/60 text-base focus:ring-2 focus:ring-[#00E785] focus:border-transparent transition ltr-force"
                  />
                </div>

                <div>
                  <Label className="text-[12px] font-semibold text-[#717680] block mb-1.5">
                    {isAr ? "قناة الإرسال" : "Dispatch Channel"}
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[10px] bg-[#F2F2F2] border border-[#E5E7EB]">
                    {[
                      { id: "whatsapp", label: isAr ? "محادثة واتساب" : "WhatsApp Chat", icon: WhatsAppIcon },
                      { id: "email", label: isAr ? "البريد الإلكتروني" : "Email Inbox", icon: Mail },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setChannel(opt.id as any)}
                        className={`flex items-center justify-center gap-1.5 rounded-[8px] py-2 text-xs font-semibold transition cursor-pointer ${
                          channel === opt.id
                            ? "bg-white text-[#1D1D1D] border border-[#E5E7EB] shadow-xs"
                            : "text-[#717680] hover:text-[#1D1D1D]"
                        }`}
                      >
                        <opt.icon className="h-3.5 w-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full h-11 bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] font-bold text-base rounded-[8px] border border-[#00B96A]/20 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  disabled={busy || !identifier}
                  onClick={sendCode}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#1D1D1D]" />
                  ) : (
                    <>
                      <span>{isAr ? "إرسال رمز التحقق (6 أرقام)" : "Send 6-Digit Code"}</span>
                      <ArrowRight className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Method 2 (Step 2): One-Time Code Verification */
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false)
                      setOtp("")
                    }}
                    className="text-xs text-[#717680] hover:text-[#1D1D1D] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className={`h-3.5 w-3.5 ${isAr ? "rotate-180" : ""}`} />
                    <span>{isAr ? "استخدام بريد/رقم آخر" : "Use different address"}</span>
                  </button>
                  <span className="text-[11px] text-[#00B96A] font-bold">
                    {isAr ? "تم إرسال الرمز" : "Code Dispatched"}
                  </span>
                </div>

                <div className="space-y-2 text-center">
                  <Label className="text-xs font-semibold text-[#1D1D1D]">
                    {isAr ? "أدخل رمز التحقق المكون من 6 أرقام" : "Enter 6-Digit Verification Code"}
                  </Label>
                  <p className="text-xs text-[#717680]">
                    {isAr ? "تم الإرسال إلى " : "Sent to "}
                    <span className="font-semibold text-[#1D1D1D]">{identifier}</span>.
                    {isAr ? " صالح لمدة 5 دقائق." : " Valid for 5 minutes."}
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
                            className="h-12 w-10 sm:w-11 text-lg font-bold bg-[#F2F2F2] border-[#E5E7EB] text-[#1D1D1D] rounded-[8px] focus:border-[#00E785] focus:ring-2 focus:ring-[#00E785]"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                {busy && (
                  <div className="flex items-center justify-center gap-2 text-xs text-[#717680]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00B96A]" />
                    <span>{isAr ? "جاري التحقق من بيانات الدخول..." : "Verifying credentials…"}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[#717680]">{isAr ? "لم يصلك الرمز؟" : "Didn't receive code?"}</span>
                  <button
                    type="button"
                    onClick={sendCode}
                    className="text-[#00B96A] font-bold hover:text-[#009655] transition-colors cursor-pointer"
                  >
                    {isAr ? "إعادة إرسال الرمز" : "Resend Code"}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Support & Signup Links */}
            <div className="pt-4 border-t border-[#E5E7EB] text-center space-y-2">
              <p className="text-[12.5px] text-[#717680]">
                {isAr ? "ليس لديك مساحة عمل بعد؟ " : "New to Fizmoh? "}
                <Link
                  href="/signup"
                  className="text-[#00B96A] font-bold hover:underline"
                >
                  {isAr ? "ابدأ التجربة المجانية لمدة 14 يوماً" : "Start 14-day free trial"}
                </Link>
              </p>
              <div className="flex items-center justify-center gap-2 text-[11px] text-[#717680]">
                <WhatsAppIcon className="h-3 w-3 text-[#00B96A]" />
                <span>{isAr ? "تحتاج مساعدة فورية؟" : "Need urgent help?"}</span>
                <a
                  href="https://wa.me/96898314456"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1D1D1D] font-medium hover:underline"
                >
                  {isAr ? "دعم واتساب" : "WhatsApp Support"}
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
