"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Award,
  Users,
  Search,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  Globe,
  Share2,
  ExternalLink,
  BookOpen,
  Filter,
  Check,
  ChevronRight,
  HelpCircle,
  FileCheck,
} from "lucide-react"
import { Course } from "@/lib/training-types"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

interface Props {
  slug?: string
  courses?: Course[]
  tenant?: {
    id?: string
    slug?: string
    name?: string
  } | null
  brandName?: string
  brandLogo?: string | null
  contactEmail?: string
  contactPhone?: string
  address?: string
}

export default function TrainingAcademySiteView({
  slug = "tanfidh",
  courses = [],
  tenant,
  brandName = "Tanfidh Management Consultants",
  brandLogo,
  contactEmail = "saidalharthy@tanfidh.com",
  contactPhone = "+968 7178 4454",
  address = "Ruwi Financial District, Muscat, Sultanate of Oman",
}: Props) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [isAr, setIsAr] = useState(false)

  // Derive categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    courses.forEach((c) => {
      if (c.category) set.add(c.category)
    })
    return ["ALL", ...Array.from(set)]
  }, [courses])

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchCat = selectedCategory === "ALL" || c.category === selectedCategory
      const query = searchQuery.toLowerCase().trim()
      const matchQuery =
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query)) ||
        (c.trainerName && c.trainerName.toLowerCase().includes(query)) ||
        (c.slug && c.slug.toLowerCase().includes(query))
      return matchCat && matchQuery
    })
  }, [courses, selectedCategory, searchQuery])

  // Clean WhatsApp phone number for wa.me link
  const cleanPhone = contactPhone.replace(/[^0-9]/g, "")
  const defaultWhatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    isAr
      ? `مرحباً، أود الاستفسار عن الدورات التدريبية المعتمدة والبرامج التنفيذية لدى ${brandName}.`
      : `Hello! I would like to inquire about executive masterclasses and certified training programs at ${brandName}.`
  )}`

  return (
    <div className={`min-h-screen bg-[#FDFDFC] text-[#1D1D1D] antialiased ${isAr ? "rtl font-sans" : "font-sans"}`} dir={isAr ? "rtl" : "ltr"}>
      {/* Top Notice Bar */}
      <div className="bg-[#052e16] text-[#86efac] text-xs py-2 px-4 border-b border-emerald-950 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 max-w-5xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30 text-[11px]">
              <Sparkles className="h-3 w-3" />
              {isAr ? "برامج تدريبية تنفيذية معتمدة" : "Official Executive Training & Masterclasses"}
            </span>
            <span className="hidden sm:inline text-emerald-200/80 text-[12px]">
              {isAr ? "شهادات معتمدة دولياً · فنادق 5 نجوم مسقط · خصومات التسجيل المبكر والمؤسسي" : "Certified Credentials · 5-Star Muscat Venues · Corporate BOGO Grants"}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/training/verify-certificate"
              className="text-emerald-300 hover:text-white underline underline-offset-2 flex items-center gap-1 font-medium transition"
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>{isAr ? "التحقق من الشهادات" : "Verify Certificate"}</span>
            </Link>
            <button
              onClick={() => setIsAr(!isAr)}
              className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 px-2.5 py-0.5 rounded border border-emerald-700/50 text-[11px] font-semibold transition cursor-pointer"
            >
              {isAr ? "English" : "العربية"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="h-11 w-auto max-w-[160px] object-contain rounded" />
            ) : (
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-bold text-lg shadow-sm border border-emerald-500/30">
                {brandName ? brandName.charAt(0).toUpperCase() : "T"}
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-stone-900 leading-tight">
                {brandName}
              </h1>
              <p className="text-[11.5px] font-medium text-emerald-700">
                {isAr ? "معهد التدريب التنفيذي والاستشارات الإدارية" : "Executive Academy & Management Consulting"}
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-stone-600">
            <a href="#courses" className="hover:text-emerald-700 transition">
              {isAr ? "الدورات والبرامج" : "Masterclasses"}
            </a>
            <a href="#trainer" className="hover:text-emerald-700 transition">
              {isAr ? "المدرب والمنهجية" : "Faculty & Trainer"}
            </a>
            <a href="#corporate" className="hover:text-emerald-700 transition">
              {isAr ? "التدريب المؤسسي" : "Corporate Solutions"}
            </a>
            <Link href="/training/verify-certificate" className="hover:text-emerald-700 transition">
              {isAr ? "التحقق من الشهادة" : "Verify Certificate"}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={defaultWhatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#00A859] hover:bg-[#008f4c] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition transform active:scale-95"
            >
              <WhatsAppIcon className="h-4 w-4 fill-current" />
              <span>{isAr ? "تواصل عبر واتساب" : "Chat on WhatsApp"}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-stone-50 to-white py-14 sm:py-20 border-b border-stone-200">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0596690a_1px,transparent_1px),linear-gradient(to_bottom,#0596690a_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-emerald-200 shadow-2xs text-xs font-bold text-emerald-800">
            <Award className="h-4 w-4 text-emerald-600" />
            <span>{isAr ? "برامج تدريبية تنفيذية معتمدة وفق المعايير الدولية" : "Certified Executive Masterclasses & Professional Certifications"}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-[1.15]">
            {isAr ? (
              <>
                طور مهاراتك القيادية مع <span className="text-emerald-600">أقوى البرامج المعتمدة</span> في التخطيط الاستراتيجي وإدارة الأداء
              </>
            ) : (
              <>
                Accelerate Executive Impact With <span className="text-emerald-600">Internationally Certified</span> Masterclasses
              </>
            )}
          </h2>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-stone-600 font-normal leading-relaxed">
            {isAr
              ? "برامج مكثفة حضورية لمدة 5 أيام بفندق شيراتون عمان، تجمع بين التطبيق العملي، وأحدث أدوات الذكاء الاصطناعي، ونماذج التميز المؤسسي بقيادة نخبة من كبار المستشارين."
              : "Immersive 5-day in-person masterclasses at the 5-Star Sheraton Oman Hotel. Master real-world KPIs, balanced scorecards, and strategy execution with proven frameworks and post-course mentorship."}
          </p>

          {/* Quick Metrics */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-2xs">
              <div className="text-xl sm:text-2xl font-black text-emerald-700">{courses.length || 7}+</div>
              <div className="text-[12px] font-medium text-stone-600">{isAr ? "برامج معتمدة" : "Masterclasses"}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-2xs">
              <div className="text-xl sm:text-2xl font-black text-stone-900">5-Star</div>
              <div className="text-[12px] font-medium text-stone-600">{isAr ? "شيراتون عمان مسقط" : "Sheraton Muscat"}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-2xs">
              <div className="text-xl sm:text-2xl font-black text-emerald-700">100%</div>
              <div className="text-[12px] font-medium text-stone-600">{isAr ? "شهادات موثقة" : "Verified Credentials"}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-2xs">
              <div className="text-xl sm:text-2xl font-black text-stone-900">BOGO</div>
              <div className="text-[12px] font-medium text-stone-600">{isAr ? "مقعد مجاني إضافي" : "1+1 Corporate Grant"}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Catalog Section */}
      <section id="courses" className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <GraduationCap className="h-4 w-4" />
              <span>{isAr ? "دليل البرامج والدورات" : "Available Executive Masterclasses"}</span>
            </div>
            <h3 className="mt-1 text-2xl sm:text-3xl font-extrabold text-stone-900">
              {isAr ? "اختر الدورة المناسبة لمسارك القيادي والمؤسسي" : "Select Your Masterclass & Reserve Your Seat"}
            </h3>
            <p className="text-sm text-stone-600 mt-1 max-w-2xl">
              {isAr
                ? "تشمل جميع الدورات وجبات بوفيه الغداء اليومية بفندق شيراتون، وحقيبة الأدوات الشاملة، ورسوم الاختبار النهائي والشهادة المعتمدة."
                : "All masterclasses include daily 5-star Sheraton buffet lunch, official executive toolkit, exam fees, verified certificate, and 6 months follow-up consultation."}
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-72">
            <div className="relative">
              <Search className={`absolute top-3 ${isAr ? "left-3" : "right-3"} h-4 w-4 text-stone-400`} />
              <input
                type="text"
                placeholder={isAr ? "ابحث عن دورة أو موضوع..." : "Search courses..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-white rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Category Filters */}
        {categories.length > 2 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-emerald-800 text-white shadow-2xs"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                }`}
              >
                {cat === "ALL" ? (isAr ? "جميع البرامج" : "All Programs") : cat}
              </button>
            ))}
          </div>
        )}

        {/* Course Cards Grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8">
            <GraduationCap className="h-12 w-12 text-stone-400 mx-auto mb-3" />
            <h4 className="text-lg font-bold text-stone-800">
              {isAr ? "لم نتمكن من العثور على دورات تطابق بحثك" : "No courses match your search criteria"}
            </h4>
            <p className="text-sm text-stone-500 mt-1">
              {isAr ? "جرب البحث بكلمات مختلفة أو إزالة الفلاتر." : "Try clearing filters or search by a different topic."}
            </p>
            <button
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("ALL")
              }}
              className="mt-4 px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-emerald-800 transition"
            >
              {isAr ? "عرض جميع الدورات" : "View All Courses"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const waCourseUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                isAr
                  ? `مرحباً، أود التسجيل في دورة "${course.name}" (${course.duration || "5 أيام"}) لدى ${brandName}.`
                  : `Hello! I would like to register for the "${course.name}" masterclass (${course.duration || "5 Days"}) with ${brandName}.`
              )}`

              const landingUrl = `/training/${course.id || course.slug}`

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col justify-between hover:border-emerald-600 hover:shadow-lg transition group shadow-2xs"
                >
                  <div>
                    {/* Course Banner or Top Strip */}
                    <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
                    <div className="p-6">
                      {/* Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {course.category || (isAr ? "إدارة استراتيجية" : "Executive")}
                        </span>
                        {(course.offerType === "BOGO" || (course as any).bogoOfferEnabled) && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {isAr ? "عرض 1+1 مجاناً" : "BOGO 1+1 Free"}
                          </span>
                        )}
                      </div>

                      {/* Course Title */}
                      <h4 className="text-lg font-bold text-stone-900 group-hover:text-emerald-700 transition leading-snug line-clamp-2">
                        {course.name}
                      </h4>

                      {/* Description */}
                      <p className="text-xs text-stone-600 mt-2 line-clamp-3 leading-relaxed">
                        {course.description}
                      </p>

                      {/* Metadata Highlights */}
                      <div className="mt-4 pt-4 border-t border-stone-100 space-y-2 text-xs text-stone-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-stone-800">{course.duration || "5 Days (40 Hours)"}</span>
                          <span className="text-stone-400">·</span>
                          <span>08:30–16:30 GST</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{course.venueName || (course as any).venue || "Sheraton Oman Hotel, Muscat"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-emerald-900 bg-emerald-50/80 px-2 py-0.5 rounded">
                            {course.startDate && course.endDate ? `${course.startDate} to ${course.endDate}` : "Upcoming Cohort"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="text-stone-700">
                            {isAr ? "المدرب المعتمد:" : "Lead Faculty:"}{" "}
                            <strong>{course.trainerName || "Said bin Saif Al Harthi"}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Learning Objectives Preview */}
                      {((course.learningObjectives && course.learningObjectives.length > 0) || ((course as any).learningOutcomes && (course as any).learningOutcomes.length > 0)) && (
                        <div className="mt-4 pt-3 border-t border-stone-100">
                          <p className="text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                            {isAr ? "أبرز المحاور التدريبية:" : "Key Learning Outcomes:"}
                          </p>
                          <ul className="space-y-1">
                            {(course.learningObjectives || (course as any).learningOutcomes).slice(0, 3).map((item: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-1.5 text-[11.5px] text-stone-600 leading-tight">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Pricing & CTAs */}
                  <div className="p-6 bg-stone-50/80 border-t border-stone-200">
                    <div className="flex items-baseline justify-between mb-3.5">
                      <div>
                        <span className="text-xs text-stone-500 block">
                          {isAr ? "رسوم الاستثمار" : "Program Investment"}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-extrabold text-stone-900">
                            {course.currency || "OMR"} {course.standardPrice || (course as any).fee || 650}
                          </span>
                          <span className="text-[11px] text-stone-500 font-medium">
                            {isAr ? "/ للمشارك" : "/ delegate"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                        {isAr ? "شامل البوفيه والشهادة" : "All-Inclusive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={landingUrl}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-stone-900 hover:bg-black text-white text-xs font-bold py-2.5 px-3 rounded-xl transition shadow-xs text-center"
                      >
                        <span>{isAr ? "تفاصيل الدورة" : "View Syllabus"}</span>
                        <ArrowRight className={`h-3.5 w-3.5 ${isAr ? "rotate-180" : ""}`} />
                      </Link>

                      <a
                        href={waCourseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-[#00A859] hover:bg-[#008f4c] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition shadow-xs text-center"
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5 fill-current" />
                        <span>{isAr ? "حجز بواتساب" : "Register"}</span>
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Corporate In-House Training Banner */}
      <section id="corporate" className="py-12 bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <Building className="h-4 w-4" />
              {isAr ? "حلول التدريب التعاقدي والمؤسسي" : "Custom Corporate & In-House Programs"}
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              {isAr
                ? "هل ترغب بتنظيم دورة مخصصة لموظفي مؤسستك أو وزارتك؟"
                : "Custom In-House Masterclasses For Your Organization or Ministry"}
            </h3>
            <p className="text-sm text-stone-300 leading-relaxed">
              {isAr
                ? "نقدم برامج تدريبية تعاقدية مغلقة مصممة خصيصاً وفق التحديات والأولويات الاستراتيجية لمؤسستك في مقركم أو بأرقى فنادق مسقط."
                : "We deliver bespoke, closed-door masterclasses tailored to your strategic priorities. Available on-site at your headquarters or at premier venues across Oman."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                isAr
                  ? `مرحباً، أود الاستفسار عن تقديم دورة تدريبية تعاقدية خاصة لمؤسستنا من قبل ${brandName}.`
                  : `Hello! I would like to request a corporate in-house training proposal for our organization from ${brandName}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#00A859] hover:bg-[#008f4c] text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-md transition"
            >
              <WhatsAppIcon className="h-4 w-4 fill-current" />
              <span>{isAr ? "طلب عرض تدريب مؤسسي" : "Inquire via WhatsApp"}</span>
            </a>
            <a
              href={`mailto:${contactEmail}?subject=${encodeURIComponent("Corporate Training Inquiry")}`}
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl border border-white/20 transition"
            >
              <Mail className="h-4 w-4" />
              <span>{isAr ? "مراسلة إدارة القبول" : "Email Admissions"}</span>
            </a>
          </div>
        </div>
      </section>

      {/* Trainer & Faculty Profile */}
      <section id="trainer" className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 shadow-xs">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-600 text-white flex items-center justify-center font-black text-4xl shadow-md border-4 border-white shrink-0">
              S
            </div>
            <div className="space-y-4 text-center md:text-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {isAr ? "كبير المدربين والمستشارين" : "Lead Trainer & Principal Consultant"}
                </span>
                <h4 className="mt-2 text-2xl sm:text-3xl font-extrabold text-stone-900">
                  Said bin Saif Al Harthi
                </h4>
                <p className="text-sm font-semibold text-stone-600">
                  Managing Director · Tanfidh Management Consultants
                </p>
              </div>

              <p className="text-sm text-stone-600 leading-relaxed">
                {isAr
                  ? "خبير ومستشار معتمد في صياغة الاستراتيجيات المؤسسية، وتطبيق بطاقات الأداء المتوازن (Balanced Scorecard)، ومؤشرات الأداء الرئيسية (KPIs)، وإعادة هيكلة العمليات وتطوير القيادات عبر القطاعين الحكومي والخاص في سلطنة عمان ومنطقة الخليج."
                  : "Renowned management strategist and certified consultant with decades of executive advisory across government ministries, state-owned enterprises, and corporate boards in the Sultanate of Oman and the GCC. Specialized in Balanced Scorecard cascading, OKR implementation, and performance management."}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-stone-600">
                <div className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>{isAr ? "معتمد دولياً في بطاقة الأداء المتوازن" : "Certified Balanced Scorecard Professional"}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Award className="h-4 w-4 text-emerald-600" />
                  <span>{isAr ? "أكثر من 1,500 قيادي متدرب" : "1,500+ Executives Trained"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Certificate Verification Banner */}
      <section className="py-10 bg-emerald-50/50 border-t border-b border-emerald-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span>{isAr ? "التحقق المباشر من صحة الشهادات" : "Direct Digital Credential Verification"}</span>
          </div>
          <h4 className="text-2xl font-extrabold text-stone-900">
            {isAr ? "هل حصلت على شهادة معتمدة من تنفيذ؟" : "Hold a Certificate Issued by Tanfidh?"}
          </h4>
          <p className="text-sm text-stone-600 max-w-xl mx-auto">
            {isAr
              ? "يمكنك التحقق من صحة أي شهادة تدريبية أو رخصة مهنية صادرة عبر إدخال رقم الشهادة في سجل التحقق المركزي الموثق."
              : "Verify credential authenticity, issuance date, cohort details, and accredited CEUs instantly through our secure verification engine."}
          </p>
          <div className="pt-2">
            <Link
              href="/training/verify-certificate"
              className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition"
            >
              <FileCheck className="h-4 w-4" />
              <span>{isAr ? "التحقق من الشهادة الآن" : "Verify Certificate Now"}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-300 py-12 border-t border-stone-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3 md:col-span-2">
            <h5 className="text-base font-extrabold text-white">{brandName}</h5>
            <p className="text-stone-400 max-w-md leading-relaxed">
              {isAr
                ? "معهد رائد في تقديم البرامج التدريبية المتقدمة والتنفيذية والاستشارات الاستراتيجية في سلطنة عمان ومنطقة الخليج العربي."
                : "Leading executive training academy and management consultancy delivering world-class certifications in strategy, KPIs, and corporate governance in Oman and the GCC."}
            </p>
            <div className="text-stone-400 space-y-1 pt-1">
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>{address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <a href={`mailto:${contactEmail}`} className="hover:text-white transition">{contactEmail}</a>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <a href={`tel:${contactPhone}`} className="hover:text-white transition">{contactPhone}</a>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h6 className="font-bold text-white uppercase tracking-wider text-[11px]">{isAr ? "روابط سريعة" : "Quick Links"}</h6>
            <ul className="space-y-1.5 text-stone-400">
              <li><a href="#courses" className="hover:text-white transition">{isAr ? "دليل الدورات" : "Course Catalog"}</a></li>
              <li><a href="#corporate" className="hover:text-white transition">{isAr ? "التدريب التعاقدي" : "Corporate Training"}</a></li>
              <li><Link href="/training/verify-certificate" className="hover:text-white transition">{isAr ? "التحقق من الشهادات" : "Verify Certificate"}</Link></li>
              <li><a href={defaultWhatsAppUrl} target="_blank" rel="noreferrer" className="hover:text-white transition">{isAr ? "مكتب القبول والتسجيل" : "Admissions WhatsApp"}</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h6 className="font-bold text-white uppercase tracking-wider text-[11px]">{isAr ? "الضمان والاعتماد" : "Accreditation"}</h6>
            <p className="text-stone-400 leading-relaxed">
              {isAr
                ? "جميع البرامج متوافقة مع أحدث الممارسات العالمية وبطاقة الأداء المتوازن، وتمنح شهادات معتمدة مع حقيبة عمل تطبيقية كاملة."
                : "Accredited curricula aligned with international management frameworks, Balanced Scorecard methodology, and verified credentials."}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-stone-500">
          <p>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Powered by</span>
            <a href="https://app.fizmoh.cloud" className="text-emerald-400 font-semibold hover:underline">Fizmoh WhatsApp Cloud</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
