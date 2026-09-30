"use client"

import { SiteHeader, SiteFooter } from "@/components/site-header"
import { useLanguage } from "@/context/language-context"
import { MetaPricingUpdateBulletin } from "@/components/marketing/meta-pricing-update-bulletin"
import Link from "next/link"
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MetaPricingUpdateClient() {
  const { isAr } = useLanguage()

  return (
    <div className={`min-h-screen bg-[#F7F7F6] text-stone-900 ${isAr ? "rtl font-sans" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      <SiteHeader />

      <main className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Breadcrumb / Back button */}
          <div className="flex items-center justify-between text-xs text-stone-500">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 hover:text-emerald-700 font-semibold transition"
            >
              {isAr ? (
                <>
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>العودة لصفحة الباقات والتسعيرة</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Pricing & Plans</span>
                </>
              )}
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1.5 text-emerald-800 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {isAr ? "شريك أعمال ميتا المعتمد" : "Official Meta Business Partner"}
            </span>
          </div>

          {/* Official Bulletin Component */}
          <MetaPricingUpdateBulletin isAr={isAr} standalone={true} />

          {/* Bottom Navigation Links */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-stone-200/80 text-xs">
            <div className="text-stone-500">
              {isAr
                ? "فزموه هي منصة مرخصة ومعتمدة لإدارة قنوات واتساب الرسمية والتجارة التحادثية في سلطنة عُمان."
                : "Fizmoh is a certified conversational commerce & WhatsApp business automation platform in Oman."}
            </div>

            <div className="flex items-center gap-4 font-semibold text-emerald-700">
              <Link href="/pricing" className="hover:underline">
                {isAr ? "باقات فزموه والاشتراكات" : "Fizmoh Platform Plans"}
              </Link>
              <span>•</span>
              <Link href="/whats-new" className="hover:underline">
                {isAr ? "سجل التحديثات" : "What's New"}
              </Link>
              <span>•</span>
              <Link href="/contact" className="hover:underline">
                {isAr ? "اتصل بنا" : "Contact Sales"}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
