"use client"

import React, { useState } from "react"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Award,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Shield,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building,
  UserCheck,
  Send,
  Ticket,
} from "lucide-react"
import { Course, calculateRegistrationPricing, PricingCalculationResult } from "@/lib/training-types"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

interface Props {
  course: Course
  registrationId?: string
  initialSource?: string
  bankAccounts?: Array<{
    id: string
    bankName: string
    accountName: string
    accountNumber: string
    iban?: string | null
    branch?: string | null
    swiftCode?: string | null
    currency?: string | null
    isDefault?: boolean
  }>
}

export default function TrainingLandingClient({ course, registrationId, initialSource, bankAccounts = [] }: Props) {
  // State for Booking Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [requestedSeats, setRequestedSeats] = useState<number>(1)

  // Primary Buyer Form
  const [buyerName, setBuyerName] = useState("")
  const [buyerPhone, setBuyerPhone] = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [country, setCountry] = useState("Sultanate of Oman")
  const [paymentMethod, setPaymentMethod] = useState<"PAYMENT_LINK" | "BANK_TRANSFER" | "CASH">("BANK_TRANSFER")
  const [paymentReference, setPaymentReference] = useState("")
  const [notes, setNotes] = useState("")
  const [customValues, setCustomValues] = useState<Record<string, any>>({})

  // Additional Attendees
  const [attendees, setAttendees] = useState<Array<{ name: string; email: string; phone: string; designation: string }>>([
    { name: "", email: "", phone: "", designation: "" },
    { name: "", email: "", phone: "", designation: "" },
  ])

  // Booking submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState<any>(null)

  // FAQ accordion state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0)

  // Pricing breakdown calculation
  const pricing: PricingCalculationResult = calculateRegistrationPricing(course, requestedSeats)

  // Ensure attendees list matches totalAttendeesAllowed
  const handleSeatsChange = (seats: number) => {
    setRequestedSeats(seats)
    const newPricing = calculateRegistrationPricing(course, seats)
    const count = newPricing.totalAttendeesAllowed

    setAttendees(prev => {
      const next = [...prev]
      while (next.length < count) {
        next.push({ name: "", email: "", phone: "", designation: "" })
      }
      return next.slice(0, count)
    })
  }

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    try {
      const payload = {
        courseId: course.id,
        customerName: buyerName,
        customerPhone: buyerPhone,
        customerWhatsApp: buyerPhone,
        customerEmail: buyerEmail,
        companyName,
        jobTitle,
        country,
        notes: [notes, paymentReference ? `Payment Ref / Bank: ${paymentReference}` : ""].filter(Boolean).join(" | "),
        numberOfSeats: requestedSeats,
        paymentMethod,
        source: (initialSource as any) || "WEBSITE",
        customValues,
        attendees: attendees.map((att, idx) => ({
          name: idx === 0 && !att.name ? buyerName : att.name,
          email: idx === 0 && !att.email ? buyerEmail : att.email,
          phone: idx === 0 && !att.phone ? buyerPhone : att.phone,
          designation: idx === 0 && !att.designation ? jobTitle : att.designation,
          company: companyName,
        })),
      }

      const res = await fetch(`/api/training/courses/${course.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit registration")
      }

      setBookingSuccess(data)
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const cleanWhatsAppNumber = (course.whatsappNumber || "+96892009161").replace(/[^0-9]/g, "")
  const whatsappInquiryUrl = `https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(
    `Hello Tanfidh Consultants! I am interested in the "${course.name}" (${course.startDate}). Can you provide more details?`,
  )}`

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-bold shadow-sm">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                {course.trainerCompany || "Executive Academy"}
              </div>
              <div className="text-sm font-bold text-stone-900 truncate max-w-[220px] sm:max-w-md">
                {course.shortTitle || course.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={whatsappInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <WhatsAppIcon className="h-3.5 w-3.5 fill-current" />
              <span className="hidden sm:inline">WhatsApp Inquiries</span>
            </a>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 shadow transition-all active:scale-[0.98]"
            >
              Book Now
            </button>
          </div>
        </div>
      </header>

      {/* SPECIAL OFFER RIBBON */}
      {course.offerType !== "NONE" && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white text-xs font-medium py-2.5 px-4 text-center shadow-inner">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 flex-wrap">
            <Sparkles className="h-4 w-4 shrink-0 animate-pulse text-amber-200" />
            <span className="font-bold">{course.offerTitle || "Special Offer Active:"}</span>
            <span className="text-amber-100 hidden md:inline">—</span>
            <span className="text-amber-50">{course.offerDescription}</span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="ml-2 underline font-bold hover:text-white transition-colors"
            >
              Claim Offer &rarr;
            </button>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-14 lg:pb-20 border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  {course.type}
                </span>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                  {course.category}
                </span>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {course.mode}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-stone-900 tracking-tight leading-[1.15]">
                {course.name}
              </h1>

              <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-2xl">
                {course.description}
              </p>

              {/* Schedule and venue quick grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-stone-500">Dates & Duration</div>
                    <div className="text-xs font-bold text-stone-900">
                      {course.startDate} to {course.endDate} ({course.duration})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-stone-500">Venue & City</div>
                    <div className="text-xs font-bold text-stone-900 truncate max-w-[200px]">
                      {course.venueName}, {course.city}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hero CTA buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg shadow-amber-900/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <span>Book Your Seat</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <a
                  href={whatsappInquiryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 rounded-xl font-semibold text-sm bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 flex items-center justify-center gap-2 transition-colors"
                >
                  <WhatsAppIcon className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                  <span>Register via WhatsApp</span>
                </a>
              </div>

              {/* Seats scarcity badge */}
              <div className="flex items-center gap-2 text-xs text-stone-500 pt-1">
                <Users className="h-4 w-4 text-amber-600" />
                <span>
                  Limited Cohort Size: <strong>{course.maxSeats} seats total</strong> &bull;{" "}
                  <span className="text-emerald-700 font-semibold">{course.availableSeats} seats remaining</span>
                </span>
              </div>
            </div>

            {/* Right Card / Pricing Summary */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-200/50 overflow-hidden">
                {course.bannerUrl && (
                  <div className="h-44 w-full overflow-hidden relative">
                    <img
                      src={course.bannerUrl}
                      alt={course.name}
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                      <div className="text-white text-xs font-semibold flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-amber-400" />
                        <span>Verifiable Certificate Included</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-5">
                  <div className="flex items-baseline justify-between border-b border-stone-100 pb-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                        Registration Fee
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-stone-900">
                          {course.currency} {course.standardPrice}
                        </span>
                        {course.offerType === "BOGO" && (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            2 Participants
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-stone-400 font-medium">VAT (5%) Included</div>
                      <div className="text-xs font-semibold text-amber-700">Official Receipt</div>
                    </div>
                  </div>

                  {course.offerTitle && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                      <Ticket className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">{course.offerTitle}</div>
                        <div className="text-[11px] text-amber-800/90 mt-0.5">
                          {course.offerDescription || "Register 1 paid seat and bring 1 colleague for free."}
                        </div>
                      </div>
                    </div>
                  )}

                  <ul className="space-y-2.5 text-xs text-stone-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>2 Days executive workshop with Said Al Harthi</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Full strategic toolkit & AI scorecards package</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>5-Star Sheraton lunches & networking receptions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Cryptographically verifiable certificate</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-stone-900 hover:bg-stone-800 text-white shadow-md transition-all active:scale-[0.98]"
                  >
                    Register Online Now
                  </button>

                  <div className="text-center text-[11px] text-stone-400">
                    Corporate POs & Bank Transfers accepted. Invoice issued immediately.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS & LEARNING OBJECTIVES */}
      <section className="py-14 border-b border-stone-200 bg-stone-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Learning Objectives */}
            <div className="space-y-5 bg-white p-7 rounded-2xl border border-stone-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                <Sparkles className="h-4 w-4" />
                <span>Executive Competencies</span>
              </div>
              <h2 className="text-2xl font-bold text-stone-900">What You Will Master</h2>
              <div className="space-y-3">
                {course.learningObjectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">{obj}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Who Should Attend */}
            <div className="space-y-5 bg-white p-7 rounded-2xl border border-stone-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                <Users className="h-4 w-4" />
                <span>Target Profiles</span>
              </div>
              <h2 className="text-2xl font-bold text-stone-900">Who Should Attend</h2>
              <div className="space-y-3">
                {course.targetAudience.map((audience, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                      {audience}
                    </p>
                  </div>
                ))}
              </div>

              {course.prerequisites.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <div className="text-xs font-bold text-stone-800 mb-2">Prerequisites:</div>
                  <ul className="space-y-1.5 text-xs text-stone-500">
                    {course.prerequisites.map((p, idx) => (
                      <li key={idx}>&bull; {p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TRAINER PROFILE SECTION */}
      <section className="py-14 border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center space-y-2 mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Masterclass Faculty</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">Meet Your Instructor</h2>
          </div>

          <div className="p-8 rounded-2xl border border-stone-200 bg-stone-50 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6">
            {course.trainerImage && (
              <img
                src={course.trainerImage}
                alt={course.trainerName}
                className="h-28 w-28 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
              />
            )}
            <div className="space-y-3 text-center md:text-left">
              <div>
                <h3 className="text-xl font-bold text-stone-900">{course.trainerName}</h3>
                <div className="text-xs font-medium text-amber-700">{course.trainerDesignation}</div>
                <div className="text-xs text-stone-500">{course.trainerCompany}</div>
              </div>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{course.trainerBio}</p>

              <div className="flex items-center justify-center md:justify-start gap-4 pt-2 text-xs font-medium text-stone-500">
                {course.trainerEmail && <span>Email: {course.trainerEmail}</span>}
                {course.trainerPhone && <span>Tel: {course.trainerPhone}</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SCHEDULE & VENUE DETAILS */}
      <section className="py-14 border-b border-stone-200 bg-stone-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center space-y-2 mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Logistics & Venue</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">Executive Venue & Timetable</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-stone-200 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Daily Masterclass Hours</h4>
                <p className="text-xs text-stone-500 mt-1">
                  {course.startTime} to {course.endTime}
                </p>
                <p className="text-[11px] text-stone-400 mt-1">Timezone: {course.timezone}</p>
              </div>
              <ul className="text-xs text-stone-600 space-y-1.5 pt-2 border-t border-stone-100">
                <li>&bull; 08:30 AM: Registration & Welcome Coffee</li>
                <li>&bull; 09:00 AM - 12:30 PM: Morning Sessions & AI Labs</li>
                <li>&bull; 12:30 PM - 01:30 PM: Sheraton Executive Buffet Lunch</li>
                <li>&bull; 01:30 PM - 04:00 PM: Afternoon Strategy Cascading & Q&A</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-stone-200 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-sm">{course.venueName}</h4>
                <p className="text-xs text-stone-500 mt-1">
                  {course.address}, {course.city}, {course.country}
                </p>
              </div>

              {course.mapUrl && (
                <div className="pt-2 border-t border-stone-100">
                  <a
                    href={course.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 underline"
                  >
                    <span>Open in Google Maps</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQS SECTION */}
      {course.faqs.length > 0 && (
        <section className="py-14 border-b border-stone-200 bg-white">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center space-y-2 mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">FAQ</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-3">
              {course.faqs.map((faq, idx) => {
                const isOpen = expandedFaq === idx
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50 transition-colors"
                  >
                    <button
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-stone-900 hover:bg-stone-100/50"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-stone-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-stone-500" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-200/50 bg-white">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* BOTTOM CTA BAR */}
      <section className="py-12 bg-stone-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold">Secure Your Cohort Seats Today</h2>
          <p className="text-stone-300 text-xs sm:text-sm max-w-xl mx-auto">
            {course.offerTitle || "Register today to lock in your seats."} Maximum {course.maxSeats} delegates
            to guarantee executive workshop intimacy.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-900/40 active:scale-[0.98]"
            >
              Book Now &bull; {course.currency} {course.standardPrice}
            </button>
            <a
              href={whatsappInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center justify-center gap-2"
            >
              <WhatsAppIcon className="h-4 w-4 fill-emerald-400" />
              <span>Ask via WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 bg-stone-950 text-stone-400 text-xs text-center border-t border-stone-800">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="text-stone-300 font-semibold">{course.trainerCompany || "Tanfidh Management Consultants"}</p>
          <p className="max-w-2xl mx-auto text-[11px] text-stone-500 leading-relaxed">
            {course.termsAndConditions}
          </p>
          <div className="pt-4 text-[10px] text-stone-600">
            Powered by Fizmoh Training & Course Management System &bull; All Rights Reserved &copy; 2026
          </div>
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* REGISTRATION MODAL WITH MULTI-ATTENDEE & OFFER MATH */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
                  Course Registration
                </div>
                <h3 className="text-base sm:text-lg font-bold truncate max-w-md">{course.name}</h3>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setBookingSuccess(null)
                  setSubmitError(null)
                }}
                className="h-8 w-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                &times;
              </button>
            </div>

            {/* Content / Booking Success or Form */}
            {bookingSuccess ? (
              <div className="p-8 text-center space-y-5">
                <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-stone-900">Registration Received!</h4>
                  <p className="text-xs text-stone-500">
                    Your registration reference is{" "}
                    <span className="font-mono font-bold text-stone-800">
                      {bookingSuccess.registration?.registrationNumber}
                    </span>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-left text-xs space-y-2.5 max-w-md mx-auto">
                  <div className="flex justify-between border-b border-stone-200 pb-2">
                    <span className="text-stone-500">Total Delegates:</span>
                    <span className="font-bold text-stone-800">
                      {bookingSuccess.registration?.numberOfSeats} Participants
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-stone-200 pb-2">
                    <span className="text-stone-500">Total Payable:</span>
                    <span className="font-bold text-amber-700 text-sm">
                      {course.currency} {bookingSuccess.registration?.totalAmount?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-stone-200 pb-2">
                    <span className="text-stone-500">Dates:</span>
                    <span className="font-medium text-stone-800">
                      {course.startDate} to {course.endDate}
                    </span>
                  </div>

                  {/* Bank transfer instructions if bank accounts exist */}
                  {bankAccounts && bankAccounts.length > 0 ? (
                    <div className="pt-1 text-[11px] space-y-1">
                      <span className="font-bold text-stone-900 block">Bank Transfer Instructions:</span>
                      <div className="bg-white p-2.5 rounded-lg border border-stone-200 space-y-1">
                        <div><strong>Bank:</strong> {bankAccounts[0].bankName}</div>
                        <div><strong>Beneficiary:</strong> {bankAccounts[0].accountName}</div>
                        <div><strong>Account No:</strong> <span className="font-mono">{bankAccounts[0].accountNumber}</span></div>
                        {bankAccounts[0].iban && <div><strong>IBAN:</strong> <span className="font-mono">{bankAccounts[0].iban}</span></div>}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1 text-[11px] text-stone-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      <strong>Payment Method:</strong> Direct Bank Transfer. An official invoice with complete bank details has been issued.
                    </div>
                  )}
                </div>

                {bookingSuccess.whatsappSent && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-center gap-1.5 max-w-md mx-auto">
                    <WhatsAppIcon className="h-4 w-4 fill-emerald-600 shrink-0" />
                    <span>WhatsApp confirmation & receipt message dispatched to your phone!</span>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                  <a
                    href={`https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(
                      `Hello Tanfidh Consultants! I have registered for "${course.name}" (Reference: ${bookingSuccess.registration?.registrationNumber || ""}). Here is my payment receipt for verification.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors"
                  >
                    <WhatsAppIcon className="h-3.5 w-3.5 fill-current" />
                    <span>Send Transfer Receipt via WhatsApp</span>
                  </a>
                  <button
                    onClick={() => {
                      setIsModalOpen(false)
                      setBookingSuccess(null)
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitRegistration} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {submitError && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                    {submitError}
                  </div>
                )}

                {/* 1. SEAT SELECTION & DYNAMIC OFFER CALCULATION */}
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Select Seats
                    </label>
                    {course.offerType === "BOGO" && (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        Pay 1 Get 1 FREE Applied
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSeatsChange(s)}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                          requestedSeats === s
                            ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                            : "bg-white text-stone-700 border-stone-200 hover:border-amber-300"
                        }`}
                      >
                        {s} {s === 1 ? "Seat" : "Seats"}
                      </button>
                    ))}
                  </div>

                  {/* Pricing dynamic calculation details */}
                  <div className="text-xs pt-1 border-t border-amber-200/60 flex items-center justify-between text-stone-700">
                    <div>
                      <span>
                        Paid Seats: <strong>{pricing.paidSeats}</strong>
                      </span>
                      {pricing.freeSeats > 0 && (
                        <span className="text-emerald-700 font-bold ml-2">
                          + {pricing.freeSeats} FREE Guest Seat(s)
                        </span>
                      )}
                    </div>
                    <div className="font-black text-sm text-stone-900">
                      Total: {course.currency} {pricing.totalAmount.toFixed(2)}{" "}
                      <span className="text-[10px] text-stone-500 font-normal">({pricing.totalAttendeesAllowed} Total Attendees)</span>
                    </div>
                  </div>
                </div>

                {/* 2. PRIMARY BUYER DETAILS */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 border-b border-stone-200 pb-1.5 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-amber-600" />
                    <span>Primary Buyer / Contact Person</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-stone-600 block mb-1">
                        Full Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={buyerName}
                        onChange={e => setBuyerName(e.target.value)}
                        placeholder="e.g. Ahmed Al Harthy"
                        className="w-full h-9 px-3 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-stone-600 block mb-1">
                        Mobile & WhatsApp Number *
                      </label>
                      <input
                        required
                        type="tel"
                        value={buyerPhone}
                        onChange={e => setBuyerPhone(e.target.value)}
                        placeholder="+968 9123 4567"
                        className="w-full h-9 px-3 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-stone-600 block mb-1">
                        Corporate Email *
                      </label>
                      <input
                        required
                        type="email"
                        value={buyerEmail}
                        onChange={e => setBuyerEmail(e.target.value)}
                        placeholder="ahmed@company.om"
                        className="w-full h-9 px-3 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-stone-600 block mb-1">
                        Company / Organization
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="e.g. Omantel / Ministry"
                        className="w-full h-9 px-3 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-stone-600 block mb-1">
                        Job Title / Designation
                      </label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={e => setJobTitle(e.target.value)}
                        placeholder="Director of Strategy"
                        className="w-full h-9 px-3 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-stone-600 block mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        placeholder="Oman"
                        className="w-full h-9 px-3 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. MULTIPLE ATTENDEES ROSTER */}
                {pricing.totalAttendeesAllowed > 1 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-amber-600" />
                        <span>Attendee Roster ({pricing.totalAttendeesAllowed} Total)</span>
                      </h4>
                      <span className="text-[10px] text-stone-400">
                        Attendee 1 defaults to Primary Contact
                      </span>
                    </div>

                    <div className="space-y-3">
                      {Array.from({ length: pricing.totalAttendeesAllowed }).map((_, idx) => {
                        const isFree = idx >= pricing.paidSeats
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-xs space-y-2 ${
                              isFree
                                ? "bg-emerald-50/50 border-emerald-200"
                                : "bg-stone-50 border-stone-200"
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-stone-800">
                              <span>Attendee {idx + 1}</span>
                              {isFree ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                  FREE SEAT
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                                  PAID DELEGATE
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="text"
                                placeholder={idx === 0 ? "Name (Same as Buyer)" : `Attendee ${idx + 1} Name`}
                                value={attendees[idx]?.name || ""}
                                onChange={e => {
                                  const val = e.target.value
                                  setAttendees(prev => {
                                    const next = [...prev]
                                    if (!next[idx]) next[idx] = { name: "", email: "", phone: "", designation: "" }
                                    next[idx].name = val
                                    return next
                                  })
                                }}
                                className="h-8 px-2 rounded border border-stone-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />

                              <input
                                type="email"
                                placeholder="Attendee Email"
                                value={attendees[idx]?.email || ""}
                                onChange={e => {
                                  const val = e.target.value
                                  setAttendees(prev => {
                                    const next = [...prev]
                                    if (!next[idx]) next[idx] = { name: "", email: "", phone: "", designation: "" }
                                    next[idx].email = val
                                    return next
                                  })
                                }}
                                className="h-8 px-2 rounded border border-stone-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />

                              <input
                                type="text"
                                placeholder="Job Title / Designation"
                                value={attendees[idx]?.designation || ""}
                                onChange={e => {
                                  const val = e.target.value
                                  setAttendees(prev => {
                                    const next = [...prev]
                                    if (!next[idx]) next[idx] = { name: "", email: "", phone: "", designation: "" }
                                    next[idx].designation = val
                                    return next
                                  })
                                }}
                                className="h-8 px-2 rounded border border-stone-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 4. CUSTOM FIELDS */}
                {course.customFields.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 border-b border-stone-200 pb-1.5">
                      Additional Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {course.customFields.map(f => (
                        <div key={f.id}>
                          <label className="text-[11px] font-medium text-stone-600 block mb-1">
                            {f.label} {f.required && "*"}
                          </label>
                          {f.type === "dropdown" ? (
                            <select
                              required={f.required}
                              value={customValues[f.name] || ""}
                              onChange={e =>
                                setCustomValues({ ...customValues, [f.name]: e.target.value })
                              }
                              className="w-full h-9 px-3 rounded-lg border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="">Select an option...</option>
                              {f.options?.map((opt, oIdx) => (
                                <option key={oIdx} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              required={f.required}
                              type="text"
                              value={customValues[f.name] || ""}
                              onChange={e =>
                                setCustomValues({ ...customValues, [f.name]: e.target.value })
                              }
                              className="w-full h-9 px-3 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. PAYMENT METHOD */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Payment Method
                    </h4>
                    <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Direct Bank Transfer / Wire
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("BANK_TRANSFER")}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        paymentMethod === "BANK_TRANSFER"
                          ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs"
                          : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                      }`}
                    >
                      <Building className="h-4 w-4 text-amber-600" />
                      <span>Bank Wire Transfer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CASH")}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        paymentMethod === "CASH"
                          ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-xs"
                          : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                      }`}
                    >
                      <Ticket className="h-4 w-4" />
                      <span>Purchase Order / Cheque</span>
                    </button>
                  </div>

                  {/* Bank Details Display Card */}
                  {paymentMethod === "BANK_TRANSFER" && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50/90 to-stone-50 border border-amber-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-amber-700" />
                          Official Bank Transfer Account
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                          Manual Payment
                        </span>
                      </div>

                      {bankAccounts && bankAccounts.length > 0 ? (
                        <div className="bg-white p-2.5 rounded-lg border border-amber-200/80 space-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-stone-500">Bank Name:</span>
                            <span className="font-bold text-stone-900">{bankAccounts[0].bankName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-500">Beneficiary:</span>
                            <span className="font-bold text-stone-900">{bankAccounts[0].accountName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-500">Account No:</span>
                            <span className="font-mono font-bold text-stone-900">{bankAccounts[0].accountNumber}</span>
                          </div>
                          {bankAccounts[0].iban && (
                            <div className="flex justify-between">
                              <span className="text-stone-500">IBAN:</span>
                              <span className="font-mono font-bold text-stone-900">{bankAccounts[0].iban}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white p-2.5 rounded-lg border border-amber-200/80 text-[11px] text-stone-600">
                          Bank transfer details and pro-forma invoice will be provided immediately upon submitting your registration.
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                          Payment Reference / Bank Transaction ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={e => setPaymentReference(e.target.value)}
                          placeholder="e.g. Bank Muscat Transfer Ref #12345 or In Progress"
                          className="w-full h-8 px-2.5 rounded border border-stone-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* TOTAL SUMMARY & SUBMIT */}
                <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] text-stone-500">Payable Today</div>
                    <div className="text-xl font-black text-stone-900">
                      {course.currency} {pricing.totalAmount.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold shadow-md disabled:opacity-50"
                    >
                      {submitting ? "Processing..." : "Confirm Registration"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
