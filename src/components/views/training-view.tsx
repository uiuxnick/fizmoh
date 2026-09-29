"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Users,
  Award,
  DollarSign,
  TrendingUp,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  QrCode,
  Send,
  Ticket,
  FileSpreadsheet,
  Star,
  Settings,
  Edit,
  Trash2,
  RefreshCw,
  Building,
  UserCheck,
  CreditCard,
  MessageSquare,
  Eye,
  Check,
  Sparkles,
  ArrowRight,
  Download,
  Share2,
  BookOpen,
  User,
  Bot,
  FileImage,
  Camera,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Course,
  Registration,
  CertificateRecord,
  FeedbackRecord,
  RegistrationStage,
  PaymentStatus,
  SEED_COURSE_BSC,
  calculateRegistrationPricing,
} from "@/lib/training-types"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

const PIPELINE_STAGES: Array<{ key: RegistrationStage; label: string; color: string }> = [
  { key: "NEW_LEAD", label: "New Lead", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "INTERESTED", label: "Interested", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "REGISTRATION_SUBMITTED", label: "Submitted", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "AWAITING_PAYMENT", label: "Awaiting Payment", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "PAYMENT_CONFIRMED", label: "Payment Confirmed", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { key: "CONFIRMED", label: "Confirmed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "ATTENDED", label: "Attended", color: "bg-sky-50 text-sky-700 border-sky-200" },
  { key: "COMPLETED", label: "Completed", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "WAITLISTED", label: "Waitlisted", color: "bg-stone-100 text-stone-700 border-stone-300" },
  { key: "CANCELLED", label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200" },
]

export default function TrainingView() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "courses" | "registrations" | "attendees" | "certificates" | "feedback" | "reports"
  >("overview")

  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [certificates, setCertificates] = useState<CertificateRecord[]>([])
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([])
  const [stats, setStats] = useState<any>(null)

  // Filters
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("ALL")
  const [selectedStageFilter, setSelectedStageFilter] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [regViewMode, setRegViewMode] = useState<"table" | "kanban">("table")

  // Selected Registration Drawer/Modal
  const [activeRegistration, setActiveRegistration] = useState<Registration | null>(null)

  // Course Editor Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null)
  const [availableFlows, setAvailableFlows] = useState<Array<{ id: string; name: string; isActive: boolean }>>([])
  const [editorSubTab, setEditorSubTab] = useState<
    "basic" | "trainer" | "schedule" | "pricing" | "offers" | "whatsapp"
  >("basic")

  // WhatsApp manual template trigger modal
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false)
  const [selectedMsgType, setSelectedMsgType] = useState<string>("CONFIRMATION")
  const [customMsgBody, setCustomMsgBody] = useState("")
  const [targetPhone, setTargetPhone] = useState("")

  // Fetch all module data
  const fetchData = async () => {
    setLoading(true)
    try {
      const [coursesRes, regRes, certRes, fbRes, statsRes, flowsRes] = await Promise.all([
        fetch("/api/training/courses").then(r => r.json()),
        fetch("/api/training/registrations").then(r => r.json()),
        fetch("/api/training/certificates").then(r => r.json()),
        fetch("/api/training/feedback").then(r => r.json()),
        fetch("/api/training/stats").then(r => r.json()),
        fetch("/api/botflows").then(r => r.json()).catch(() => ({ flows: [] })),
      ])

      if (coursesRes.courses) setCourses(coursesRes.courses)
      if (regRes.registrations) setRegistrations(regRes.registrations)
      if (certRes.certificates) setCertificates(certRes.certificates)
      if (fbRes.feedback) setFeedback(fbRes.feedback)
      if (statsRes.kpis) setStats(statsRes.kpis)
      if (flowsRes.flows) setAvailableFlows(flowsRes.flows)
    } catch (err) {
      console.error("Error loading training data:", err)
      toast.error("Failed to load training module data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Duplicate Course Action
  const handleDuplicateCourse = async (courseId: string) => {
    try {
      const res = await fetch(`/api/training/courses/${courseId}?action=duplicate`, {
        method: "POST",
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Course duplicated successfully")
        fetchData()
      } else {
        toast.error(data.error || "Failed to duplicate course")
      }
    } catch {
      toast.error("Network error duplicating course")
    }
  }

  // Delete Course Action
  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course program?")) return
    try {
      const res = await fetch(`/api/training/courses/${courseId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Course deleted")
        fetchData()
      }
    } catch {
      toast.error("Error deleting course")
    }
  }

  // Save / Update Course in Modal
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse?.name) {
      toast.error("Please enter a course title")
      return
    }

    try {
      const isNew = !editingCourse.id
      const url = isNew ? "/api/training/courses" : `/api/training/courses/${editingCourse.id}`
      const method = isNew ? "POST" : "PUT"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCourse),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(isNew ? "Course created!" : "Course updated!")
        setIsCourseModalOpen(false)
        fetchData()
      } else {
        toast.error(data.error || "Failed to save course")
      }
    } catch {
      toast.error("Network error saving course")
    }
  }

  // Update Registration Status / Payment Status
  const handleUpdateRegStatus = async (
    regId: string,
    updates: Partial<Registration>,
    notifyWhatsApp = false,
  ) => {
    try {
      const res = await fetch(`/api/training/registrations/${regId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, notifyWhatsApp }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Registration updated")
        fetchData()
        if (activeRegistration && activeRegistration.id === regId) {
          setActiveRegistration(data.registration)
        }
      }
    } catch {
      toast.error("Failed to update registration")
    }
  }

  // Issue Certificate for Attendee
  const handleIssueCertificate = async (
    registrationId: string,
    attendeeId: string,
    phone: string,
  ) => {
    try {
      const res = await fetch("/api/training/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId,
          attendeeId,
          recipientPhone: phone,
          sendWhatsAppNotice: true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          `Certificate ${data.certificate.id} issued! WhatsApp credential link sent.`,
        )
        fetchData()
      } else {
        toast.error(data.error || "Failed to generate certificate")
      }
    } catch {
      toast.error("Error issuing certificate")
    }
  }

  // Send WhatsApp Trigger
  const handleSendWhatsAppNotification = async () => {
    if (!targetPhone || !activeRegistration) return
    try {
      const res = await fetch("/api/training/whatsapp/send-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: targetPhone,
          courseId: activeRegistration.courseId,
          registrationId: activeRegistration.id,
          messageType: selectedMsgType,
          customBody: customMsgBody,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("WhatsApp message dispatched successfully!")
        setWhatsAppModalOpen(false)
      } else {
        toast.error(data.error || "Failed to send WhatsApp message")
      }
    } catch {
      toast.error("Network error sending WhatsApp message")
    }
  }

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter(r => {
      const matchCourse =
        selectedCourseFilter === "ALL" ||
        r.courseId === selectedCourseFilter ||
        r.courseSlug === selectedCourseFilter
      const matchStage = selectedStageFilter === "ALL" || r.status === selectedStageFilter
      const matchSearch =
        !searchQuery ||
        r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customerPhone.includes(searchQuery) ||
        r.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.companyName && r.companyName.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchCourse && matchStage && matchSearch
    })
  }, [registrations, selectedCourseFilter, selectedStageFilter, searchQuery])

  // Flattened Attendees roster
  const allAttendees = useMemo(() => {
    const list: Array<{
      attendee: any
      registration: Registration
      course?: Course
    }> = []

    for (const r of registrations) {
      const c = courses.find(item => item.id === r.courseId || item.slug === r.courseSlug)
      if (Array.isArray(r.attendees)) {
        for (const att of r.attendees) {
          list.push({ attendee: att, registration: r, course: c })
        }
      }
    }
    return list
  }, [registrations, courses])

  // Export registrations as CSV
  const handleExportCSV = () => {
    if (registrations.length === 0) {
      toast.info("No registrations to export")
      return
    }
    const headers = [
      "Registration Number",
      "Course Name",
      "Customer Name",
      "Mobile / WhatsApp",
      "Email",
      "Company",
      "Job Title",
      "Total Seats",
      "Paid Seats",
      "Free Seats",
      "Total Amount (OMR)",
      "Payment Status",
      "Pipeline Stage",
      "Source",
      "Created At",
    ]

    const rows = registrations.map(r => [
      `"${r.registrationNumber}"`,
      `"${r.courseName}"`,
      `"${r.customerName}"`,
      `"${r.customerPhone}"`,
      `"${r.customerEmail}"`,
      `"${r.companyName || ""}"`,
      `"${r.jobTitle || ""}"`,
      r.numberOfSeats,
      r.paidSeats,
      r.freeSeats,
      r.totalAmount,
      `"${r.paymentStatus}"`,
      `"${r.status}"`,
      `"${r.source}"`,
      `"${new Date(r.createdAt).toLocaleDateString()}"`,
    ])

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `fizmoh_training_registrations_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("CSV export downloaded")
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shadow-md">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                Training & Course Management
              </h1>
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold">
                Add-on
              </Badge>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Course landing pages, BOGO offer engine, multi-attendee roster, QR check-in & WhatsApp automations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/training/checkin"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 flex items-center gap-1.5 transition-colors"
          >
            <QrCode className="h-4 w-4 text-amber-600" />
            <span>QR Scanner</span>
          </a>

          <Button
            onClick={() => {
              setEditingCourse({
                name: "",
                shortTitle: "",
                category: "Management & Strategy",
                type: "Training",
                description: "",
                learningObjectives: ["", "", ""],
                highlights: ["", "", ""],
                targetAudience: [""],
                prerequisites: [""],
                certificationDetails: "Certificate of Completion",
                status: "PUBLISHED",
                landingPageEnabled: true,
                trainerName: "Lead Instructor",
                trainerDesignation: "Senior Consultant",
                trainerBio: "",
                trainerCompany: "Training Institute",
                trainerEmail: "",
                trainerPhone: "",
                startDate: "2026-10-13",
                endDate: "2026-10-14",
                startTime: "09:00 AM",
                endTime: "04:00 PM",
                numDays: 2,
                duration: "2 Days",
                timezone: "Asia/Muscat (GST, UTC+4)",
                mode: "In-person",
                venueName: "Muscat Training Center",
                address: "Ruwi, Muscat",
                city: "Muscat",
                country: "Oman",
                maxSeats: 30,
                availableSeats: 30,
                standardPrice: 500,
                currency: "OMR",
                taxPercent: 0,
                vatPercent: 5,
                paymentTerms: "100% upon confirmation",
                offerType: "BOGO",
                offerTitle: "Pay for 1 seat, get 1 seat FREE",
                offerDescription: "Register 1 paid seat and bring 1 guest free of charge.",
                whatsappNumber: "+96892009161",
                keyword: "COURSE",
                reminderSettings: { days7: true, day1: true, hours2: true },
                autoConfirmation: true,
                autoCertificate: true,
                customFields: [],
                faqs: [],
              })
              setEditorSubTab("basic")
              setIsCourseModalOpen(true)
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 shadow"
          >
            <Plus className="h-4 w-4" />
            <span>New Course</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="text-stone-600 text-xs gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* TOP STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span>Total Programs</span>
            <GraduationCap className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-stone-900">{stats?.totalCourses ?? courses.length}</div>
          <div className="text-[10px] text-emerald-600 font-semibold">
            {stats?.activeCourses ?? courses.filter(c => c.status === "PUBLISHED").length} Active Cohorts
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span>Registrations</span>
            <Ticket className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-stone-900">{stats?.totalRegistrations ?? registrations.length}</div>
          <div className="text-[10px] text-stone-500">
            {stats?.confirmedRegistrations ?? 0} Confirmed
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span>Delegates Roster</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-stone-900">{stats?.totalAttendees ?? allAttendees.length}</div>
          <div className="text-[10px] text-stone-500">Including BOGO free seats</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span>Total Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-stone-900">
            {stats?.currency || "OMR"} {(stats?.totalRevenue ?? 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">
            {(stats?.paidRevenue ?? 0).toLocaleString()} Collected
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span>Check-in Rate</span>
            <QrCode className="h-4 w-4 text-teal-600" />
          </div>
          <div className="text-xl font-black text-stone-900">{stats?.attendanceRate ?? 0}%</div>
          <div className="text-[10px] text-stone-500">
            {stats?.checkedInAttendees ?? 0} Verified Check-ins
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span>Course Rating</span>
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-xl font-black text-stone-900">{stats?.avgRating ?? 5.0} / 5.0</div>
          <div className="text-[10px] text-stone-500">{feedback.length} Attendee Reviews</div>
        </div>
      </div>

      {/* NAVIGATION SUB-TABS */}
      <div className="flex items-center gap-1 border-b border-stone-200 overflow-x-auto text-xs font-semibold">
        {[
          { key: "overview", label: "Overview & Dashboard" },
          { key: "courses", label: `Courses (${courses.length})` },
          { key: "registrations", label: `Registrations (${registrations.length})` },
          { key: "attendees", label: `Delegates Roster (${allAttendees.length})` },
          { key: "certificates", label: `Certificates (${certificates.length})` },
          { key: "feedback", label: `Feedback (${feedback.length})` },
          { key: "reports", label: "Financial & Export" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "border-amber-600 text-amber-700 bg-amber-50/50"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Active Featured Course Card */}
          {courses.length > 0 && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-850 to-stone-800 text-white shadow-lg space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Featured Executive Masterclass
                    </span>
                    <span className="text-xs text-stone-400">&bull; {courses[0].category}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold">{courses[0].name}</h2>
                  <p className="text-xs text-stone-300 line-clamp-2">{courses[0].description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/training/${courses[0].slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow transition-colors"
                  >
                    <span>View Public Landing Page</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-800 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px]">Dates:</span>
                  <span className="font-semibold text-stone-200">
                    {courses[0].startDate} to {courses[0].endDate}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Trainer:</span>
                  <span className="font-semibold text-stone-200">{courses[0].trainerName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Venue:</span>
                  <span className="font-semibold text-stone-200 truncate block">
                    {courses[0].venueName}, {courses[0].city}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Seats Availability:</span>
                  <span className="font-semibold text-emerald-400">
                    {courses[0].availableSeats} / {courses[0].maxSeats} remaining
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Registrations Table */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Recent Program Registrations</h3>
                <p className="text-xs text-stone-500">Live feed of student and corporate registrations</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("registrations")}
                className="text-xs gap-1"
              >
                <span>View All ({registrations.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {registrations.length === 0 ? (
              <div className="p-12 text-center text-stone-400 text-xs">
                No course registrations recorded yet. Register candidates via the landing page or "+ New Course".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="p-3 pl-4">Reg #</th>
                      <th className="p-3">Customer / Buyer</th>
                      <th className="p-3">Course</th>
                      <th className="p-3">Seats</th>
                      <th className="p-3">Total Amount</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Stage</th>
                      <th className="p-3 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {registrations.slice(0, 5).map(reg => (
                      <tr key={reg.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="p-3 pl-4 font-mono font-bold text-stone-800">
                          {reg.registrationNumber}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-stone-900">{reg.customerName}</div>
                          <div className="text-[11px] text-stone-500">
                            {reg.companyName ? `${reg.companyName} &bull; ` : ""}
                            {reg.customerPhone}
                          </div>
                        </td>
                        <td className="p-3 font-medium text-stone-800 truncate max-w-[180px]">
                          {reg.courseName}
                        </td>
                        <td className="p-3">
                          <span className="font-bold">{reg.numberOfSeats}</span>{" "}
                          <span className="text-[10px] text-stone-400">
                            ({reg.paidSeats} Paid + {reg.freeSeats} Free)
                          </span>
                        </td>
                        <td className="p-3 font-bold text-stone-900">
                          {reg.currency} {reg.totalAmount.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              reg.paymentStatus === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : "bg-amber-50 text-amber-700 border-amber-300"
                            }`}
                          >
                            {reg.paymentStatus}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] bg-stone-50">
                            {reg.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right pr-4">
                          <button
                            onClick={() => setActiveRegistration(reg)}
                            className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COURSES LIST & CATALOG */}
      {activeTab === "courses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">All Training Cohorts & Programs</h3>
            <div className="text-xs text-stone-500">{courses.length} Courses Published</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(c => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {c.bannerUrl && (
                    <div className="h-36 w-full overflow-hidden relative">
                      <img src={c.bannerUrl} alt={c.name} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/95 text-stone-900 shadow">
                          {c.type}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-stone-950 shadow">
                          {c.status}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                        {c.category}
                      </div>
                      <h4 className="text-sm font-bold text-stone-900 mt-0.5 line-clamp-2">{c.name}</h4>
                    </div>

                    <div className="space-y-1.5 text-xs text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                        <span>
                          {c.startDate} to {c.endDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">
                          {c.venueName}, {c.city}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                        <span>
                          <strong>{c.availableSeats}</strong> of {c.maxSeats} seats available
                        </span>
                      </div>
                    </div>

                    {c.offerTitle && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-semibold flex items-center gap-1.5">
                        <Ticket className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                        <span className="truncate">{c.offerTitle}</span>
                      </div>
                    )}

                    {c.botFlowId && (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 font-medium flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <Bot className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                          <span className="truncate">WhatsApp Flow: <strong>{c.keyword || "BSC"}</strong></span>
                        </div>
                        <a
                          href={`https://wa.me/${(c.whatsappNumber || "+96899355438").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(c.keyword || "BSC")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-700 hover:underline shrink-0 font-bold ml-1"
                        >
                          Test &rarr;
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs">
                  <div className="font-black text-stone-900">
                    {c.currency} {c.standardPrice}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`/training/${c.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-stone-200 text-stone-600"
                      title="View Landing Page"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>

                    <button
                      onClick={() => handleDuplicateCourse(c.id)}
                      className="p-1.5 rounded hover:bg-stone-200 text-stone-600"
                      title="Duplicate Course"
                    >
                      <Copy className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => {
                        setEditingCourse(c)
                        setEditorSubTab("basic")
                        setIsCourseModalOpen(true)
                      }}
                      className="p-1.5 rounded hover:bg-stone-200 text-stone-600"
                      title="Edit Course"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteCourse(c.id)}
                      className="p-1.5 rounded hover:bg-red-100 text-red-600"
                      title="Delete Course"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REGISTRATIONS TABLE & KANBAN */}
      {activeTab === "registrations" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-3 rounded-xl bg-white border border-stone-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="h-4 w-4 text-stone-400" />
              <Input
                placeholder="Search by customer name, phone, reg number, or company..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 text-xs border-stone-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCourseFilter}
                onChange={e => setSelectedCourseFilter(e.target.value)}
                className="h-8 px-2 rounded-lg border border-stone-300 text-xs bg-white text-stone-700"
              >
                <option value="ALL">All Courses</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.shortTitle || c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStageFilter}
                onChange={e => setSelectedStageFilter(e.target.value)}
                className="h-8 px-2 rounded-lg border border-stone-300 text-xs bg-white text-stone-700"
              >
                <option value="ALL">All Pipeline Stages</option>
                {PIPELINE_STAGES.map(s => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center rounded-lg border border-stone-300 p-0.5 bg-stone-100">
                <button
                  onClick={() => setRegViewMode("table")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    regViewMode === "table" ? "bg-white shadow-sm text-stone-900" : "text-stone-500"
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setRegViewMode("kanban")}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    regViewMode === "kanban" ? "bg-white shadow-sm text-stone-900" : "text-stone-500"
                  }`}
                >
                  Kanban
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 text-xs gap-1 border-stone-300 text-stone-700"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          {/* VIEW: TABLE */}
          {regViewMode === "table" ? (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="p-3 pl-4">Reg #</th>
                      <th className="p-3">Customer / Buyer</th>
                      <th className="p-3">Course</th>
                      <th className="p-3">Seats</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Stage</th>
                      <th className="p-3">Source</th>
                      <th className="p-3 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-stone-400">
                          No matching registrations found.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map(reg => (
                        <tr key={reg.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="p-3 pl-4 font-mono font-bold text-stone-800">
                            {reg.registrationNumber}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-stone-900">{reg.customerName}</div>
                            <div className="text-[11px] text-stone-500">
                              {reg.companyName ? `${reg.companyName} &bull; ` : ""}
                              {reg.customerPhone}
                            </div>
                          </td>
                          <td className="p-3 font-medium text-stone-800 truncate max-w-[160px]">
                            {reg.courseName}
                          </td>
                          <td className="p-3">
                            <span className="font-bold">{reg.numberOfSeats}</span>{" "}
                            <span className="text-[10px] text-stone-400">
                              ({reg.paidSeats}P / {reg.freeSeats}F)
                            </span>
                          </td>
                          <td className="p-3 font-bold text-stone-900">
                            {reg.currency} {reg.totalAmount.toFixed(2)}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  reg.paymentStatus === "PAID"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {reg.paymentStatus}
                              </span>
                              {Boolean(reg.notes && reg.notes.includes("Payment receipt proof uploaded")) && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  📸 Receipt Uploaded
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700">
                              {reg.status}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-stone-500">{reg.source}</td>
                          <td className="p-3 text-right pr-4">
                            <button
                              onClick={() => setActiveRegistration(reg)}
                              className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold shadow-sm"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VIEW: KANBAN PIPELINE */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto pb-4">
              {PIPELINE_STAGES.slice(0, 6).map(stage => {
                const stageRegs = filteredRegistrations.filter(r => r.status === stage.key)
                return (
                  <div
                    key={stage.key}
                    className="p-3 rounded-2xl bg-stone-100/70 border border-stone-200/80 space-y-2 min-w-[220px]"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-stone-800 pb-1 border-b border-stone-200">
                      <span>{stage.label}</span>
                      <span className="h-5 px-1.5 rounded-full bg-white text-stone-600 text-[10px] flex items-center justify-center border shadow-xs">
                        {stageRegs.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {stageRegs.map(r => (
                        <div
                          key={r.id}
                          onClick={() => setActiveRegistration(r)}
                          className="p-3 rounded-xl bg-white border border-stone-200 shadow-sm hover:border-amber-400 cursor-pointer space-y-2 transition-all"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                            <span>{r.registrationNumber}</span>
                            <span className="font-bold text-stone-900">
                              {r.currency} {r.totalAmount}
                            </span>
                          </div>

                          <div>
                            <div className="text-xs font-bold text-stone-900 truncate">
                              {r.customerName}
                            </div>
                            <div className="text-[10px] text-stone-500 truncate">
                              {r.companyName || r.customerPhone}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-stone-100">
                            <span className="text-stone-500">{r.numberOfSeats} Participants</span>
                            <span
                              className={`font-semibold ${
                                r.paymentStatus === "PAID" ? "text-emerald-600" : "text-amber-600"
                              }`}
                            >
                              {r.paymentStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DELEGATES ROSTER */}
      {activeTab === "attendees" && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm space-y-4">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">All Registered Course Attendees</h3>
              <p className="text-xs text-stone-500">
                Individual delegate directory, QR check-in status, and certificate issuance
              </p>
            </div>
            <div className="text-xs font-semibold text-stone-600">
              {allAttendees.length} Total Attendees
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                <tr>
                  <th className="p-3 pl-4">Attendee Name</th>
                  <th className="p-3">Designation / Company</th>
                  <th className="p-3">Course</th>
                  <th className="p-3">Seat Type</th>
                  <th className="p-3">Check-in Status</th>
                  <th className="p-3">QR Token</th>
                  <th className="p-3 text-right pr-4">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {allAttendees.map(({ attendee, registration, course }, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/70">
                    <td className="p-3 pl-4">
                      <div className="font-bold text-stone-900">{attendee.name}</div>
                      <div className="text-[11px] text-stone-500">{attendee.email || attendee.phone}</div>
                    </td>
                    <td className="p-3">
                      <div>{attendee.designation || "Delegate"}</div>
                      <div className="text-[10px] text-stone-400">
                        {attendee.company || registration.companyName || "N/A"}
                      </div>
                    </td>
                    <td className="p-3 font-medium text-stone-800 truncate max-w-[180px]">
                      {registration.courseName}
                    </td>
                    <td className="p-3">
                      {attendee.isFreeSeat ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          BOGO Free
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Paid Seat
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {attendee.checkInStatus === "CHECKED_IN" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-max">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Checked In</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-stone-400 truncate max-w-[120px]">
                      {attendee.qrToken}
                    </td>
                    <td className="p-3 text-right pr-4">
                      {attendee.certificateId ? (
                        <a
                          href={attendee.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 inline-flex items-center gap-1"
                        >
                          <Award className="h-3 w-3" />
                          <span>View {attendee.certificateId}</span>
                        </a>
                      ) : (
                        <button
                          onClick={() =>
                            handleIssueCertificate(
                              registration.id,
                              attendee.id,
                              attendee.phone || registration.customerPhone,
                            )
                          }
                          className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white font-semibold text-[10px]"
                        >
                          Issue Certificate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CERTIFICATES REPOSITORY */}
      {activeTab === "certificates" && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm space-y-4">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Issued Course Certificates</h3>
              <p className="text-xs text-stone-500">
                Online verifiable cryptographic credentials issued to delegates
              </p>
            </div>
            <div className="text-xs font-semibold text-stone-600">
              {certificates.length} Issued Credentials
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                <tr>
                  <th className="p-3 pl-4">Credential ID</th>
                  <th className="p-3">Recipient Name</th>
                  <th className="p-3">Course Program</th>
                  <th className="p-3">Issue Date</th>
                  <th className="p-3">Verification Hash</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {certificates.map(cert => (
                  <tr key={cert.id} className="hover:bg-stone-50/70">
                    <td className="p-3 pl-4 font-mono font-bold text-amber-700">{cert.id}</td>
                    <td className="p-3 font-bold text-stone-900">{cert.recipientName}</td>
                    <td className="p-3 font-medium text-stone-800">{cert.courseName}</td>
                    <td className="p-3 text-stone-500">{cert.issueDate}</td>
                    <td className="p-3 font-mono text-[10px] text-stone-400">
                      {cert.verificationHash}
                    </td>
                    <td className="p-3 text-right pr-4">
                      <a
                        href={`/training/verify-certificate/${cert.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-[10px] inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Public Credential</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: FEEDBACK & RATINGS */}
      {activeTab === "feedback" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white border border-stone-200 text-center space-y-1">
              <div className="text-xs text-stone-500 font-medium">Overall Experience</div>
              <div className="text-2xl font-black text-amber-600 flex items-center justify-center gap-1">
                <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                <span>4.9 / 5.0</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-stone-200 text-center space-y-1">
              <div className="text-xs text-stone-500 font-medium">Trainer Expertise</div>
              <div className="text-2xl font-black text-stone-900">5.0 / 5.0</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-stone-200 text-center space-y-1">
              <div className="text-xs text-stone-500 font-medium">Course Curriculum</div>
              <div className="text-2xl font-black text-stone-900">4.8 / 5.0</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-stone-200 text-center space-y-1">
              <div className="text-xs text-stone-500 font-medium">Venue & Hospitality</div>
              <div className="text-2xl font-black text-stone-900">4.9 / 5.0</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-stone-900">Delegate Reviews & Testimonials</h3>
            <div className="space-y-3">
              {feedback.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  Automated feedback surveys will appear here once attendees complete their training cohorts.
                </div>
              ) : (
                feedback.map(f => (
                  <div key={f.id} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-stone-900">{f.attendeeName}</div>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: f.overallRating }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-stone-600 italic">"{f.comments}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: REPORTS & EXPORT */}
      {activeTab === "reports" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">Training Reports & Exports</h3>
              <p className="text-xs text-stone-500">
                Generate financial summaries, attendance registers, and export data
              </p>
            </div>
            <Button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2">
              <Download className="h-4 w-4" />
              <span>Download Registration Register (CSV)</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="text-xs font-bold text-stone-800">Total Billed Revenue</div>
              <div className="text-xl font-black text-stone-900">
                OMR {(stats?.totalRevenue ?? 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-stone-500">
                Reflects standard rates, applied BOGO seat deductions, and 5% VAT.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="text-xs font-bold text-stone-800">Paid Collections</div>
              <div className="text-xl font-black text-emerald-700">
                OMR {(stats?.paidRevenue ?? 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-stone-500">
                Funds collected via AmwalPay, Online Cards, and verified bank wires.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="text-xs font-bold text-stone-800">Unpaid Balances</div>
              <div className="text-xl font-black text-amber-700">
                OMR {Math.max(0, (stats?.totalRevenue ?? 0) - (stats?.paidRevenue ?? 0)).toLocaleString()}
              </div>
              <p className="text-[11px] text-stone-500">
                Outstanding corporate purchase orders and payment pending registrations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* REGISTRATION DETAIL DRAWER / DIALOG */}
      {/* ==================================================================== */}
      {activeRegistration && (
        <Dialog open={!!activeRegistration} onOpenChange={open => !open && setActiveRegistration(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold">
                    Registration: {activeRegistration.registrationNumber}
                  </DialogTitle>
                  <p className="text-xs text-stone-500 mt-0.5">{activeRegistration.courseName}</p>
                </div>
                <Badge variant="outline" className="text-xs font-bold">
                  {activeRegistration.status}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-5 text-xs">
              {/* Buyer info */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-stone-400 block text-[10px]">Buyer Name:</span>
                  <span className="font-bold text-stone-800">{activeRegistration.customerName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Mobile / WhatsApp:</span>
                  <span className="font-semibold text-stone-800">{activeRegistration.customerPhone}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Email:</span>
                  <span className="font-semibold text-stone-800">{activeRegistration.customerEmail}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Company / Organization:</span>
                  <span className="font-semibold text-stone-800">
                    {activeRegistration.companyName || "N/A"} ({activeRegistration.jobTitle || "Delegate"})
                  </span>
                </div>
              </div>

              {/* Financial & Offer summary */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-950">
                    {activeRegistration.numberOfSeats} Participants ({activeRegistration.paidSeats} Paid + {activeRegistration.freeSeats} FREE)
                  </div>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    Offer Applied: {activeRegistration.offerApplied || "Standard"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-stone-900">
                    {activeRegistration.currency} {activeRegistration.totalAmount.toFixed(2)}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      activeRegistration.paymentStatus === "PAID"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }
                  >
                    {activeRegistration.paymentStatus}
                  </Badge>
                </div>
              </div>

              {/* Submitted Payment Receipt / Screenshot */}
              {(() => {
                const n = activeRegistration.notes || ""
                const m = n.match(/https?:\/\/[^\s"'<>]+|\/api\/media\/[^\s"'<>]+|whatsapp_media:\/\/[^\s"'<>]+/)
                const receiptProofUrl = m ? m[0] : (activeRegistration as any).paymentProofUrl || null

                if (!receiptProofUrl) {
                  return (
                    <div className="p-3 rounded-xl border border-dashed border-stone-200 text-stone-500 text-xs flex items-center justify-between bg-stone-50/50">
                      <div className="flex items-center gap-2">
                        <FileImage className="h-4 w-4 text-stone-400" />
                        <span>No payment receipt screenshot uploaded yet.</span>
                      </div>
                      <span className="text-[10px] text-stone-400">Waiting for transfer</span>
                    </div>
                  )
                }

                return (
                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                          <FileImage className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-blue-950 text-xs">Submitted Payment Proof (Bank Transfer Receipt)</div>
                          <div className="text-[10px] text-blue-700">Uploaded via WhatsApp by buyer</div>
                        </div>
                      </div>
                      {!receiptProofUrl.startsWith("whatsapp_media://") && (
                        <a
                          href={receiptProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" /> Open Full Image
                        </a>
                      )}
                    </div>

                    <div className="rounded-lg overflow-hidden border border-blue-200 bg-white p-2 flex items-center justify-center">
                      {receiptProofUrl.startsWith("whatsapp_media://") ? (
                        <div className="text-center py-6 text-stone-500 text-xs">
                          <p className="font-medium">WhatsApp media attachment</p>
                          <p className="text-[10px] text-stone-400 mt-1">Stored securely in WhatsApp conversation thread</p>
                        </div>
                      ) : (
                        <a href={receiptProofUrl} target="_blank" rel="noopener noreferrer" className="block max-h-72 w-full text-center">
                          <img
                            src={receiptProofUrl}
                            alt="Payment Transfer Proof"
                            className="max-h-72 max-w-full mx-auto object-contain rounded hover:opacity-95 transition-opacity"
                          />
                        </a>
                      )}
                    </div>

                    {activeRegistration.paymentStatus !== "PAID" && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-blue-900 font-medium">Verify receipt and confirm seat allocation:</span>
                        <button
                          onClick={() => handleUpdateRegStatus(activeRegistration.id, { paymentStatus: "PAID", status: "CONFIRMED" }, true)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve Payment & Confirm Seat
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Attendees list */}
              <div className="space-y-2">
                <div className="font-bold text-stone-800 text-xs">Attendee Details & Check-in QR:</div>
                <div className="space-y-2">
                  {activeRegistration.attendees.map((att, idx) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-lg border border-stone-200 flex items-center justify-between bg-white"
                    >
                      <div>
                        <div className="font-bold text-stone-900">
                          {idx + 1}. {att.name}{" "}
                          {att.isFreeSeat && (
                            <span className="text-[10px] text-emerald-700 font-bold ml-1">
                              (FREE SEAT)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {att.designation ? `${att.designation} &bull; ` : ""}
                          {att.email}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {att.checkInStatus === "CHECKED_IN" ? (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Checked In
                          </span>
                        ) : (
                          <button
                            onClick={async () => {
                              await fetch("/api/training/attendance/checkin", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ qrToken: att.qrToken }),
                              })
                              toast.success(`${att.name} checked in!`)
                              fetchData()
                            }}
                            className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-semibold"
                          >
                            Mark Attended
                          </button>
                        )}

                        {att.certificateId ? (
                          <a
                            href={att.certificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200"
                          >
                            Certificate
                          </a>
                        ) : (
                          <button
                            onClick={() =>
                              handleIssueCertificate(
                                activeRegistration.id,
                                att.id,
                                att.phone || activeRegistration.customerPhone,
                              )
                            }
                            className="px-2 py-1 rounded bg-stone-900 text-white text-[10px] font-bold"
                          >
                            Issue Cert
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Update Actions */}
              <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-stone-500 font-medium">Update Stage:</span>
                  <select
                    value={activeRegistration.status}
                    onChange={e =>
                      handleUpdateRegStatus(activeRegistration.id, {
                        status: e.target.value as any,
                      })
                    }
                    className="h-8 px-2 rounded border border-stone-300 text-xs bg-white"
                  >
                    {PIPELINE_STAGES.map(s => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {activeRegistration.paymentStatus !== "PAID" && (
                    <button
                      onClick={() =>
                        handleUpdateRegStatus(
                          activeRegistration.id,
                          { paymentStatus: "PAID", status: "CONFIRMED" },
                          true,
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      Mark as Paid & Confirm Seats
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setTargetPhone(activeRegistration.customerPhone)
                      setWhatsAppModalOpen(true)
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1"
                  >
                    <WhatsAppIcon className="h-3.5 w-3.5 fill-emerald-600" />
                    <span>Send WhatsApp Alert</span>
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ==================================================================== */}
      {/* WHATSAPP NOTIFICATION TRIGGER MODAL */}
      {/* ==================================================================== */}
      {whatsAppModalOpen && (
        <Dialog open={whatsAppModalOpen} onOpenChange={setWhatsAppModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <WhatsAppIcon className="h-4 w-4 fill-emerald-600" />
                <span>Send WhatsApp Training Notification</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Recipient WhatsApp Number
                </label>
                <Input
                  value={targetPhone}
                  onChange={e => setTargetPhone(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Notification Template Type
                </label>
                <select
                  value={selectedMsgType}
                  onChange={e => setSelectedMsgType(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-stone-300 text-xs bg-white"
                >
                  <option value="CONFIRMATION">Booking Confirmation (Seats, Dates, Venue, Maps)</option>
                  <option value="REMINDER_7D">7 Days Reminder</option>
                  <option value="REMINDER_1D">1 Day Reminder (Training Tomorrow)</option>
                  <option value="REMINDER_2H">2 Hours Reminder (Session Starting)</option>
                  <option value="CERTIFICATE">Certificate Credential Delivery</option>
                  <option value="FEEDBACK">Feedback Survey Request</option>
                  <option value="CUSTOM">Custom Message</option>
                </select>
              </div>

              {selectedMsgType === "CUSTOM" && (
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Custom Message (Supports {"{{customer_name}}"}, {"{{course_name}}"}, etc.)
                  </label>
                  <Textarea
                    rows={4}
                    value={customMsgBody}
                    onChange={e => setCustomMsgBody(e.target.value)}
                    placeholder="Hello {{customer_name}}, please note that..."
                    className="text-xs"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setWhatsAppModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendWhatsAppNotification}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Send Message Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ==================================================================== */}
      {/* COURSE CREATION / EDITING MULTI-TAB DIALOG */}
      {/* ==================================================================== */}
      {isCourseModalOpen && editingCourse && (
        <Dialog open={isCourseModalOpen} onOpenChange={setIsCourseModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full sm:rounded-2xl p-6">
            <DialogHeader className="pb-2 border-b border-stone-200">
              <DialogTitle className="text-base font-bold flex items-center justify-between">
                <span>{editingCourse.id ? `Edit Course: ${editingCourse.name}` : "Create Training Course Program"}</span>
                {editingCourse.courseId && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">
                    {editingCourse.courseId}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Sub-tabs: Pill Navigation with icons and no truncation */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl overflow-x-auto text-xs font-semibold scrollbar-none my-2">
              {[
                { key: "basic", label: "Basic Info", icon: BookOpen },
                { key: "trainer", label: "Trainer", icon: User },
                { key: "schedule", label: "Schedule & Venue", icon: Calendar },
                { key: "pricing", label: "Pricing & Capacity", icon: DollarSign },
                { key: "offers", label: "Offers & BOGO", icon: Sparkles },
                { key: "whatsapp", label: "WhatsApp & Bot Flow", icon: Bot },
              ].map(st => {
                const Icon = st.icon
                const isActive = editorSubTab === st.key
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setEditorSubTab(st.key as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap text-xs font-medium ${
                      isActive
                        ? "bg-white text-stone-900 shadow-xs font-bold"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? "text-amber-600" : "text-stone-400"}`} />
                    <span>{st.label}</span>
                  </button>
                )
              })}
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4 pt-2 text-xs">
              {/* SUBTAB: BASIC */}
              {editorSubTab === "basic" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Course Name *
                    </label>
                    <Input
                      required
                      value={editingCourse.name || ""}
                      onChange={e => setEditingCourse({ ...editingCourse, name: e.target.value })}
                      placeholder="e.g. AI-Powered Certified Balanced Scorecard Professional"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Short Title
                      </label>
                      <Input
                        value={editingCourse.shortTitle || ""}
                        onChange={e => setEditingCourse({ ...editingCourse, shortTitle: e.target.value })}
                        placeholder="Certified BSC Professional"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Category
                      </label>
                      <Input
                        value={editingCourse.category || ""}
                        onChange={e => setEditingCourse({ ...editingCourse, category: e.target.value })}
                        placeholder="Strategy & Management"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Type
                      </label>
                      <select
                        value={editingCourse.type || "Certification"}
                        onChange={e => setEditingCourse({ ...editingCourse, type: e.target.value as any })}
                        className="w-full h-8 px-2 rounded border border-stone-300 text-xs bg-white"
                      >
                        <option value="Certification">Certification</option>
                        <option value="Training">Training</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Seminar">Seminar</option>
                        <option value="Webinar">Webinar</option>
                        <option value="Corporate Training">Corporate Training</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Course Description
                    </label>
                    <Textarea
                      rows={3}
                      value={editingCourse.description || ""}
                      onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Banner Image URL
                      </label>
                      <Input
                        value={editingCourse.bannerUrl || ""}
                        onChange={e => setEditingCourse({ ...editingCourse, bannerUrl: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Course Status
                      </label>
                      <select
                        value={editingCourse.status || "PUBLISHED"}
                        onChange={e => setEditingCourse({ ...editingCourse, status: e.target.value as any })}
                        className="w-full h-8 px-2 rounded border border-stone-300 text-xs bg-white"
                      >
                        <option value="PUBLISHED">PUBLISHED</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="REGISTRATION_CLOSED">REGISTRATION_CLOSED</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB: TRAINER */}
              {editorSubTab === "trainer" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Trainer Name
                      </label>
                      <Input
                        value={editingCourse.trainerName || ""}
                        onChange={e => setEditingCourse({ ...editingCourse, trainerName: e.target.value })}
                        placeholder="Said Al Harthi"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Trainer Designation
                      </label>
                      <Input
                        value={editingCourse.trainerDesignation || ""}
                        onChange={e => setEditingCourse({ ...editingCourse, trainerDesignation: e.target.value })}
                        placeholder="Managing Consultant"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Trainer Company
                      </label>
                      <Input
                        value={editingCourse.trainerCompany || ""}
                        onChange={e => setEditingCourse({ ...editingCourse, trainerCompany: e.target.value })}
                        placeholder="Tanfidh Management Consultants"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Trainer Image URL
                      </label>
                      <Input
                        value={editingCourse.trainerImage || ""}
                        onChange={e => setEditingCourse({ ...editingCourse, trainerImage: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Trainer Biography
                    </label>
                    <Textarea
                      rows={3}
                      value={editingCourse.trainerBio || ""}
                      onChange={e => setEditingCourse({ ...editingCourse, trainerBio: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {/* SUBTAB: SCHEDULE & VENUE */}
              {editorSubTab === "schedule" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Start Date
                      </label>
                      <Input
                        type="date"
                        value={editingCourse.startDate || ""}
                        onChange={e => setEditingCourse({ ...editingCourse, startDate: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        End Date
                      </label>
                      <Input
                        type="date"
                        value={editingCourse.endDate || ""}
                        onChange={e => setEditingCourse({ ...editingCourse, endDate: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Start Time
                      </label>
                      <Input
                        value={editingCourse.startTime || "09:00 AM"}
                        onChange={e => setEditingCourse({ ...editingCourse, startTime: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        End Time
                      </label>
                      <Input
                        value={editingCourse.endTime || "04:00 PM"}
                        onChange={e => setEditingCourse({ ...editingCourse, endTime: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Mode
                      </label>
                      <select
                        value={editingCourse.mode || "In-person"}
                        onChange={e => setEditingCourse({ ...editingCourse, mode: e.target.value as any })}
                        className="w-full h-8 px-2 rounded border border-stone-300 text-xs bg-white"
                      >
                        <option value="In-person">In-person</option>
                        <option value="Online">Online</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Venue Name
                      </label>
                      <Input
                        value={editingCourse.venueName || ""}
                        onChange={e => setEditingCourse({ ...editingCourse, venueName: e.target.value })}
                        placeholder="Sheraton Oman Hotel"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        City & Country
                      </label>
                      <Input
                        value={editingCourse.city || "Muscat"}
                        onChange={e => setEditingCourse({ ...editingCourse, city: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Google Maps URL
                    </label>
                    <Input
                      value={editingCourse.mapUrl || ""}
                      onChange={e => setEditingCourse({ ...editingCourse, mapUrl: e.target.value })}
                      placeholder="https://maps.google.com/..."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* SUBTAB: PRICING & CAPACITY */}
              {editorSubTab === "pricing" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Standard Fee (OMR)
                      </label>
                      <Input
                        type="number"
                        value={editingCourse.standardPrice ?? 500}
                        onChange={e =>
                          setEditingCourse({ ...editingCourse, standardPrice: Number(e.target.value) })
                        }
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Maximum Seats
                      </label>
                      <Input
                        type="number"
                        value={editingCourse.maxSeats ?? 30}
                        onChange={e =>
                          setEditingCourse({
                            ...editingCourse,
                            maxSeats: Number(e.target.value),
                            availableSeats: Number(e.target.value),
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Currency
                      </label>
                      <Input
                        value={editingCourse.currency || "OMR"}
                        onChange={e => setEditingCourse({ ...editingCourse, currency: e.target.value })}
                        className="h-8 text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Payment Terms
                    </label>
                    <Input
                      value={editingCourse.paymentTerms || "Full payment upon registration."}
                      onChange={e => setEditingCourse({ ...editingCourse, paymentTerms: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* SUBTAB: DYNAMIC OFFERS */}
              {editorSubTab === "offers" && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-amber-950 block mb-1">
                      Offer Strategy / Type
                    </label>
                    <select
                      value={editingCourse.offerType || "BOGO"}
                      onChange={e => setEditingCourse({ ...editingCourse, offerType: e.target.value as any })}
                      className="w-full h-8 px-2 rounded border border-amber-300 text-xs bg-white font-medium"
                    >
                      <option value="BOGO">Pay for 1 seat, get 1 seat FREE (Buy 1 Get 1 Free)</option>
                      <option value="B2G1">Buy 2 seats, get 1 seat FREE (3 Attendees)</option>
                      <option value="PERCENT">Percentage Discount (e.g. 20% off)</option>
                      <option value="FIXED">Fixed Amount Discount</option>
                      <option value="CORPORATE">Corporate Volume Package</option>
                      <option value="EARLY_BIRD">Early Bird Discount</option>
                      <option value="NONE">No Special Offer (Standard Price)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-950 block mb-1">
                      Offer Display Title
                    </label>
                    <Input
                      value={editingCourse.offerTitle || ""}
                      onChange={e => setEditingCourse({ ...editingCourse, offerTitle: e.target.value })}
                      placeholder="e.g. Pay for 1 seat, get 1 seat FREE"
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-950 block mb-1">
                      Offer Description (Appears on Landing Page & Invoices)
                    </label>
                    <Textarea
                      rows={2}
                      value={editingCourse.offerDescription || ""}
                      onChange={e =>
                        setEditingCourse({ ...editingCourse, offerDescription: e.target.value })
                      }
                      placeholder="Register 1 paid delegate and bring a colleague at zero extra cost."
                      className="text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              {/* SUBTAB: WHATSAPP AUTOMATION */}
              {editorSubTab === "whatsapp" && (
                <div className="space-y-4">
                  {/* Interactive Bot Flow Link */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-emerald-700" />
                        <span className="text-xs font-bold text-emerald-950">Connected WhatsApp Booking Flow</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-white text-emerald-800 border-emerald-300">
                        Visual Bot Engine
                      </Badge>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Connect an interactive visual Flow to guide prospective delegates through seat selection, attendee details collection, BOGO offer application, and direct Bank Transfer instructions.
                    </p>
                    <div>
                      <label className="text-[11px] font-semibold text-emerald-950 block mb-1">
                        Select Connected Bot Flow
                      </label>
                      <select
                        value={editingCourse.botFlowId || ""}
                        onChange={e => setEditingCourse({ ...editingCourse, botFlowId: e.target.value || undefined })}
                        className="w-full h-8 px-2.5 rounded border border-emerald-300 text-xs bg-white font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">-- No Flow Attached (AI Assistant handles inquiries) --</option>
                        {availableFlows.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.name} {f.isActive ? "(Active)" : "(Draft)"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        WhatsApp Business Phone
                      </label>
                      <Input
                        value={editingCourse.whatsappNumber || "+96899355438"}
                        onChange={e =>
                          setEditingCourse({ ...editingCourse, whatsappNumber: e.target.value })
                        }
                        placeholder="+968 99355438"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Trigger Keyword (Auto-launches Flow)
                      </label>
                      <Input
                        value={editingCourse.keyword || "BSC"}
                        onChange={e => setEditingCourse({ ...editingCourse, keyword: e.target.value })}
                        placeholder="BSC"
                        className="h-8 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  {/* Payment Gateway: Bank Manual Only */}
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <Building className="h-3.5 w-3.5 text-amber-700" />
                      <span>Payment Gateway / Method: Bank Manual Wire</span>
                    </div>
                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      Payments for training courses are processed via <strong>Direct Bank Transfer / Manual Wire</strong>. Your bank accounts configured in <em>Settings → Bank Accounts</em> will automatically populate on pro-forma invoices, checkout pages, and WhatsApp automated replies.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-stone-200">
                    <div className="text-xs font-bold text-stone-800">Automated WhatsApp Reminders:</div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingCourse.reminderSettings?.days7 !== false}
                        onChange={e =>
                          setEditingCourse({
                            ...editingCourse,
                            reminderSettings: {
                              ...editingCourse.reminderSettings!,
                              days7: e.target.checked,
                            },
                          })
                        }
                      />
                      <span>7 Days Before Course Reminder</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingCourse.reminderSettings?.day1 !== false}
                        onChange={e =>
                          setEditingCourse({
                            ...editingCourse,
                            reminderSettings: {
                              ...editingCourse.reminderSettings!,
                              day1: e.target.checked,
                            },
                          })
                        }
                      />
                      <span>1 Day Before Course Reminder (Starts Tomorrow)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingCourse.reminderSettings?.hours2 !== false}
                        onChange={e =>
                          setEditingCourse({
                            ...editingCourse,
                            reminderSettings: {
                              ...editingCourse.reminderSettings!,
                              hours2: e.target.checked,
                            },
                          })
                        }
                      />
                      <span>2 Hours Before Check-in Reminder</span>
                    </label>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-3 border-t border-stone-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCourseModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  Save Course Program
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
