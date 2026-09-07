"use client"

import { useState } from "react"
import Link from "next/link"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Shield,
  Sparkles,
  ArrowRight,
  Phone,
  Mail,
  Lock,
  ChevronRight,
  Globe,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  MessageSquare,
  HelpCircle,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

export default function LoginPage({ initialMode = "admin" }: { initialMode?: "choice" | "admin" | "customer" }) {
  const { setStaffAuth, setCustomerAuth, setAuthMode, setView } = useApp()
  const [activeTab, setActiveTab] = useState<"admin" | "customer">(initialMode === "customer" ? "customer" : "admin")

  const goToHomepage = () => {
    setAuthMode(null)
    setView("customer-site")
  }

  // ─── Admin / Staff Login State ───
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [adminLoading, setAdminLoading] = useState(false)

  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword) {
      toast.error("Please enter both your email address and password")
      return
    }
    setAdminLoading(true)
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        setStaffAuth(data.token, data.staff)
        setView("dashboard")
        toast.success(`Welcome back, ${data.staff.name || "Operator"}!`)
      } else {
        toast.error(data.error || "Invalid email or password")
      }
    } catch {
      toast.error("Network error while logging in")
    } finally {
      setAdminLoading(false)
    }
  }

  // ─── Customer WhatsApp OTP State ───
  const [customerPhone, setCustomerPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [customerLoading, setCustomerLoading] = useState(false)

  const handleSendOtp = async () => {
    if (!customerPhone.trim()) {
      toast.error("Please enter your WhatsApp mobile number")
      return
    }
    setCustomerLoading(true)
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerPhone.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setOtpSent(true)
        toast.success("Verification code sent via WhatsApp!")
      } else {
        toast.error(data.error || "Failed to dispatch verification code")
      }
    } catch {
      toast.error("Could not reach authentication server")
    } finally {
      setCustomerLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code")
      return
    }
    setCustomerLoading(true)
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerPhone.trim(), otp }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        setCustomerAuth(data.token, data.customer)
        setView("customer-site")
        toast.success(`Welcome back, ${data.customer.name || "Customer"}!`)
      } else {
        toast.error(data.error || "Invalid or expired verification code")
      }
    } catch {
      toast.error("Failed to verify code")
    } finally {
      setCustomerLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4 sm:p-6 overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Navigation */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <Link
          href="/"
          onClick={goToHomepage}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Homepage</span>
        </Link>

        <div className="flex items-center gap-2 text-[11px] text-emerald-400/90 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Fizmoh Cloud Operational</span>
        </div>
      </div>

      {/* Center Auth Card Container */}
      <div className="relative z-10 w-full max-w-md mx-auto my-auto py-6">
        {/* Brand Mascot Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block transition-transform hover:scale-102">
            <img
              src="/brand/fizmoh-mascot-logo.png"
              alt="Fizmoh — Automate, Connect, Grow"
              className="h-16 sm:h-20 w-auto mx-auto object-contain drop-shadow-xl"
            />
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-3">
            Sign In to Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise WhatsApp Cloud API, CRM, and Digital vCard Platform
          </p>
        </div>

        {/* Tabbed Auth Card */}
        <Card className="border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
          {/* Tabs Selector */}
          <div className="p-1.5 bg-slate-950/60 border-b border-white/5 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "admin"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Staff & Admin</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("customer")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all ${
                activeTab === "customer"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              <span>Customer Portal</span>
            </button>
          </div>

          <CardContent className="p-6 sm:p-7 space-y-4">
            {/* ─── TAB 1: STAFF & ADMIN PASSWORD LOGIN ─── */}
            {activeTab === "admin" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <Label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Operator Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <Input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="operator@company.com"
                      className="pl-9 bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl focus:border-emerald-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAdminLogin()
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-bold text-slate-300">
                      Security Password
                    </Label>
                    <span className="text-[11px] text-slate-500">Encrypted</span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <Input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-9 bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl focus:border-emerald-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAdminLogin()
                      }}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAdminLogin}
                  disabled={adminLoading}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.99] gap-2"
                >
                  {adminLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Enter Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <div className="pt-2 text-center">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Authorized workspace operators only. Login attempts are rate-limited and logged.
                  </p>
                </div>
              </div>
            )}

            {/* ─── TAB 2: CUSTOMER WHATSAPP OTP LOGIN ─── */}
            {activeTab === "customer" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {!otpSent ? (
                  <>
                    <div>
                      <Label className="text-xs font-bold text-slate-300 block mb-1.5">
                        WhatsApp Mobile Number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <Input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+968 9882 1965"
                          className="pl-9 bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl focus:border-emerald-500 font-mono"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendOtp()
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        Include country code (e.g. +968 for Oman, +971 for UAE).
                      </p>
                    </div>

                    <Button
                      onClick={handleSendOtp}
                      disabled={customerLoading}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.99] gap-2"
                    >
                      {customerLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <WhatsAppIcon className="w-4 h-4" />
                          <span>Send WhatsApp Code</span>
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-center py-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                        <WhatsAppIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-xs font-bold text-white">Verification Code Sent</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        We dispatched a 6-digit code to <span className="font-mono text-emerald-400">{customerPhone}</span>
                      </p>
                    </div>

                    <div className="flex justify-center py-2">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup className="gap-2">
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="w-10 h-12 text-base font-bold bg-slate-950/80 border-slate-700 text-white rounded-xl"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button
                      onClick={handleVerifyOtp}
                      disabled={customerLoading || otp.length !== 6}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.99] gap-2"
                    >
                      {customerLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Verify & Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false)
                          setOtp("")
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        Change Number
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={customerLoading}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        Resend Code
                      </button>
                    </div>
                  </>
                )}
              </div >
            )}
          </CardContent>
        </Card>

        {/* Security & Compliance Trust Badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-slate-400 text-[11px]">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit TLS Encryption</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Multi-Tenant Isolation</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>99.99% Cloud Uptime</span>
          </span>
        </div>
      </div>

      {/* Footer Support Info */}
      <div className="relative z-10 w-full max-w-5xl mx-auto py-3 text-center text-slate-500 text-xs">
        <p>© 2026 Fizmoh Cloud. All rights reserved. • Need assistance? Contact <a href="mailto:support@fizmoh.cloud" className="text-slate-400 hover:text-white underline">support@fizmoh.cloud</a></p>
      </div>
    </div>
  )
}
