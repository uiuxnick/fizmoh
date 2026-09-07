"use client"

import { SiteFooter, SiteHeader } from "@/components/site-header"
import { BookDemoDirect } from "@/components/book-demo-direct"
import { useLanguage } from "@/context/language-context"

export default function BookDemoPage() {
  const { isAr } = useLanguage()

  return (
    <main className={`min-h-screen bg-white text-[#1D1D1D] ${isAr ? "rtl font-sans" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      <SiteHeader />
      <div className="py-12 sm:py-16 px-4 bg-gradient-to-b from-[#FFF6DA]/40 via-white to-white">
        <BookDemoDirect />
      </div>
      <SiteFooter />
    </main>
  )
}
