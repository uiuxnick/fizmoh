"use client"

import Link from "next/link"
import { SiteFooter, SiteHeader } from "@/components/site-header"
import { ContactForm } from "@/components/contact-form"
import { useLanguage } from "@/context/language-context"
import {
  Mail, Phone, MapPin, Video, ArrowRight,
  MessageSquare, ShieldCheck,
} from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

export default function ContactPage() {
  const { isAr } = useLanguage()

  return (
    <main className={`min-h-screen bg-white text-[#1D1D1D] ${isAr ? "rtl font-sans" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      <SiteHeader />

      {/* Hero Header */}
      <section className="relative pt-10 pb-10 sm:pt-14 sm:pb-12 px-4 sm:px-6 bg-gradient-to-b from-[#FFF6DA]/50 via-white to-white border-b border-[#E5E7EB]">
        <div className="relative mx-auto max-w-4xl text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[#F2F2F2] border border-[#E5E7EB] text-[#1D1D1D] text-[12px] font-semibold">
            <MessageSquare className="h-3.5 w-3.5 text-[#00B96A]" />
            {isAr ? "تواصل معنا" : "Contact Desk"}
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1D]">
            {isAr ? "تواصل مع فريق منصة Fizmoh" : "Contact Our Platform Team"}
          </h1>
          <p className="text-[#717680] text-[15px] max-w-xl mx-auto leading-relaxed">
            {isAr
              ? "استفسارات ربط واتساب API للشركات، والتكاملات المخصصة في سلطنة عمان ودول الخليج."
              : "Enterprise WhatsApp integrations, custom botflows, and pricing for Oman & GCC."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Channels */}
          <div className="lg:col-span-5 space-y-5">
            {/* Quick Demo */}
            <div className="rounded-[16px] bg-[#F2F2F2] p-6 border border-[#E5E7EB] space-y-3 shadow-sm">
              <span className="px-2.5 py-1 rounded-[4px] text-[11px] font-bold bg-[#00E785]/20 text-[#1D1D1D] border border-[#00E785]/40">
                <Video className="h-3.5 w-3.5 inline mr-1 text-[#00B96A]" />
                {isAr ? "عرض مباشر" : "Live Demo"}
              </span>
              <h3 className="text-[17px] font-extrabold text-[#1D1D1D]">
                {isAr
                  ? "جلسة فيديو مباشرة عبر Google Meet"
                  : "Prefer a Live Google Meet Walkthrough?"}
              </h3>
              <p className="text-[13px] text-[#717680] leading-relaxed">
                {isAr
                  ? "حدد موعداً لجلسة فيديو مدتها 30 دقيقة مع أخصائي المنصة لرؤية تطبيق الأتمتة لشركتك."
                  : "Schedule a 30-minute 1-on-1 session to see the platform running with your business data."}
              </p>
              <Link href="/book-demo" className="inline-block w-full pt-1">
                <button className="w-full py-2.5 px-4 bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] rounded-[8px] text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#00B96A]/20">
                  <Video className="h-4 w-4" />
                  {isAr ? "حجز موعد عبر Google Meet" : "Book a Google Meet Demo"}
                  <ArrowRight className={`h-3.5 w-3.5 ${isAr ? "rotate-180" : ""}`} />
                </button>
              </Link>
            </div>

            {/* Direct Cards */}
            <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-6 space-y-4 shadow-sm">
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#717680]">
                {isAr ? "قنوات التواصل" : "Direct Channels"}
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-[8px] bg-[#00E785]/20 border border-[#00E785]/40 flex items-center justify-center text-[#00B96A] shrink-0">
                    <WhatsAppIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#1D1D1D]">
                      {isAr ? "دعم واتساب" : "WhatsApp Support"}
                    </h4>
                    <a
                      href="https://wa.me/96878836104"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] font-bold text-[#00B96A] hover:underline inline-block mt-0.5"
                    >
                      {isAr ? "محادثة فورية على واتساب ←" : "Chat on WhatsApp →"}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-[8px] bg-[#F2F2F2] border border-[#E5E7EB] flex items-center justify-center text-[#1D1D1D] shrink-0">
                    <Mail className="h-5 w-5 text-[#00B96A]" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#1D1D1D]">
                      {isAr ? "البريد الإلكتروني" : "Email Inquiries"}
                    </h4>
                    <a
                      href="mailto:support@fizmoh.cloud"
                      className="text-[13px] font-medium text-[#717680] hover:text-[#1D1D1D] inline-block mt-0.5 ltr-force"
                    >
                      support@fizmoh.cloud
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-[8px] bg-[#F2F2F2] border border-[#E5E7EB] flex items-center justify-center text-[#717680] shrink-0">
                    <MapPin className="h-5 w-5 text-[#00B96A]" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#1D1D1D]">
                      {isAr ? "الموقع" : "Headquarters"}
                    </h4>
                    <p className="text-[13px] text-[#717680] mt-0.5">
                      {isAr ? "مسقط، سلطنة عمان" : "Muscat, Sultanate of Oman"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
