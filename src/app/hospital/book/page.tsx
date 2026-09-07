"use client"

import { useState, useEffect, useRef } from "react"
import { format, addDays, addMinutes, differenceInSeconds } from "date-fns"

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | "home"
  | "patient-id"
  | "patient-confirm"
  | "new-patient"
  | "choose-flow"
  | "chemo-doctor"
  | "chemo-dates"
  | "chemo-ward"
  | "chemo-beds"
  | "chemo-review"
  | "chemo-confirmed"
  | "apt-dept"
  | "apt-doctor"
  | "apt-dates"
  | "apt-slots"
  | "apt-review"
  | "apt-confirmed"
  | "my-bookings"

interface Patient {
  id: string; mrn: string; fullName: string; mobileMasked: string
}

interface Doctor {
  id: string; name: string; specialization: string; department: { name: string }
}

interface AvailDate {
  date: string; label: string; normal: { total: number; available: number };
  special: { total: number; available: number }; total: number; available: number;
  fullyBooked: boolean; limited: boolean
}

interface Bed {
  id: string; bedNumber: string; status: "AVAILABLE" | "BOOKED" | "HELD" | "BLOCKED" | "OCCUPIED" | "CLEANING"
}

interface Session {
  id: string; name: string; startTime: string; endTime: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BED_COLOR: Record<string, string> = {
  AVAILABLE: "bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100 cursor-pointer",
  BOOKED:    "bg-rose-50 border-rose-300 text-rose-500 cursor-not-allowed opacity-60",
  HELD:      "bg-amber-50 border-amber-300 text-amber-600 cursor-not-allowed opacity-70",
  BLOCKED:   "bg-stone-100 border-stone-300 text-stone-400 cursor-not-allowed opacity-50",
  OCCUPIED:  "bg-blue-50 border-blue-300 text-blue-500 cursor-not-allowed opacity-60",
  CLEANING:  "bg-purple-50 border-purple-300 text-purple-500 cursor-not-allowed opacity-60",
}
const BED_LABEL: Record<string, string> = {
  AVAILABLE: "Available", BOOKED: "Booked", HELD: "Held",
  BLOCKED: "Blocked", OCCUPIED: "Occupied", CLEANING: "Cleaning",
}

function avail_color(n: number) {
  if (n === 0) return "text-rose-500"
  if (n <= 3) return "text-amber-500"
  return "text-emerald-600"
}

function HospHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-4 py-3 flex items-center gap-3">
      {onBack && (
        <button onClick={onBack} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-stone-100">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-stone-600 stroke-2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
      <div className="font-semibold text-stone-900">{title}</div>
    </div>
  )
}

function Btn({ children, onClick, variant = "primary", disabled = false, className = "" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary"|"outline"|"danger"; disabled?: boolean; className?: string
}) {
  const base = "w-full rounded-xl px-4 py-3.5 font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:scale-95",
    outline: "border-2 border-stone-300 text-stone-700 hover:border-blue-400 hover:text-blue-700 bg-white",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HospitalBookingPortal() {
  const [screen, setScreen] = useState<Screen>("home")
  const [patient, setPatient] = useState<Patient | null>(null)
  const [isExisting, setIsExisting] = useState(true)

  // Chemo flow state
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [availDates, setAvailDates] = useState<AvailDate[]>([])
  const [selectedDate, setSelectedDate] = useState<AvailDate | null>(null)
  const [wardType, setWardType] = useState<"NORMAL"|"SPECIAL">("NORMAL")
  const [beds, setBeds] = useState<Bed[]>([])
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [holdId, setHoldId] = useState<string | null>(null)
  const [patientRef, setPatientRef] = useState<string | null>(null)
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null)
  const [clock, setClock] = useState(() => Date.now())
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null)

  // Doctor apt flow
  const [depts, setDepts] = useState<any[]>([])
  const [selectedDept, setSelectedDept] = useState<any>(null)
  const [deptDoctors, setDeptDoctors] = useState<Doctor[]>([])
  const [aptDoctor, setAptDoctor] = useState<Doctor | null>(null)
  const [aptDates, setAptDates] = useState<{ date: string; label: string; slots: string[] }[]>([])
  const [aptDate, setAptDate] = useState<any>(null)
  const [aptSlot, setAptSlot] = useState<string | null>(null)
  const [confirmedApt, setConfirmedApt] = useState<any>(null)
  const [myBookings, setMyBookings] = useState<any[]>([])

  // Misc
  const [mrnInput, setMrnInput] = useState("")
  const [mobileInput, setMobileInput] = useState("")
  const [newPatient, setNewPatient] = useState({ fullName: "", mobile: "", email: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Hold countdown
  useEffect(() => {
    if (!holdExpiry) return
    const t = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(t)
  }, [holdExpiry])
  const holdSecs = holdExpiry ? Math.max(0, differenceInSeconds(holdExpiry, new Date(clock))) : 0

  // ── Patient identification ──────────────────────────────────────────────────
  const identifyPatient = async () => {
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/hospital/patients/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mrn: mrnInput, mobile: mobileInput }),
      })
      const data = await res.json()
      if (data.found) { setPatient(data); setScreen("patient-confirm") }
      else setError("We couldn't find a patient with those details.")
    } catch { setError("Connection error. Please try again.") }
    setLoading(false)
  }

  const createNewPatient = async () => {
    if (!newPatient.fullName || !newPatient.mobile) { setError("Name and mobile are required"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/hospital/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPatient),
      })
      const data = await res.json()
      setPatient({ id: data.id, mrn: data.mrn, fullName: data.fullName, mobileMasked: data.mobile })
      setScreen("choose-flow")
    } catch { setError("Failed to register. Please try again.") }
    setLoading(false)
  }

  // ── Chemo flow ──────────────────────────────────────────────────────────────
  const loadDoctors = async () => {
    const data = await fetch("/api/hospital/doctors").then(r => r.json())
    setDoctors(Array.isArray(data) ? data : [])
  }

  const loadAvailDates = async () => {
    setLoading(true)
    const data = await fetch("/api/hospital/availability?days=14").then(r => r.json())
    setAvailDates(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const loadBeds = async (wType: "NORMAL"|"SPECIAL") => {
    if (!selectedDate) return
    setLoading(true); setWardType(wType)
    const q = new URLSearchParams({ wardType: wType, date: selectedDate.date, ...(selectedSession ? { sessionId: selectedSession.id } : {}) })
    const data = await fetch(`/api/hospital/beds?${q}`).then(r => r.json())
    setBeds(data.beds || [])
    setLoading(false)
    setScreen("chemo-beds")
  }

  const holdBed = async (bed: Bed) => {
    if (!selectedDate || !patient) return
    setLoading(true); setError("")
    try {
      const patientRef = patient.id + "-" + Date.now()
      setPatientRef(patientRef)
      const res = await fetch("/api/hospital/beds/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedId: bed.id,
          bookingDate: selectedDate.date,
          sessionId: selectedSession?.id || null,
          patientRef,
        }),
      })
      if (!res.ok) { const e = await res.json(); setError(e.error || "Bed no longer available"); setLoading(false); return }
      const data = await res.json()
      setSelectedBed(bed)
      setHoldId(data.hold.id)
      setHoldExpiry(new Date(data.expiresAt))
      setScreen("chemo-review")
    } catch { setError("Connection error") }
    setLoading(false)
  }

  const confirmChemoBooking = async () => {
    if (!patient || !selectedDoctor || !selectedDate || !selectedBed) return
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/hospital/chemo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          doctorId: selectedDoctor.id,
          bedId: selectedBed.id,
          bookingDate: selectedDate.date,
          sessionId: selectedSession?.id || null,
          holdId: holdId || undefined,
          patientRef: patientRef || undefined,
          source: "WEB",
        }),
      })
      if (!res.ok) { const e = await res.json(); setError(e.error || "Booking failed"); setLoading(false); return }
      const data = await res.json()
      setConfirmedBooking(data)
      setScreen("chemo-confirmed")
    } catch { setError("Connection error") }
    setLoading(false)
  }

  // ── Doctor apt flow ─────────────────────────────────────────────────────────
  const loadDepts = async () => {
    const data = await fetch("/api/hospital/departments").then(r => r.json())
    setDepts(Array.isArray(data) ? data : [])
  }

  const loadDeptDoctors = async (deptId: string) => {
    const data = await fetch("/api/hospital/doctors").then(r => r.json())
    setDeptDoctors((Array.isArray(data) ? data : []).filter((d: Doctor & { departmentId: string }) => d.departmentId === deptId || (d as any).department?.id === deptId))
  }

  const loadAptDates = async (docId: string) => {
    setLoading(true)
    const results: { date: string; label: string; slots: string[] }[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(new Date(), i)
      const ds = format(d, "yyyy-MM-dd")
      const res = await fetch(`/api/hospital/doctors/${docId}/slots?date=${ds}`).then(r => r.json())
      results.push({
        date: ds,
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE d MMM"),
        slots: res.slots || [],
      })
    }
    setAptDates(results.filter(r => r.slots.length > 0))
    setLoading(false)
  }

  const confirmAptBooking = async () => {
    if (!patient || !aptDoctor || !aptDate || !aptSlot) return
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/hospital/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, doctorId: aptDoctor.id, appointmentDate: aptDate.date, appointmentTime: aptSlot, source: "WEB" }),
      })
      if (!res.ok) { const e = await res.json(); setError(e.error || "Booking failed"); setLoading(false); return }
      const data = await res.json()
      setConfirmedApt(data)
      setScreen("apt-confirmed")
    } catch { setError("Connection error") }
    setLoading(false)
  }

  const loadMyBookings = async () => {
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/hospital/patients/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mrn: mrnInput, mobile: mobileInput }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Could not load bookings"); return }
      if (!data.found) { setError("We couldn't find bookings with those details."); return }
      setMyBookings(data.bookings || [])
    } catch { setError("Connection error. Please try again.") }
    finally { setLoading(false) }
  }

  // ─── Session init ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/hospital/sessions")
      .then(r => r.ok ? r.json() : [])
      .then(data => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
  }, [])

  // ─── Screens ──────────────────────────────────────────────────────────────

  // HOME
  if (screen === "home") return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <div className="text-center pt-12 pb-8 px-6">
        <div className="h-20 w-20 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg">
          <svg viewBox="0 0 24 24" className="h-12 w-12 fill-none stroke-white stroke-2"><path d="M12 2v20M2 12h20" strokeLinecap="round" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-stone-900">Kauvery Hospital</h1>
        <p className="text-stone-500 mt-1 text-sm">Book your appointment or chemotherapy day care</p>
      </div>
      <div className="px-4 space-y-3 max-w-sm mx-auto w-full">
        <button
          onClick={() => { loadDoctors(); setScreen("patient-id"); setIsExisting(true); }}
          className="w-full bg-blue-600 text-white rounded-2xl p-5 text-left shadow-md hover:bg-blue-700 active:scale-95 transition-all"
        >
          <div className="text-lg font-bold">🩺 Book Doctor Appointment</div>
          <div className="text-blue-200 text-sm mt-1">Specialist consultation</div>
        </button>
        <button
          onClick={() => { loadDoctors(); setScreen("patient-id"); setIsExisting(true); }}
          className="w-full bg-teal-600 text-white rounded-2xl p-5 text-left shadow-md hover:bg-teal-700 active:scale-95 transition-all"
          data-flow="chemo"
          id="btn-chemo"
        >
          <div className="text-lg font-bold">💊 Book Chemotherapy Day Care</div>
          <div className="text-teal-200 text-sm mt-1">30 beds · Normal &amp; Special Ward</div>
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setError(""); setScreen("my-bookings"); }}
            className="bg-white border-2 border-stone-200 rounded-2xl p-4 text-center hover:border-blue-400 transition-all"
          >
            <div className="text-xl mb-1">📋</div>
            <div className="font-semibold text-stone-700 text-sm">My Bookings</div>
          </button>
          <a href="tel:+96898821965" className="bg-white border-2 border-stone-200 rounded-2xl p-4 text-center hover:border-blue-400 transition-all">
            <div className="text-xl mb-1">📞</div>
            <div className="font-semibold text-stone-700 text-sm">Contact Hospital</div>
          </a>
        </div>
      </div>
      <div className="text-center mt-8 text-xs text-stone-400 pb-6">Available 24/7 · Live availability</div>
    </div>
  )

  // MY BOOKINGS
  if (screen === "my-bookings") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title="My Bookings" onBack={() => setScreen("home")} />
      <div className="p-4 space-y-4 max-w-sm mx-auto w-full">
        <p className="text-sm text-stone-500">Enter your medical record number and registered mobile number.</p>
        <input className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm" value={mrnInput} onChange={e => setMrnInput(e.target.value)} placeholder="Medical record number" />
        <input className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm" value={mobileInput} onChange={e => setMobileInput(e.target.value)} placeholder="Registered mobile number" type="tel" />
        {error && <div className="rounded-xl bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}
        <Btn onClick={loadMyBookings} disabled={loading || !mrnInput || !mobileInput}>{loading ? "Loading..." : "Find My Bookings"}</Btn>
        {myBookings.length > 0 && <div className="space-y-3">
          {myBookings.map((booking) => <div key={booking.reference} className="rounded-xl border p-4 text-sm">
            <div className="font-semibold text-stone-900">{booking.type}</div>
            <div className="text-stone-500 mt-1">{booking.reference} · {new Date(booking.date).toLocaleDateString()}</div>
            <div className="text-stone-600 mt-1">{booking.provider}{booking.bed ? ` · Bed ${booking.bed}` : ""}</div>
            <div className="text-emerald-700 font-medium mt-2">{booking.status}</div>
          </div>)}
        </div>}
        {myBookings.length === 0 && !loading && !error && <p className="text-sm text-stone-400 text-center">Your upcoming bookings will appear here.</p>}
      </div>
    </div>
  )

  // PATIENT ID
  if (screen === "patient-id") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title="Patient Identification" onBack={() => setScreen("home")} />
      <div className="p-4 space-y-4 max-w-sm mx-auto w-full">
        <div className="flex rounded-xl border overflow-hidden mt-2">
          <button onClick={() => setIsExisting(true)} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${isExisting ? "bg-blue-600 text-white" : "text-stone-500 hover:bg-stone-50"}`}>
            Existing Patient
          </button>
          <button onClick={() => { setIsExisting(false); setScreen("new-patient") }} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${!isExisting ? "bg-blue-600 text-white" : "text-stone-500 hover:bg-stone-50"}`}>
            New Patient
          </button>
        </div>
        <p className="text-stone-600 text-sm">Enter your patient ID or mobile number to find your records.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">MRN / Patient ID</label>
            <input
              className="mt-1 w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g. MRN10458"
              value={mrnInput}
              onChange={e => setMrnInput(e.target.value)}
            />
          </div>
          <div className="text-center text-xs text-stone-400">— or —</div>
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Mobile Number</label>
            <input
              className="mt-1 w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="+968 9123 4567"
              value={mobileInput}
              onChange={e => setMobileInput(e.target.value)}
            />
          </div>
        </div>
        {error && <div className="text-rose-600 text-sm bg-rose-50 rounded-xl p-3">{error}</div>}
        <Btn onClick={identifyPatient} disabled={loading || (!mrnInput && !mobileInput)}>
          {loading ? "Searching..." : "Find My Records →"}
        </Btn>
        <Btn variant="outline" onClick={() => { setIsExisting(false); setScreen("new-patient") }}>
          Continue as New Patient
        </Btn>
      </div>
    </div>
  )

  // NEW PATIENT
  if (screen === "new-patient") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title="New Patient Registration" onBack={() => setScreen("patient-id")} />
      <div className="p-4 space-y-3 max-w-sm mx-auto w-full">
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Full Name *</label>
          <input className="mt-1 w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Your full name" value={newPatient.fullName} onChange={e => setNewPatient(p => ({ ...p, fullName: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Mobile Number *</label>
          <input className="mt-1 w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="+968 9123 4567" value={newPatient.mobile} onChange={e => setNewPatient(p => ({ ...p, mobile: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Email (optional)</label>
          <input className="mt-1 w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="email@example.com" value={newPatient.email} onChange={e => setNewPatient(p => ({ ...p, email: e.target.value }))} />
        </div>
        {error && <div className="text-rose-600 text-sm bg-rose-50 rounded-xl p-3">{error}</div>}
        <Btn onClick={createNewPatient} disabled={loading}>{loading ? "Registering..." : "Register & Continue →"}</Btn>
      </div>
    </div>
  )

  // PATIENT CONFIRM
  if (screen === "patient-confirm") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title="Confirm Your Details" onBack={() => setScreen("patient-id")} />
      <div className="p-4 max-w-sm mx-auto w-full space-y-4">
        <p className="text-stone-600 text-sm">We found the following patient details. Please confirm this is you.</p>
        <div className="bg-blue-50 rounded-2xl p-5 space-y-2">
          <div className="text-lg font-bold text-stone-900">{patient?.fullName}</div>
          <div className="text-sm text-stone-600">MRN: <span className="font-mono font-semibold">{patient?.mrn}</span></div>
          <div className="text-sm text-stone-600">Mobile: {patient?.mobileMasked}</div>
        </div>
        <Btn onClick={() => setScreen("choose-flow")}>✓ Yes, that's me</Btn>
        <Btn variant="outline" onClick={() => { setPatient(null); setScreen("patient-id") }}>✗ Not Me</Btn>
      </div>
    </div>
  )

  // CHOOSE FLOW
  if (screen === "choose-flow") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title={`Hello, ${patient?.fullName?.split(" ")[0]}`} onBack={() => setScreen("patient-confirm")} />
      <div className="p-4 max-w-sm mx-auto w-full space-y-3 mt-2">
        <p className="text-stone-500 text-sm">What would you like to book today?</p>
        <button
          onClick={async () => { await loadAvailDates(); setScreen("chemo-doctor") }}
          className="w-full bg-teal-600 text-white rounded-2xl p-5 text-left shadow-md hover:bg-teal-700 transition-all"
        >
          <div className="text-lg font-bold">💊 Chemotherapy Day Care</div>
          <div className="text-teal-200 text-sm mt-1">Select date, ward, and bed</div>
        </button>
        <button
          onClick={async () => { await loadDepts(); setScreen("apt-dept") }}
          className="w-full bg-blue-600 text-white rounded-2xl p-5 text-left shadow-md hover:bg-blue-700 transition-all"
        >
          <div className="text-lg font-bold">🩺 Doctor Appointment</div>
          <div className="text-blue-200 text-sm mt-1">Choose specialist and time slot</div>
        </button>
      </div>
    </div>
  )

  // CHEMO — SELECT DOCTOR
  if (screen === "chemo-doctor") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title="Select Doctor" onBack={() => setScreen("choose-flow")} />
      <div className="p-4 max-w-sm mx-auto w-full space-y-3">
        <p className="text-stone-500 text-sm">Which doctor is handling your chemotherapy treatment?</p>
        {doctors.map(d => (
          <button
            key={d.id}
            onClick={async () => { setSelectedDoctor(d); await loadAvailDates(); setScreen("chemo-dates") }}
            className="w-full text-left bg-white border-2 border-stone-200 rounded-2xl p-4 hover:border-teal-400 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg">{d.name.charAt(4)}</div>
              <div>
                <div className="font-semibold text-stone-900">{d.name}</div>
                <div className="text-sm text-stone-500">{d.department?.name}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // CHEMO — DATES
  if (screen === "chemo-dates") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title="Choose a Date" onBack={() => setScreen("chemo-doctor")} />
      <div className="p-4 max-w-sm mx-auto w-full">
        {loading ? (
          <div className="space-y-3">{[...Array(7)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2">
            {availDates.map(d => (
              <button
                key={d.date}
                disabled={d.fullyBooked}
                onClick={() => { setSelectedDate(d); setScreen("chemo-ward") }}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${d.fullyBooked ? "opacity-40 cursor-not-allowed border-stone-200 bg-stone-50" : "hover:border-teal-400 border-stone-200 bg-white active:scale-95"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-stone-900 text-base">{d.label}</div>
                  <div className={`text-sm font-bold ${avail_color(d.available)}`}>
                    {d.fullyBooked ? "Fully Booked" : `${d.available} beds`}
                  </div>
                </div>
                {!d.fullyBooked && (
                  <div className="text-xs text-stone-400 mt-1">
                    Normal {d.normal.available} · Special {d.special.available}
                    {d.limited && <span className="text-amber-500 ml-2">⚠ Limited</span>}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // CHEMO — WARD
  if (screen === "chemo-ward") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title={selectedDate?.label || ""} onBack={() => setScreen("chemo-dates")} />
      <div className="p-4 max-w-sm mx-auto w-full space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-stone-900">{selectedDate?.available}</div>
          <div className="text-stone-500 text-sm">of {selectedDate?.total} beds available</div>
        </div>
        {sessions.length > 0 && (
          <div>
            <p className="text-sm text-stone-600 mb-2 font-medium">Choose treatment session:</p>
            <div className="space-y-2">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className={`w-full text-left rounded-xl border-2 p-3 transition-all ${selectedSession?.id === s.id ? "border-teal-500 bg-teal-50" : "border-stone-200 hover:border-teal-300"}`}
                >
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-stone-500">{s.startTime} – {s.endTime}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="text-sm text-stone-600 font-medium">Choose ward:</p>
        <button
          onClick={() => loadBeds("NORMAL")}
          className="w-full text-left bg-white border-2 border-stone-200 rounded-2xl p-5 hover:border-teal-400 transition-all"
        >
          <div className="font-bold text-stone-900">🛏 Normal Ward</div>
          <div className={`text-sm mt-1 font-semibold ${avail_color(selectedDate?.normal.available || 0)}`}>
            {selectedDate?.normal.available} of {selectedDate?.normal.total} available
          </div>
        </button>
        <button
          onClick={() => loadBeds("SPECIAL")}
          className="w-full text-left bg-white border-2 border-stone-200 rounded-2xl p-5 hover:border-teal-400 transition-all"
        >
          <div className="font-bold text-stone-900">⭐ Special Ward</div>
          <div className={`text-sm mt-1 font-semibold ${avail_color(selectedDate?.special.available || 0)}`}>
            {selectedDate?.special.available} of {selectedDate?.special.total} available
          </div>
        </button>
      </div>
    </div>
  )

  // CHEMO — BED SELECTION
  if (screen === "chemo-beds") return (
    <div className="min-h-screen bg-white flex flex-col pb-24">
      <HospHeader title={`${wardType === "NORMAL" ? "Normal" : "Special"} Ward`} onBack={() => setScreen("chemo-ward")} />
      <div className="p-4 max-w-sm mx-auto w-full">
        <p className="text-sm text-stone-500 mb-3">{selectedDate?.label} · {beds.filter(b => b.status === "AVAILABLE").length} available</p>
        {error && <div className="text-rose-600 text-sm bg-rose-50 rounded-xl p-3 mb-3">{error}</div>}
        {loading ? (
          <div className="grid grid-cols-5 gap-2">{[...Array(15)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {beds.map(bed => (
              <button
                key={bed.id}
                disabled={bed.status !== "AVAILABLE"}
                onClick={() => { setError(""); holdBed(bed) }}
                className={`rounded-xl border-2 p-2 text-center transition-all ${BED_COLOR[bed.status]}`}
              >
                <div className="font-bold text-xs">{bed.bedNumber}</div>
                <div className="text-[9px] mt-0.5">{BED_LABEL[bed.status]}</div>
              </button>
            ))}
          </div>
        )}
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-4 text-[10px] text-stone-500">
          {Object.entries(BED_LABEL).map(([k, v]) => (
            <div key={k} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${BED_COLOR[k].split(" ").slice(0,2).join(" ")}`}>
              {v}
            </div>
          ))}
        </div>
      </div>
      {loading && selectedBed && (
        <div className="fixed bottom-0 left-0 right-0 bg-teal-600 text-white p-4 text-center text-sm font-semibold">
          Reserving {selectedBed.bedNumber}...
        </div>
      )}
    </div>
  )

  // CHEMO — REVIEW
  if (screen === "chemo-review") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title="Review Booking" onBack={() => { if (holdId && patientRef) fetch(`/api/hospital/beds/hold?holdId=${holdId}&patientRef=${encodeURIComponent(patientRef)}`, { method: "DELETE" }); setScreen("chemo-beds") }} />
      <div className="p-4 max-w-sm mx-auto w-full space-y-4">
        {holdSecs > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <div className="text-amber-700 font-semibold text-sm">⏱ Bed held for {Math.floor(holdSecs / 60)}:{String(holdSecs % 60).padStart(2, "0")}</div>
            <div className="text-amber-600 text-xs mt-0.5">Complete booking before it expires</div>
          </div>
        )}
        <div className="bg-stone-50 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-stone-900">Chemotherapy Day Care</h3>
          <div className="space-y-2 text-sm">
            <Row label="Patient" value={patient?.fullName || ""} />
            <Row label="MRN" value={patient?.mrn || ""} mono />
            <Row label="Doctor" value={selectedDoctor?.name || ""} />
            <Row label="Date" value={selectedDate?.label || ""} />
            <Row label="Ward" value={wardType === "NORMAL" ? "Normal Ward" : "Special Ward"} />
            <Row label="Bed" value={selectedBed?.bedNumber || ""} />
            {selectedSession && <Row label="Session" value={`${selectedSession.name} · ${selectedSession.startTime}–${selectedSession.endTime}`} />}
          </div>
        </div>
        {error && <div className="text-rose-600 text-sm bg-rose-50 rounded-xl p-3">{error}</div>}
        <Btn onClick={confirmChemoBooking} disabled={loading}>{loading ? "Confirming..." : "✓ Confirm Booking"}</Btn>
        <Btn variant="outline" onClick={() => { if (holdId && patientRef) fetch(`/api/hospital/beds/hold?holdId=${holdId}&patientRef=${encodeURIComponent(patientRef)}`, { method: "DELETE" }); setScreen("chemo-beds") }}>
          Change Details
        </Btn>
      </div>
    </div>
  )

  // CHEMO — CONFIRMED
  if (screen === "chemo-confirmed") return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-6 max-w-sm mx-auto w-full space-y-5 pt-12">
        <div className="text-center">
          <div className="h-20 w-20 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" className="h-10 w-10 fill-none stroke-emerald-600 stroke-2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 className="text-xl font-bold text-stone-900">Booking Confirmed ✓</h2>
          <p className="text-stone-500 text-sm mt-1">Your chemotherapy day care is booked</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-5 space-y-2">
          <div className="text-center font-mono text-lg font-bold text-emerald-700">{confirmedBooking?.bookingRef}</div>
          <div className="border-t border-emerald-200 pt-3 space-y-2 text-sm">
            <Row label="Patient" value={confirmedBooking?.patient?.fullName} />
            <Row label="Doctor" value={confirmedBooking?.doctor?.name} />
            <Row label="Date" value={confirmedBooking?.bookingDate ? format(new Date(confirmedBooking.bookingDate), "EEEE, d MMMM yyyy") : ""} />
            <Row label="Ward" value={confirmedBooking?.bed?.ward?.name} />
            <Row label="Bed" value={confirmedBooking?.bed?.bedNumber} />
            {confirmedBooking?.session && <Row label="Session" value={`${confirmedBooking.session.name} · ${confirmedBooking.session.startTime}–${confirmedBooking.session.endTime}`} />}
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
          📋 Please arrive <strong>30 minutes</strong> before your scheduled treatment. Bring your hospital ID card.
        </div>
        <Btn variant="outline" onClick={() => { setScreen("home"); setConfirmedBooking(null); setSelectedBed(null); setSelectedDate(null); setSelectedDoctor(null) }}>
          Return Home
        </Btn>
      </div>
    </div>
  )

  // APT — DEPT
  if (screen === "apt-dept") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title="Select Department" onBack={() => setScreen("choose-flow")} />
      <div className="p-4 max-w-sm mx-auto w-full space-y-2">
        {depts.map(d => (
          <button key={d.id} onClick={() => { setSelectedDept(d); loadDeptDoctors(d.id); setScreen("apt-doctor") }}
            className="w-full text-left rounded-2xl border-2 border-stone-200 p-4 hover:border-blue-400 transition-all">
            <div className="font-semibold text-stone-900">{d.name}</div>
          </button>
        ))}
      </div>
    </div>
  )

  // APT — DOCTOR
  if (screen === "apt-doctor") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title={selectedDept?.name} onBack={() => setScreen("apt-dept")} />
      <div className="p-4 max-w-sm mx-auto w-full space-y-3">
        {(deptDoctors.length ? deptDoctors : doctors).map(d => (
          <button key={d.id} onClick={() => { setAptDoctor(d); loadAptDates(d.id); setScreen("apt-dates") }}
            className="w-full text-left bg-white border-2 border-stone-200 rounded-2xl p-4 hover:border-blue-400 transition-all">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">{d.name.charAt(4)}</div>
              <div><div className="font-semibold">{d.name}</div><div className="text-sm text-stone-500">{d.department?.name}</div></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // APT — DATES
  if (screen === "apt-dates") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title="Choose a Date" onBack={() => setScreen("apt-doctor")} />
      <div className="p-4 max-w-sm mx-auto w-full space-y-2">
        {loading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />)}</div>
        : aptDates.length === 0 ? <div className="text-center text-stone-400 py-8">No available dates in next 7 days</div>
        : aptDates.map(d => (
          <button key={d.date} onClick={() => { setAptDate(d); setScreen("apt-slots") }}
            className="w-full text-left rounded-2xl border-2 border-stone-200 p-4 hover:border-blue-400 transition-all">
            <div className="flex justify-between">
              <div className="font-bold text-stone-900">{d.label}</div>
              <div className="text-emerald-600 text-sm font-semibold">{d.slots.length} slots</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // APT — SLOTS
  if (screen === "apt-slots") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title={aptDate?.label} onBack={() => setScreen("apt-dates")} />
      <div className="p-4 max-w-sm mx-auto w-full">
        <div className="text-sm text-stone-500 mb-4">{aptDoctor?.name}</div>
        <div className="grid grid-cols-3 gap-2">
          {aptDate?.slots.map((slot: string) => (
            <button key={slot} onClick={() => { setAptSlot(slot); setScreen("apt-review") }}
              className={`rounded-xl border-2 py-3 text-sm font-semibold transition-all ${aptSlot === slot ? "border-blue-600 bg-blue-600 text-white" : "border-stone-200 text-stone-700 hover:border-blue-400"}`}>
              {slot}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // APT — REVIEW
  if (screen === "apt-review") return (
    <div className="min-h-screen bg-white flex flex-col">
      <HospHeader title="Review Appointment" onBack={() => setScreen("apt-slots")} />
      <div className="p-4 max-w-sm mx-auto w-full space-y-4">
        <div className="bg-stone-50 rounded-2xl p-5 space-y-2 text-sm">
          <h3 className="font-bold text-stone-900">Doctor Appointment</h3>
          <Row label="Patient" value={patient?.fullName || ""} />
          <Row label="MRN" value={patient?.mrn || ""} mono />
          <Row label="Doctor" value={aptDoctor?.name || ""} />
          <Row label="Department" value={aptDoctor?.department?.name || ""} />
          <Row label="Date" value={aptDate?.label || ""} />
          <Row label="Time" value={aptSlot || ""} />
        </div>
        {error && <div className="text-rose-600 text-sm bg-rose-50 rounded-xl p-3">{error}</div>}
        <Btn onClick={confirmAptBooking} disabled={loading}>{loading ? "Confirming..." : "✓ Confirm Appointment"}</Btn>
        <Btn variant="outline" onClick={() => setScreen("apt-slots")}>Change Time</Btn>
      </div>
    </div>
  )

  // APT — CONFIRMED
  if (screen === "apt-confirmed") return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-6 max-w-sm mx-auto w-full space-y-5 pt-12">
        <div className="text-center">
          <div className="h-20 w-20 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" className="h-10 w-10 fill-none stroke-emerald-600 stroke-2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 className="text-xl font-bold text-stone-900">Appointment Confirmed ✓</h2>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-5 space-y-2">
          <div className="text-center font-mono text-base font-bold text-emerald-700">{confirmedApt?.appointmentRef}</div>
          <div className="border-t border-emerald-200 pt-3 space-y-2 text-sm">
            <Row label="Patient" value={confirmedApt?.patient?.fullName} />
            <Row label="Doctor" value={confirmedApt?.doctor?.name} />
            <Row label="Department" value={confirmedApt?.doctor?.department?.name} />
            <Row label="Date" value={confirmedApt?.appointmentDate ? format(new Date(confirmedApt.appointmentDate), "EEEE, d MMMM yyyy") : ""} />
            <Row label="Time" value={confirmedApt?.appointmentTime} />
          </div>
        </div>
        <Btn variant="outline" onClick={() => { setScreen("home"); setConfirmedApt(null) }}>Return Home</Btn>
      </div>
    </div>
  )

  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Row({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-stone-500 shrink-0">{label}</span>
      <span className={`text-stone-900 font-medium text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  )
}
