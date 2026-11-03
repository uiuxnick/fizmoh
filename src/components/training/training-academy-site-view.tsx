"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin, Search, Clock, ShieldCheck, UsersRound } from "lucide-react"
import type { Course } from "@/lib/training-types"
import { formatCourseSchedule } from "@/lib/course-schedule"
import { academyCourseUrl, academyVerifyUrl, academyWhatsApp, type AcademyBrand } from "@/lib/academy-brand"
import { AcademyHeader, AcademyFooter } from "./academy-chrome"

interface Props {
  slug?: string
  courses?: Course[]
  tenant?: { id?: string; slug?: string; name?: string } | null
  brandName?: string
  brandLogo?: string | null
  contactEmail?: string
  contactPhone?: string
  address?: string
}

export default function TrainingAcademySiteView({ slug = "tanfidh", courses = [], tenant, brandName, brandLogo, contactEmail, contactPhone, address }: Props) {
  const brand: AcademyBrand = { id: tenant?.id, slug: tenant?.slug || slug, name: brandName || tenant?.name || "Training Academy", logo: brandLogo, email: contactEmail, phone: contactPhone, address }
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All programmes")
  const published = useMemo(() => courses.filter(c => c.landingPageEnabled && c.status !== "DRAFT"), [courses])
  const categories = ["All programmes", ...new Set(published.map(c => c.category).filter(Boolean))]
  const filtered = published.filter(c => (category === "All programmes" || c.category === category) && `${c.name} ${c.description || ""} ${c.trainerName || ""}`.toLowerCase().includes(query.trim().toLowerCase()))
  const featured = published[0]
  const faculty = published.filter((c, i, list) => c.trainerName && list.findIndex(x => x.trainerName === c.trainerName) === i)
  const whatsapp = academyWhatsApp(brand)
  return <div className="min-h-screen bg-[#faf9f6] font-sans text-stone-900 selection:bg-emerald-100">
    <AcademyHeader brand={brand} />
    <main id="main-content">
      <section className="border-b border-stone-200">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-20">
          <div><p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">Professional development · {brand.name}</p>
            <h1 className="max-w-2xl font-serif text-4xl leading-[1.12] tracking-tight sm:text-6xl">Build the skills.<br /><span className="text-emerald-800">Make the difference.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-stone-600">Focused training for professionals and teams. Explore programmes, meet your instructors and plan your next step with confidence.</p>
            <div className="mt-8 flex flex-wrap gap-3"><a href="#courses" className="inline-flex items-center gap-3 rounded-md bg-emerald-950 px-6 py-3.5 text-sm font-semibold text-white hover:bg-emerald-800">Explore courses <ArrowRight className="h-4 w-4" /></a>{whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-md border border-stone-300 px-6 py-3.5 text-sm font-semibold hover:bg-white">Talk to our team</a>}</div>
            <div className="mt-10 flex flex-wrap gap-7 border-t border-stone-200 pt-6 text-xs text-stone-600"><span><strong className="mr-2 text-lg font-semibold text-stone-900">{published.length}</strong> programmes</span><Link href={academyVerifyUrl(brand)} className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-800" /> Verifiable course credentials</Link></div>
          </div>
          {featured ? <article className="relative overflow-hidden rounded-xl bg-emerald-950 p-7 text-white sm:p-10">
            <div className="mb-10 flex items-center justify-between border-b border-white/20 pb-5"><span className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200">Featured programme</span><span className="font-serif text-2xl text-emerald-200">01</span></div>
            <p className="mb-3 text-xs font-medium text-emerald-200">{featured.category}</p><h2 className="font-serif text-2xl leading-snug sm:text-3xl">{featured.name}</h2><p className="mt-5 line-clamp-3 text-sm leading-6 text-emerald-50/80">{featured.description}</p>
            <div className="mt-8 space-y-3 text-sm"><p className="flex items-start gap-3"><CalendarDays className="h-4 w-4 shrink-0" />{formatCourseSchedule(featured)}</p><p className="flex items-center gap-3"><MapPin className="h-4 w-4 shrink-0" />{featured.venueName || featured.city || featured.mode}</p></div>
            <Link href={academyCourseUrl(brand, featured.id)} className="mt-8 flex items-center justify-between border-t border-white/20 pt-5 text-sm font-semibold">Discover this programme <ArrowUpRight className="h-5 w-5" /></Link>
          </article> : <div className="rounded-xl border border-stone-200 bg-white p-10"><h2 className="font-serif text-3xl">Your next chapter starts here.</h2><p className="mt-4 text-stone-600">New programmes will appear here when available.</p></div>}
        </div>
      </section>
      <section id="courses" className="scroll-mt-36 px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Find your next programme</p><h2 className="mt-3 font-serif text-3xl sm:text-4xl">Learning with purpose.</h2><p className="mt-3 text-sm text-stone-600">Compare topics, dates and course details in one place.</p></div><label className="flex w-full items-center gap-3 rounded-md border border-stone-300 bg-white px-4 md:w-80"><Search className="h-4 w-4 shrink-0 text-stone-500" /><span className="sr-only">Search courses</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search courses or instructors" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none focus:ring-0" /></label></div>

          <div className="my-5 flex flex-wrap gap-2" role="group" aria-label="Course categories">{categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`rounded-md border px-3 py-2 text-xs font-medium transition ${category === item ? "border-emerald-950 bg-emerald-950 text-white" : "border-stone-200 bg-white text-stone-600 hover:border-emerald-700"}`}>{item}</button>)}</div>
          <p className="mb-5 text-xs text-stone-500" aria-live="polite">{filtered.length} {filtered.length === 1 ? "programme" : "programmes"}</p>
          {filtered.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((course, index) => <article key={course.id} className="group flex min-h-[430px] flex-col overflow-hidden rounded-xl border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:border-emerald-700 hover:shadow-lg hover:shadow-emerald-950/5">
            <div className="h-1.5 bg-gradient-to-r from-emerald-700 via-emerald-500 to-teal-400" /><div className="flex flex-1 flex-col p-6">
            <div className="mb-5 flex items-start justify-between gap-4"><p className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase leading-4 tracking-wider text-emerald-800">{course.category}</p><span className="font-serif text-xl text-stone-300">{String(index + 1).padStart(2, "0")}</span></div>
            <h3 className="text-lg font-semibold leading-snug"><Link href={academyCourseUrl(brand, course.id)} className="group-hover:text-emerald-800">{course.name}</Link></h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">{course.description}</p>
            <div className="my-6 grid gap-3 border-y border-stone-100 py-5 text-xs leading-5 text-stone-600"><p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span><strong className="block font-semibold text-stone-800">Course dates</strong>{formatCourseSchedule(course)}</span></p><p className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span><strong className="block font-semibold text-stone-800">Schedule</strong>{course.duration}{course.timezone ? ` · ${course.timezone}` : ""}</span></p><p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><span><strong className="block font-semibold text-stone-800">Location</strong>{course.venueName || course.city || course.mode}</span></p></div>
            <div className="mt-auto"><div className="flex items-end justify-between gap-3"><div><p className="text-xs text-stone-500">Programme fee</p><p className="mt-1 text-xl font-semibold">{course.currency} {Number(course.standardPrice || 0).toLocaleString("en-GB")}<span className="ml-1 text-xs font-normal text-stone-500">/ delegate</span></p></div>{course.maxSeats ? <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-[10px] font-medium text-stone-600"><UsersRound className="h-3 w-3" />{course.availableSeats ?? course.maxSeats} left</span> : null}</div>{course.offerType !== "NONE" && course.offerTitle && <p className="mt-3 text-xs font-medium text-emerald-800">{course.offerTitle}</p>}<Link href={academyCourseUrl(brand, course.id)} className="mt-5 flex items-center justify-between rounded-md bg-emerald-900 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800">View course & register <ArrowRight className="h-4 w-4" /></Link></div></div>
          </article>)}</div> : <div className="rounded-lg border border-stone-200 bg-white p-10 text-center"><h3 className="text-lg font-semibold">No matching programmes</h3><p className="mt-2 text-sm text-stone-600">Try another topic or clear your filters.</p><button onClick={() => { setQuery(""); setCategory("All programmes") }} className="mt-5 text-sm font-semibold text-emerald-800 underline">Clear filters</button></div>}
        </div>
      </section>
      {faculty.length > 0 && <section id="faculty" className="scroll-mt-36 border-y border-stone-200 bg-white px-5 py-14 sm:px-8"><div className="mx-auto max-w-7xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">The people behind your learning</p><h2 className="mt-3 font-serif text-3xl sm:text-4xl">Meet your faculty.</h2><div className="mt-8 grid gap-10 lg:grid-cols-2">{faculty.map(c => <article key={c.trainerName} className="flex flex-col gap-6 sm:flex-row">{c.trainerImage && <img src={c.trainerImage} alt={c.trainerName} loading="lazy" className="h-40 w-32 shrink-0 rounded-lg bg-stone-100 object-cover object-top" />}<div><h3 className="text-xl font-semibold">{c.trainerName}</h3><p className="mt-2 text-sm text-emerald-800">{c.trainerDesignation}</p><p className="mt-4 whitespace-pre-line text-sm leading-7 text-stone-600">{c.trainerBio}</p></div></article>)}</div></div></section>}
      <section id="corporate" className="px-5 py-14 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 rounded-lg bg-[#eeeee7] p-7 sm:p-10 md:flex-row md:items-center"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Learning for your team</p><h2 className="mt-3 font-serif text-3xl">Start a conversation about your goals.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">Discuss programme options, group registrations and your organisation’s training needs.</p></div>{whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center justify-center gap-3 rounded-md bg-emerald-950 px-5 py-3 text-sm font-semibold text-white">Contact our team <ArrowUpRight className="h-4 w-4" /></a>}</div></section>
    </main><AcademyFooter brand={brand} />
  </div>
}
