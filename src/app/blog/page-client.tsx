"use client"

import { useState } from "react"
import Link from "next/link"
import { SiteHeader, SiteFooter } from "@/components/site-header"
import { BLOG_POSTS } from "@/lib/blog-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/context/language-context"
import {
  Search,
  Calendar,
  Clock,
  ArrowRight,
  BookOpen,
  Sparkles,
  Tag,
  CheckCircle2,
} from "lucide-react"

export default function BlogIndexPage() {
  const { lang, isAr } = useLanguage()
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [searchQuery, setSearchQuery] = useState("")

  const categories = ["All", ...Array.from(new Set(BLOG_POSTS.map(p => lang === "ar" ? p.categoryAr : p.category)))]

  const filteredPosts = BLOG_POSTS.filter(post => {
    const title = lang === "ar" ? post.h1Ar : post.h1
    const description = lang === "ar" ? post.metaDescriptionAr : post.metaDescription
    const category = lang === "ar" ? post.categoryAr : post.category
    const keywords = lang === "ar" ? post.keywordsAr : post.keywords

    const matchesSearch =
      searchQuery === "" ||
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory =
      selectedCategory === "All" ||
      selectedCategory === "الكل" ||
      category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className={`marketing min-h-screen bg-[var(--mk-surface)] text-[var(--mk-ink)] ${isAr ? "font-sans rtl" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      <SiteHeader />

      <main className="overflow-hidden">
        {/* Blog Hero Header (Warm subtle cream moment) */}
        <section className="relative pt-10 pb-12 sm:pt-14 sm:pb-16 px-4 sm:px-6 bg-gradient-to-b from-[#FFF6DA]/50 via-white to-white border-b border-[#E5E7EB]">
          <div className="relative mx-auto max-w-4xl text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-[#F2F2F2] border border-[#E5E7EB] text-[#1D1D1D] text-[12px] font-semibold">
              <BookOpen className="h-3.5 w-3.5 text-[#00B96A] inline mr-1" />
              {isAr ? "مدونة واتساب للأعمال والذكاء الاصطناعي" : "WhatsApp Business Knowledge Base"}
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1D] leading-tight">
              {isAr
                ? "أحدث استراتيجيات ودراسات التسويق والتجارة عبر واتساب"
                : "Insights, Guides & Strategies for WhatsApp Business"}
            </h1>

            <p className="max-w-xl mx-auto text-[15px] text-[#717680] leading-relaxed">
              {isAr
                ? "دليلك الشامل لأتمتة خدمة العملاء، إطلاق حملات الرسائل الجماعية، ربط بوابات الدفع الإلكتروني، وتوسيع المبيعات."
                : "Master WhatsApp Cloud API, conversational AI bots, broadcast campaigns, AmwalPay checkout, and CRM workflows."}
            </p>

            {/* Search Input */}
            <div className="max-w-md mx-auto relative pt-2">
              <Search className={`absolute ${isAr ? "right-3" : "left-3"} top-5 h-4 w-4 text-[#717680]`} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "ابحث عن موضوع أو ميزة (مثل: أموال باي، شات بوت)..." : "Search articles, keywords, or topics..."}
                className={`${isAr ? "pr-9 text-right" : "pl-9 text-left"} bg-white border-[#E5E7EB] text-[#1D1D1D] placeholder:text-[#717680] rounded-[8px] h-10 text-[13px] shadow-sm`}
              />
            </div>
          </div>
        </section>

        {/* Categories Bar */}
        <section className="border-b border-[#E5E7EB] bg-white sticky top-14 z-20 py-3 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-[6px] text-[12px] font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#000000] text-white"
                    : "bg-[#F3F4F6] text-[#374151] hover:text-[#000000] hover:bg-[#E5E7EB]"
                }`}
              >
                {cat === "All" && isAr ? "الكل" : cat}
              </button>
            ))}
          </div>
        </section>

        {/* Blog Post Grid */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => {
              const title = isAr ? post.h1Ar : post.h1
              const desc = isAr ? post.metaDescriptionAr : post.metaDescription
              const cat = isAr ? post.categoryAr : post.category
              const slug = isAr ? post.slugAr : post.slug
              const primaryKw = isAr ? post.primaryKeywordAr : post.primaryKeyword
              const keywords = isAr ? post.keywordsAr : post.keywords

              return (
                <article
                  key={post.slug}
                  className="mk-card group relative flex flex-col overflow-hidden"
                >
                  <Link
                    href={`/blog/${slug}`}
                    className="relative block aspect-[16/9] w-full overflow-hidden bg-[#0B0F17]"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  </Link>

                  {/* flex-1 on the body and mt-auto on the footer keep every
                      card's footer on the same line, whatever the title runs to. */}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-3 text-[11.5px]">
                      <span className="rounded-full bg-[var(--mk-green)]/12 px-2.5 py-1 font-semibold text-[var(--mk-green-deep)]">
                        {cat}
                      </span>
                      <span className="flex items-center gap-1 text-[var(--mk-muted)]">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {post.readTime}
                      </span>
                    </div>

                    <h2 className="mk-display mt-4 text-[22px] leading-[1.25] text-[var(--mk-ink)] transition-colors group-hover:text-[var(--mk-gold)]">
                      {/* The whole card is reachable through this one link;
                          the image above is hidden from the tab order so a
                          keyboard user does not stop twice per card. */}
                      <Link href={`/blog/${slug}`} className="after:absolute after:inset-0">
                        {title}
                      </Link>
                    </h2>

                    <p className="mt-3 line-clamp-3 text-[14px] leading-[1.65] text-[var(--mk-ink-soft)]">
                      {desc}
                    </p>

                    {/* One topic line. The primary keyword used to be printed
                        beside the same word from the keyword list, so most
                        cards showed the same tag twice. */}
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {Array.from(new Set([primaryKw, ...keywords]))
                        .filter(k => k && k.toLowerCase() !== cat.toLowerCase())
                        .slice(0, 2)
                        .map(kw => (
                          <span
                            key={kw}
                            className="rounded-md border border-[var(--mk-line)] px-2 py-0.5 text-[11px] text-[var(--mk-muted)]"
                          >
                            {kw}
                          </span>
                        ))}
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-[var(--mk-line)] pt-4 mt-6">
                      <span className="flex items-center gap-1.5 text-[12px] text-[var(--mk-muted)]">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        {new Date(post.date).toLocaleDateString(isAr ? "ar-OM" : "en-US", { dateStyle: "medium" })}
                      </span>
                      <span className="flex items-center gap-1 text-[12.5px] font-semibold text-[var(--mk-ink)] transition-colors group-hover:text-[var(--mk-gold)]">
                        {isAr ? "اقرأ المقال" : "Read guide"}
                        <ArrowRight
                          className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 ${isAr ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <p className="text-[#717680] text-[14px]">
                {isAr ? "لم نجد أي مقالات تطابق بحثك." : "No articles found matching your query."}
              </p>
              <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setSelectedCategory("All") }} className="border-[#1D1D1D] bg-white text-[#1D1D1D] text-[13px]">
                {isAr ? "إعادة تعيين البحث" : "Reset Filters"}
              </Button>
            </div>
          )}
        </section>

        {/* Bottom CTA Banner */}
        <section className="border-t border-[#E5E7EB] bg-gradient-to-b from-white to-[#FFF6DA]/60 py-14 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto rounded-[16px] border border-[#E5E7EB] bg-white p-8 text-center space-y-3 shadow-sm">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1D]">
              {isAr
                ? "جاهز لإطلاق مبيعات وأتمتة واتساب لشركتك؟"
                : "Ready to Scale Your Business on WhatsApp?"}
            </h2>
            <p className="text-[#717680] text-[14px] max-w-xl mx-auto">
              {isAr
                ? "انضم لمئات الشركات في سلطنة عمان والخليج التي تعتمد على Fizmoh لإدارة المحادثات، الحجوزات، والمدفوعات."
                : "Join high-growth brands in Oman & the GCC operating on Fizmoh's official WhatsApp Business Platform."}
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link href="/signup">
                <Button size="lg" className="bg-[#00E785] hover:bg-[#00B96A] text-[#1D1D1D] font-bold rounded-[8px] px-6 h-10.5 text-[13px] border border-[#00B96A]/20">
                  {isAr ? "ابدأ التجربة المجانية (14 يوماً)" : "Start 14-Day Free Trial"}
                  <ArrowRight className={`ml-1.5 h-3.5 w-3.5 ${isAr ? "rotate-180" : ""}`} />
                </Button>
              </Link>
              <Link href="/book-demo">
                <Button size="lg" variant="outline" className="border-[#1D1D1D] bg-white text-[#1D1D1D] hover:bg-[#F2F2F2] rounded-[8px] px-5 h-10.5 text-[13px] font-semibold">
                  {isAr ? "طلب عرض توضيحي مباشر" : "Book Live Demo"}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
