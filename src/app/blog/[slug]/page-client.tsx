"use client"

import React, { use, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { SiteHeader, SiteFooter } from "@/components/site-header"
import { BLOG_POSTS, BlogPost } from "@/lib/blog-data"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/language-context"
import {
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  Share2,
  Check,
  BookOpen,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Tag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ListOrdered,
  HelpCircle
} from "lucide-react"

// Helper function to parse inline markdown formatting (bold, links)
function renderInlineContent(text: string): React.ReactNode[] {
  // Regex to match markdown links [text](url) and bold **text**
  const parts: React.ReactNode[] = []
  let remaining = text

  // Split by markdown link pattern: [label](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(text)) !== null) {
    const preText = text.substring(lastIndex, match.index)
    if (preText) {
      parts.push(...renderBoldText(preText))
    }

    const label = match[1]
    const url = match[2]
    const isInternal = url.startsWith("/") || url.includes("fizmoh.cloud")

    if (isInternal) {
      parts.push(
        <Link
          key={`link-${match.index}`}
          href={url}
          className="font-bold text-[#047857] hover:text-[#000000] underline decoration-[#00E785] decoration-2 underline-offset-2 transition"
        >
          {label}
        </Link>
      )
    } else {
      parts.push(
        <a
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-bold text-[#047857] hover:text-[#000000] underline decoration-[#00E785] decoration-2 underline-offset-2 transition"
        >
          <span>{label}</span>
          <ExternalLink className="h-3 w-3 inline text-[#047857]" />
        </a>
      )
    }

    lastIndex = linkRegex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(...renderBoldText(text.substring(lastIndex)))
  }

  return parts.length > 0 ? parts : renderBoldText(text)
}

function renderBoldText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-[#000000]">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

export default function BlogPostReader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { lang, isAr } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const post = BLOG_POSTS.find(
    (p) => p.slug === slug || p.slugAr === slug || p.aliases?.includes(slug)
  )

  if (!post) {
    notFound()
  }

  const title = isAr ? post.h1Ar : post.h1
  const metaTitle = isAr ? post.metaTitleAr : post.metaTitle
  const desc = isAr ? post.metaDescriptionAr : post.metaDescription
  const category = isAr ? post.categoryAr : post.category
  const content = isAr ? post.contentAr : post.contentEn
  const keywords = isAr ? post.keywordsAr : post.keywords
  const primaryKw = isAr ? post.primaryKeywordAr : post.primaryKeyword
  const imageAlt = isAr ? post.imageAltAr : post.imageAlt
  const faqs = isAr ? post.faqsAr : post.faqs
  const author = post.author

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2)

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Generate structured schema markup (Article + FAQPage)
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: desc,
    image: `https://app.fizmoh.cloud${post.image}`,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: isAr ? author.nameAr : author.name,
      jobTitle: isAr ? author.roleAr : author.role,
    },
    publisher: {
      "@type": "Organization",
      name: "Fizmoh",
      logo: {
        "@type": "ImageObject",
        url: "https://app.fizmoh.cloud/fizmoh-logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://app.fizmoh.cloud/blog/${isAr ? post.slugAr : post.slug}`,
    },
    keywords: keywords.join(", "),
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  }

  return (
    <div className={`min-h-screen bg-white text-[#111827] ${isAr ? "font-sans rtl" : "ltr"}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Schema Markup for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <SiteHeader />

      <main className="py-8 sm:py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Top Breadcrumb & Share */}
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/blog"
              className="text-[13px] font-bold text-[#374151] hover:text-[#000000] flex items-center gap-1.5 transition"
            >
              <ArrowLeft className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
              {isAr ? "العودة إلى دليل المقالات" : "Back to All Guides"}
            </Link>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border-2 border-[#E5E7EB] bg-white text-[12.5px] font-bold text-[#111827] hover:bg-[#F3F4F6] transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#047857]" />
                  <span>{isAr ? "تم نسخ الرابط!" : "Link Copied!"}</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-[#4B5563]" />
                  <span>{isAr ? "مشاركة المقال" : "Share Article"}</span>
                </>
              )}
            </button>
          </div>

          {/* Article Header */}
          <header className="space-y-5 border-b-2 border-[#E5E7EB] pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-[6px] bg-[#00E785]/20 text-[#047857] border border-[#00E785]/40 text-[11.5px] font-bold">
                {category}
              </span>
              <span className="px-3 py-1 rounded-[6px] bg-[#F3F4F6] text-[#111827] border border-[#E5E7EB] text-[11.5px] font-semibold">
                {primaryKw}
              </span>
              <span className="text-[#E5E7EB]">·</span>
              <span className="text-[12.5px] font-semibold text-[#4B5563] flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.readTime}
              </span>
              <span className="text-[#E5E7EB]">·</span>
              <span className="text-[12.5px] font-semibold text-[#4B5563] flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(post.date).toLocaleDateString(isAr ? "ar-OM" : "en-US", { dateStyle: "long" })}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#000000] tracking-tight leading-[1.14]">
              {title}
            </h1>

            <p className="text-[16.5px] font-medium text-[#374151] leading-relaxed">
              {desc}
            </p>

            {/* Author Byline */}
            <div className="flex items-center gap-3 pt-2">
              <div className="h-10 w-10 rounded-full bg-[#00E785] text-[#000000] font-black text-[15px] flex items-center justify-center border-2 border-[#047857]">
                {author.avatarInitial}
              </div>
              <div>
                <p className="text-[13.5px] font-bold text-[#000000]">
                  {isAr ? author.nameAr : author.name}
                </p>
                <p className="text-[12px] font-semibold text-[#4B5563]">
                  {isAr ? author.roleAr : author.role}
                </p>
              </div>
            </div>
          </header>

          {/* Featured Graphic / Image */}
          <div className="rounded-[16px] border-2 border-[#E5E7EB] bg-[#0B0F17] overflow-hidden shadow-md">
            <div className="relative w-full aspect-[1200/630]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image}
                alt={imageAlt}
                className="w-full h-full object-cover object-center"
                loading="eager"
              />
            </div>
            <div className="bg-[#111827] px-4 py-3 border-t border-[#1F2937] flex items-center justify-between gap-2 text-[12px] font-semibold text-[#9CA3AF]">
              <span className="flex items-center gap-1.5 text-[#E5E7EB]">
                <Sparkles className="h-3.5 w-3.5 text-[#00E785]" />
                <span className="font-bold">{imageAlt}</span>
              </span>
              <span className="text-[#6B7280] hidden sm:inline">Fizmoh Architecture Blueprint</span>
            </div>
          </div>

          {/* Interactive Table of Contents (TOC) */}
          {post.toc && post.toc.length > 0 && (
            <div className="rounded-[14px] border-2 border-[#E5E7EB] bg-[#F9FAFB] p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#000000] font-extrabold text-[14.5px]">
                <ListOrdered className="h-4 w-4 text-[#047857]" />
                <span>{isAr ? "فهرس محتويات الدليل" : "Table of Contents"}</span>
              </div>
              <nav className="grid gap-1.5 sm:grid-cols-2 pt-1">
                {post.toc.map((item, idx) => (
                  <a
                    key={idx}
                    href={`#${item.id}`}
                    className="text-[13px] font-semibold text-[#374151] hover:text-[#047857] hover:underline flex items-center gap-1.5 transition"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00E785] shrink-0" />
                    <span>{isAr ? item.titleAr : item.titleEn}</span>
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* Article Body Content */}
          <article className="space-y-6 text-[#111827] leading-relaxed text-[15.5px]">
            {content.split("\n\n").map((block, index) => {
              const trimmed = block.trim()

              // Heading 1
              if (trimmed.startsWith("# ")) {
                return (
                  <h1 key={index} className="text-2xl sm:text-3xl font-extrabold text-[#000000] pt-6 pb-2 border-b-2 border-[#E5E7EB]">
                    {renderInlineContent(trimmed.replace("# ", ""))}
                  </h1>
                )
              }

              // Heading 2 with optional {#id} anchor
              if (trimmed.startsWith("## ")) {
                const headingRaw = trimmed.replace("## ", "")
                const idMatch = headingRaw.match(/\{#([^}]+)\}/)
                const headingText = idMatch ? headingRaw.replace(/\{#[^}]+\}/, "").trim() : headingRaw
                const headingId = idMatch ? idMatch[1] : undefined

                return (
                  <h2
                    key={index}
                    id={headingId}
                    className="text-xl sm:text-2xl font-extrabold text-[#000000] pt-8 pb-1 scroll-mt-20 border-b border-[#E5E7EB]/60"
                  >
                    {renderInlineContent(headingText)}
                  </h2>
                )
              }

              // Heading 3
              if (trimmed.startsWith("### ")) {
                return (
                  <h3 key={index} className="text-[17px] font-bold text-[#047857] pt-4 pb-0.5">
                    {renderInlineContent(trimmed.replace("### ", ""))}
                  </h3>
                )
              }

              // Bullet list
              if (trimmed.startsWith("- ")) {
                const items = trimmed.split("\n").map((item) => item.replace(/^- /, ""))
                return (
                  <ul key={index} className="space-y-2.5 my-3 pl-1">
                    {items.map((it, i) => (
                      <li key={i} className="flex items-start gap-3 text-[#111827] leading-relaxed">
                        <CheckCircle2 className="h-5 w-5 text-[#047857] shrink-0 mt-0.5" />
                        <span>{renderInlineContent(it)}</span>
                      </li>
                    ))}
                  </ul>
                )
              }

              // Numbered list
              if (/^\d+\.\s/.test(trimmed)) {
                const items = trimmed.split("\n").filter((l) => l.trim() !== "")
                return (
                  <ol key={index} className="space-y-2.5 my-3 pl-1">
                    {items.map((it, i) => {
                      const cleanItem = it.replace(/^\d+\.\s*/, "")
                      return (
                        <li key={i} className="flex items-start gap-3 text-[#111827] leading-relaxed">
                          <span className="h-6 w-6 rounded-full bg-[#00E785]/25 border border-[#047857] text-[#000000] font-black text-[12px] flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{renderInlineContent(cleanItem)}</span>
                        </li>
                      )
                    })}
                  </ol>
                )
              }

              // Markdown Table
              if (trimmed.startsWith("|")) {
                const lines = trimmed.split("\n").filter((r) => !r.includes("---"))
                return (
                  <div key={index} className="overflow-x-auto my-6 rounded-[14px] border-2 border-[#E5E7EB] bg-[#F9FAFB] p-2 shadow-sm">
                    <table className="w-full text-[13.5px] text-left">
                      <tbody>
                        {lines.map((row, ri) => {
                          const cols = row.split("|").filter((c) => c.trim() !== "")
                          return (
                            <tr
                              key={ri}
                              className={
                                ri === 0
                                  ? "bg-[#E5E7EB] font-black text-[#000000]"
                                  : "border-t border-[#E5E7EB] hover:bg-white transition"
                              }
                            >
                              {cols.map((col, ci) => (
                                <td key={ci} className="p-3.5 text-[#111827]">
                                  {renderInlineContent(col.trim())}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              }

              // Horizontal Divider
              if (trimmed === "---") {
                return <hr key={index} className="my-6 border-t-2 border-[#E5E7EB]" />
              }

              // Standard Paragraph
              return (
                <p key={index} className="text-[#374151] font-medium leading-relaxed">
                  {renderInlineContent(trimmed)}
                </p>
              )
            })}
          </article>

          {/* Interactive Frequently Asked Questions (FAQ) Section */}
          {faqs && faqs.length > 0 && (
            <section id="frequently-asked-questions" className="pt-8 border-t-2 border-[#E5E7EB] space-y-4 scroll-mt-20">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-[#047857]" />
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#000000]">
                  {isAr ? "الأسئلة الأكثر شيوعاً" : "Frequently Asked Questions"}
                </h2>
              </div>

              <div className="space-y-3 pt-2">
                {faqs.map((faq, i) => {
                  const isOpen = openFaq === i
                  return (
                    <div
                      key={i}
                      className="rounded-[12px] border-2 border-[#E5E7EB] bg-white overflow-hidden shadow-sm transition"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        className="w-full flex items-center justify-between p-4 text-left font-bold text-[#000000] text-[14.5px] hover:bg-[#F9FAFB] transition cursor-pointer"
                      >
                        <span className={isAr ? "text-right" : "text-left"}>{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-[#047857] shrink-0 ml-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#4B5563] shrink-0 ml-2" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="p-4 pt-1 border-t border-[#E5E7EB] bg-[#F9FAFB] text-[14px] font-medium text-[#374151] leading-relaxed">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Author Bio Card */}
          <div className="rounded-[16px] border-2 border-[#E5E7EB] bg-[#F9FAFB] p-6 space-y-3">
            <div className="flex items-center gap-2 text-[#047857] font-bold text-[12px] uppercase tracking-wider">
              <UserCheck className="h-4 w-4" />
              <span>{isAr ? "عن كاتب المقال" : "About the Author"}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-[#00E785] text-[#000000] font-black text-[20px] flex items-center justify-center border-2 border-[#047857] shrink-0">
                {author.avatarInitial}
              </div>
              <div className="space-y-1">
                <h4 className="text-[16px] font-extrabold text-[#000000]">
                  {isAr ? author.nameAr : author.name}
                </h4>
                <p className="text-[13px] font-bold text-[#047857]">
                  {isAr ? author.credentialAr : author.credential}
                </p>
                <p className="text-[13px] font-medium text-[#4B5563] leading-snug">
                  {isAr ? author.bioAr : author.bio}
                </p>
              </div>
            </div>
          </div>

          {/* Keywords & Topic Chips */}
          <div className="pt-6 border-t-2 border-[#E5E7EB] space-y-3">
            <h4 className="text-[12.5px] font-extrabold uppercase tracking-wider text-[#111827] flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-[#047857]" />
              {isAr ? "المواضيع والكلمات الدليلية" : "Related Topics & Keywords"}
            </h4>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="px-3 py-1 rounded-[6px] bg-[#F3F4F6] border border-[#E5E7EB] text-[12px] font-semibold text-[#111827] hover:border-[#000000] transition"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Related Articles */}
          {relatedPosts.length > 0 && (
            <div className="pt-8 border-t-2 border-[#E5E7EB] space-y-4">
              <h3 className="text-[18px] font-extrabold text-[#000000]">
                {isAr ? "مقالات ودراسات موصى بها" : "Recommended Enterprise Guides"}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedPosts.map((rp) => (
                  <Link
                    key={rp.slug}
                    href={`/blog/${isAr ? rp.slugAr : rp.slug}`}
                    className="p-5 rounded-[14px] border-2 border-[#E5E7EB] bg-white hover:border-[#000000] transition block shadow-sm group"
                  >
                    <span className="px-2.5 py-0.5 rounded-[4px] bg-[#00E785]/20 text-[#047857] border border-[#00E785]/40 text-[11px] font-bold mb-2.5 inline-block">
                      {isAr ? rp.categoryAr : rp.category}
                    </span>
                    <h4 className="text-[15.5px] font-bold text-[#000000] group-hover:text-[#047857] transition leading-snug">
                      {isAr ? rp.h1Ar : rp.h1}
                    </h4>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Bottom High-Impact Conversion Band */}
          <div className="rounded-[18px] border-2 border-[#047857] bg-[#00E785] p-8 sm:p-10 text-center space-y-4 shadow-lg">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-[#00E785] text-[12px] font-extrabold tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              {isAr ? "ابدأ اليوم بدون بطاقة ائتمان" : "14-Day Free Trial · No Credit Card"}
            </span>

            <h3 className="text-2xl sm:text-3xl font-black text-[#000000] tracking-tight">
              {isAr ? "حوّل محادثات واتساب إلى قناة مبيعات رابحة لشركتك" : "Turn WhatsApp Chats into Your Top Revenue Channel"}
            </h3>

            <p className="text-[15px] font-bold text-[#0F172A] max-w-xl mx-auto leading-relaxed">
              {isAr
                ? "أطلق صندوق وارد موحد متعدد الموظفين، شات بوت ذكاء اصطناعي يفهم اللهجات، وبوابة دفع أموال باي بالريال العماني في أقل من 10 دقائق."
                : "Deploy your official Meta Cloud API workspace, multi-agent CRM, AI botflows, and native AmwalPay checkout in under 10 minutes."}
            </p>

            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link href="/signup">
                <Button className="bg-[#000000] hover:bg-[#1f2937] text-white font-extrabold rounded-[8px] px-6 h-11 text-[13.5px] shadow-md">
                  {isAr ? "ابدأ تجربتك المجانية — 14 يوماً" : "Start Free Trial — 14 Days"}
                  <ArrowRight className={`ml-2 h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
                </Button>
              </Link>
              <Link href="/book-demo">
                <Button variant="outline" className="border-2 border-[#000000] bg-white text-[#000000] hover:bg-[#F3F4F6] rounded-[8px] px-5 h-11 text-[13.5px] font-bold">
                  {isAr ? "طلب عرض مباشر" : "Book a Live Demo"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
