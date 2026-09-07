"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  Building2, BedDouble, CalendarClock, CalendarDays, Users, Activity, Search,
  RefreshCw, Plus, Stethoscope, CheckCircle2, XCircle, Clock,
  AlertTriangle, UserPlus, Wrench, ChevronLeft, ChevronRight,
  ArrowLeft, BellRing, Sparkles, Send, ShieldCheck, HeartPulse,
  Syringe, Pill, FileText, CheckCheck, Pencil, Trash2,
} from "lucide-react"
import { format } from "date-fns"

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "calendar" | "bed-map" | "therapies" | "reminders" | "bookings" | "doctors" | "patients" | "permissions"

interface DashStats {
  date: string
  normal: { name: string; total: number; booked: number; held: number; blocked: number; available: number } | null
  special: { name: string; total: number; booked: number; held: number; blocked: number; available: number } | null
  totalChemo: number
  totalBeds: number
  totalAvailable: number
  doctorAppointmentsToday: number
}

interface BedData {
  id: string
  bedNumber: string
  status: "AVAILABLE" | "BOOKED" | "HELD" | "BLOCKED" | "OCCUPIED" | "CLEANING"
  data?: {
    bookingRef?: string
    patient?: { fullName: string; mrn: string; mobile: string }
    doctor?: { name: string }
    session?: { name: string; startTime: string; endTime: string }
    status?: string
    reason?: string
    expiresAt?: string
  }
}

interface WardMap {
  id: string
  name: string
  wardType: string
  totalBeds: number
  beds: BedData[]
}

// ─── Bed status colours ───────────────────────────────────────────────────────
const BED_STATUS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  AVAILABLE: { bg: "bg-emerald-50", border: "border-emerald-400", text: "text-emerald-700", label: "Available" },
  BOOKED:    { bg: "bg-rose-50",    border: "border-rose-400",    text: "text-rose-700",    label: "Booked" },
  HELD:      { bg: "bg-amber-50",   border: "border-amber-400",   text: "text-amber-700",   label: "Held" },
  BLOCKED:   { bg: "bg-stone-100",  border: "border-stone-400",   text: "text-stone-600",   label: "Blocked" },
  OCCUPIED:  { bg: "bg-blue-50",    border: "border-blue-400",    text: "text-blue-700",    label: "Occupied" },
  CLEANING:  { bg: "bg-purple-50",  border: "border-purple-400",  text: "text-purple-700",  label: "Cleaning" },
}

// ─── BedCard ─────────────────────────────────────────────────────────────────
function BedCard({ bed, onClick }: { bed: BedData; onClick: (b: BedData) => void }) {
  const s = BED_STATUS[bed.status] || BED_STATUS.AVAILABLE
  return (
    <button
      onClick={() => onClick(bed)}
      className={`rounded-xl border-2 p-3 text-center transition-all hover:scale-105 cursor-pointer ${s.bg} ${s.border}`}
    >
      <div className={`font-bold text-sm ${s.text}`}>{bed.bedNumber}</div>
      <div className={`text-[10px] mt-0.5 ${s.text}`}>{s.label}</div>
      {bed.data?.patient && (
        <div className="text-[9px] text-stone-500 mt-1 truncate max-w-[60px] mx-auto">
          {bed.data.patient.fullName?.split(" ")[0] || "Patient"}
        </div>
      )}
    </button>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/hospital/admin/dashboard")
      .then(r => r.json())
      .then(data => {
        if (data && typeof data.totalBeds === "number") {
          setStats(data)
        } else {
          setStats({
            date: format(new Date(), "yyyy-MM-dd"),
            normal: { name: "Normal Ward (N01-N15)", total: 15, booked: 0, held: 0, blocked: 0, available: 15 },
            special: { name: "Special Ward (S01-S15)", total: 15, booked: 0, held: 0, blocked: 0, available: 15 },
            totalChemo: 0,
            totalBeds: 30,
            totalAvailable: 30,
            doctorAppointmentsToday: 0,
          })
        }
      })
      .catch(() => {
        setStats({
          date: format(new Date(), "yyyy-MM-dd"),
          normal: { name: "Normal Ward (N01-N15)", total: 15, booked: 0, held: 0, blocked: 0, available: 15 },
          special: { name: "Special Ward (S01-S15)", total: 15, booked: 0, held: 0, blocked: 0, available: 15 },
          totalChemo: 0,
          totalBeds: 30,
          totalAvailable: 30,
          doctorAppointmentsToday: 0,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  )

  if (!stats) return null

  function WardGauge({ ward }: { ward: NonNullable<DashStats["normal"]> }) {
    const total = ward.total || 15
    const pct = Math.round(((ward.booked || 0) / total) * 100)
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-stone-900">{ward.name}</div>
            <Badge className={pct >= 90 ? "bg-rose-100 text-rose-700" : pct >= 70 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
              {pct}% full
            </Badge>
          </div>
          <div className="h-2 rounded-full bg-stone-100 mb-3">
            <div
              className={`h-2 rounded-full transition-all ${pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div><div className="font-bold text-stone-900 text-lg">{ward.booked || 0}</div><div className="text-stone-500">Booked</div></div>
            <div><div className="font-bold text-emerald-600 text-lg">{ward.available ?? 15}</div><div className="text-stone-500">Free</div></div>
            <div><div className="font-bold text-amber-600 text-lg">{ward.held || 0}</div><div className="text-stone-500">Held</div></div>
            <div><div className="font-bold text-stone-600 text-lg">{ward.blocked || 0}</div><div className="text-stone-500">Blocked</div></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const statCards = [
    { icon: BedDouble, label: "Total Beds", value: stats.totalBeds ?? 30, color: "text-stone-700", bg: "bg-stone-100" },
    { icon: CheckCircle2, label: "Booked Today", value: stats.totalChemo ?? 0, color: "text-rose-600", bg: "bg-rose-50" },
    { icon: Activity, label: "Available", value: stats.totalAvailable ?? 30, color: "text-emerald-600", bg: "bg-emerald-50" },
    { icon: CalendarClock, label: "Doctor Apts", value: stats.doctorAppointmentsToday ?? 0, color: "text-blue-600", bg: "bg-blue-50" },
  ]

  return (
    <div className="space-y-5">
      <div className="text-sm text-stone-500">Today · {format(new Date(), "EEEE, d MMMM yyyy")}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                <div className="text-xs text-stone-500">{c.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.normal && <WardGauge ward={stats.normal} />}
        {stats.special && <WardGauge ward={stats.special} />}
      </div>
    </div>
  )
}

function PermissionsTab() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => { fetch("/api/hospital/permissions").then(r => r.ok ? r.json() : Promise.reject()).then(d => setMembers(d.members || [])).catch(() => toast.error("Permission management is restricted to hospital managers")).finally(() => setLoading(false)) }, [])
  async function change(memberId: string, role: string) {
    setBusy(memberId)
    const response = await fetch("/api/hospital/permissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, role, permissions: { patientView: role === "CLINICAL" || role === "HOSPITAL_MANAGER", patientEdit: role === "CLINICAL" || role === "HOSPITAL_MANAGER", billing: role === "ADMINISTRATIVE" || role === "HOSPITAL_MANAGER" } }) })
    if (response.ok) { setMembers(prev => prev.map(member => member.id === memberId ? { ...member, role } : member)); toast.success("Hospital permission updated") } else toast.error("Could not update permission")
    setBusy(null)
  }
  return <Card><CardContent className="p-5"><div className="flex items-center justify-between mb-4"><div><h3 className="font-semibold text-stone-900 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-600" />Clinical & administrative access</h3><p className="text-xs text-stone-500 mt-1">Separate patient-data access from administrative work.</p></div><Badge variant="outline">Audit logged</Badge></div>{loading ? <Skeleton className="h-24" /> : members.length === 0 ? <p className="text-sm text-stone-500">No team members found.</p> : <div className="space-y-2">{members.map(member => <div key={member.id} className="flex items-center justify-between gap-3 border rounded-lg p-3"><div><p className="text-sm font-medium">{member.staff?.name || member.staff?.email}</p><p className="text-xs text-stone-500">{member.staff?.email}</p></div><Select value={member.role} onValueChange={role => change(member.id, role)} disabled={busy === member.id}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CLINICAL">Clinical</SelectItem><SelectItem value="ADMINISTRATIVE">Administrative</SelectItem><SelectItem value="HOSPITAL_MANAGER">Hospital manager</SelectItem><SelectItem value="VIEWER">Viewer</SelectItem></SelectContent></Select></div>)}</div>}</CardContent></Card>
}

// ─── Bed Map Tab ──────────────────────────────────────────────────────────────
function BedMapTab() {
  const [wards, setWards] = useState<WardMap[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionId, setSessionId] = useState("all")
  const [selectedBed, setSelectedBed] = useState<BedData | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const q = new URLSearchParams({ date, ...(sessionId !== "all" ? { sessionId } : {}) })
    fetch(`/api/hospital/admin/bed-map?${q}`)
      .then(r => r.json())
      .then(data => setWards(Array.isArray(data) ? data : []))
      .catch(() => setWards([]))
      .finally(() => setLoading(false))
  }, [date, sessionId])

  useEffect(() => {
    fetch("/api/hospital/sessions")
      .then(r => r.json())
      .then(data => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
  }, [])

  useEffect(() => { load() }, [load])

  const handleAction = async (action: string, bed: BedData) => {
    if (action === "block") {
      const reason = prompt("Enter block reason (e.g. Maintenance, Cleaning):") || "Maintenance"
      await fetch("/api/hospital/beds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bed.id, isBlocked: true, blockReason: reason }),
      })
      toast.success(`Bed ${bed.bedNumber} blocked`)
      load()
    } else if (action === "unblock") {
      await fetch("/api/hospital/beds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bed.id, isBlocked: false, blockReason: null }),
      })
      toast.success(`Bed ${bed.bedNumber} unblocked`)
      load()
    } else if (action === "check-in" && bed.data?.bookingRef) {
      await fetch(`/api/hospital/chemo/${bed.data.bookingRef}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CHECKED_IN" }),
      })
      toast.success("Patient checked in")
      load()
    } else if (action === "cancel" && bed.data?.bookingRef) {
      if (confirm("Cancel this booking?")) {
        await fetch(`/api/hospital/chemo/${bed.data.bookingRef}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CANCELLED" }),
        })
        toast.success("Booking cancelled")
        load()
      }
    }
  }

  function WardGrid({ ward }: { ward: WardMap }) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-bold text-stone-900">{ward.name}</div>
              <div className="text-xs text-stone-500">{ward.totalBeds} Beds total</div>
            </div>
            <Badge variant="outline" className="text-xs">{ward.wardType}</Badge>
          </div>
          <div className="grid grid-cols-5 gap-2.5">
            {ward.beds?.map(bed => (
              <BedCard key={bed.id} bed={bed} onClick={setSelectedBed} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const selectedBedStatus = selectedBed ? (BED_STATUS[selectedBed.status] || BED_STATUS.AVAILABLE) : BED_STATUS.AVAILABLE

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40 h-8 text-xs" />
        {sessions.length > 0 && (
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All sessions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sessions</SelectItem>
              {sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="sm" onClick={load} className="h-8 text-xs"><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-stone-500">
        {Object.entries(BED_STATUS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <div className={`h-3 w-3 rounded border-2 ${v.bg} ${v.border}`} />
            <span>{v.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0,1].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : wards.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-stone-400">No ward beds found</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wards.map(w => <WardGrid key={w.id} ward={w} />)}
        </div>
      )}

      <Dialog open={!!selectedBed} onOpenChange={open => { if (!open) setSelectedBed(null) }}>
        {selectedBed && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded font-bold ${selectedBedStatus.bg} ${selectedBedStatus.text}`}>{selectedBed.bedNumber}</span>
                <Badge className={`${selectedBedStatus.bg} ${selectedBedStatus.text} border-0`}>{selectedBedStatus.label}</Badge>
              </DialogTitle>
            </DialogHeader>
            {selectedBed.data?.patient && (
              <div className="space-y-2 text-sm">
                <div className="p-3 rounded-lg bg-stone-50 space-y-1">
                  <div className="font-semibold">{selectedBed.data.patient.fullName}</div>
                  <div className="text-stone-500 text-xs">MRN: {selectedBed.data.patient.mrn}</div>
                  <div className="text-stone-500 text-xs">📞 {selectedBed.data.patient.mobile}</div>
                </div>
                {selectedBed.data.doctor && <div className="text-stone-600 text-xs">👨‍⚕️ {selectedBed.data.doctor.name}</div>}
                {selectedBed.data.session && (
                  <div className="text-stone-600 text-xs">⏰ {selectedBed.data.session.name} · {selectedBed.data.session.startTime}–{selectedBed.data.session.endTime}</div>
                )}
                {selectedBed.data.bookingRef && <div className="font-mono text-xs text-stone-500">{selectedBed.data.bookingRef}</div>}
              </div>
            )}
            {selectedBed.data?.reason && (
              <div className="text-sm text-stone-600 p-3 bg-stone-50 rounded-lg">
                🔧 {selectedBed.data.reason}
              </div>
            )}
            {selectedBed.data?.expiresAt && (
              <div className="text-xs text-amber-600">⏱️ Hold expires: {new Date(selectedBed.data.expiresAt).toLocaleTimeString()}</div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedBed.status === "BOOKED" && (
                <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => { handleAction("check-in", selectedBed); setSelectedBed(null) }}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Check In
                </Button>
              )}
              {selectedBed.status === "AVAILABLE" && (
                <Button size="sm" variant="outline" className="text-stone-600" onClick={() => { handleAction("block", selectedBed); setSelectedBed(null) }}>
                  <Wrench className="h-3.5 w-3.5 mr-1" />Block Bed
                </Button>
              )}
              {selectedBed.status === "BLOCKED" && (
                <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => { handleAction("unblock", selectedBed); setSelectedBed(null) }}>
                  Unblock
                </Button>
              )}
              {["BOOKED","CHECKED_IN","OCCUPIED"].includes(selectedBed.status) && (
                <Button size="sm" variant="outline" className="text-rose-600" onClick={() => { handleAction("cancel", selectedBed); setSelectedBed(null) }}>
                  <XCircle className="h-3.5 w-3.5 mr-1" />Cancel Booking
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

// ─── Services & Therapies Tab ────────────────────────────────────────────────
function TherapiesTab() {
  const [therapies, setTherapies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", category: "Chemotherapy", durationMins: 240, wardType: "Normal & Special Wards", price: 65, description: "" })

  const load = () => {
    setLoading(true)
    fetch("/api/hospital/services")
      .then(r => r.json())
      .then(d => {
        setTherapies(Array.isArray(d.therapies) ? d.therapies : [])
      })
      .catch(() => setTherapies([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.name.trim()) { toast.error("Therapy name is required"); return }
    const res = await fetch("/api/hospital/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success("Therapy / Service added")
      setShowAdd(false)
      setTherapies(p => [...p, { id: `th_${Date.now()}`, ...form, currency: "OMR" }])
      setForm({ name: "", category: "Chemotherapy", durationMins: 240, wardType: "Normal & Special Wards", price: 65, description: "" })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-rose-500" />
            Hospital Oncology Services &amp; Therapies Catalog
          </h3>
          <p className="text-xs text-stone-500">Day-care infusions, immunotherapy, oncology consultations, supportive care &amp; palliative protocols</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Therapy
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {therapies.map(t => (
            <Card key={t.id} className="border hover:border-blue-300 transition-all shadow-xs">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 mb-1">{t.category}</Badge>
                    <h4 className="font-bold text-stone-900 text-sm leading-snug">{t.name}</h4>
                  </div>
                  <div className="font-bold text-emerald-700 text-sm">{t.price} {t.currency || "OMR"}</div>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">{t.description}</p>
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-stone-400" /> {t.durationMins} Mins</span>
                  <span className="flex items-center gap-1"><BedDouble className="h-3 w-3 text-stone-400" /> {t.wardType}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Hospital Service &amp; Therapy</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-stone-700">Therapy / Service Name</label>
              <Input className="mt-1 text-xs" placeholder="e.g. Chemotherapy Infusion Protocol" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-stone-700">Category</label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Chemotherapy">Chemotherapy</SelectItem>
                    <SelectItem value="Immunotherapy">Immunotherapy</SelectItem>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                    <SelectItem value="Supportive Care">Supportive Care</SelectItem>
                    <SelectItem value="Palliative">Palliative Care</SelectItem>
                    <SelectItem value="Wellness">Nutrition &amp; Wellness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700">Fee (OMR)</label>
                <Input type="number" className="mt-1 text-xs" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-stone-700">Duration (Minutes)</label>
                <Input type="number" className="mt-1 text-xs" value={form.durationMins} onChange={e => setForm(p => ({ ...p, durationMins: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700">Ward / Room Type</label>
                <Select value={form.wardType} onValueChange={v => setForm(p => ({ ...p, wardType: v }))}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal & Special Wards">Normal &amp; Special Wards (30 Beds)</SelectItem>
                    <SelectItem value="Special Ward Only">Special Ward (S01-S15)</SelectItem>
                    <SelectItem value="Outpatient Clinic">Outpatient Clinic</SelectItem>
                    <SelectItem value="Day Care / Clinic">Day Care / Clinic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-700">Protocol Details &amp; Preparation Instructions</label>
              <Textarea rows={2} className="mt-1 text-xs" placeholder="Protocol details..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold" onClick={save}>Save Service</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Reminders & Alerts Tab ──────────────────────────────────────────────────
function RemindersTab() {
  const [data, setData] = useState<{ chemoReminders: any[]; doctorReminders: any[]; stats: any }>({ chemoReminders: [], doctorReminders: [], stats: {} })
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch("/api/hospital/reminders")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData({ chemoReminders: [], doctorReminders: [], stats: {} }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const sendReminder = async (item: any, type: "chemo" | "doctor") => {
    const id = item.id || item.bookingRef
    setSendingId(id)
    try {
      const res = await fetch("/api/hospital/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          phone: item.patient?.mobile || item.customerPhone,
          patientName: item.patient?.fullName || item.customerName,
          date: item.bookingDate || item.appointmentDate,
          time: item.session?.name ? `${item.session.name} (${item.session.startTime} - ${item.session.endTime})` : item.startTime,
          bedNumber: item.bed ? `Bed ${item.bed.bedNumber} (${item.bed.ward?.name})` : undefined,
          doctorName: item.doctor?.name,
        }),
      })
      const resData = await res.json()
      if (res.ok) {
        toast.success(`WhatsApp reminder sent to ${item.patient?.fullName || "Patient"}!`)
      } else {
        toast.error(resData.error || "Failed to send reminder")
      }
    } catch {
      toast.error("Network error while sending reminder")
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 rounded-xl border border-blue-200">
        <div>
          <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
            <BellRing className="h-4 w-4 text-blue-600" />
            Automated WhatsApp Reminders &amp; Patient Checklists
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Dispatches automated 24h &amp; 2h WhatsApp reminders with pre-medication instructions, fasting guidelines, bed details &amp; hospital GPS
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="h-8 text-xs bg-white shrink-0">
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh Schedule
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
              <Pill className="h-3.5 w-3.5 text-rose-500" />
              Chemotherapy Day Care Sessions (Today &amp; Tomorrow)
            </h4>
            {data.chemoReminders.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-6 text-center text-xs text-stone-400">No chemotherapy sessions scheduled for today or tomorrow</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {data.chemoReminders.map(c => (
                  <Card key={c.id} className="border hover:border-blue-300 transition-all">
                    <CardContent className="p-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900 text-sm">{c.patient?.fullName}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">MRN: {c.patient?.mrn}</Badge>
                          <Badge className="bg-blue-100 text-blue-700 text-[10px]">{c.bookingDate}</Badge>
                        </div>
                        <div className="text-xs text-stone-500 flex items-center gap-3 mt-1">
                          <span>🛏️ Bed {c.bed?.bedNumber} ({c.bed?.ward?.name})</span>
                          <span>⏰ {c.session?.name || "Morning Session"}</span>
                          <span>👨‍⚕️ {c.doctor?.name || "Dr. Ahmed Khan"}</span>
                          <span>📞 {c.patient?.mobile}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 shrink-0"
                        onClick={() => sendReminder(c, "chemo")}
                        disabled={sendingId === c.id}
                      >
                        <Send className="h-3 w-3" />
                        {sendingId === c.id ? "Sending..." : "Send Pre-Chemo Reminder"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-blue-500" />
              Doctor &amp; Specialist Appointments (Today &amp; Tomorrow)
            </h4>
            {data.doctorReminders.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-6 text-center text-xs text-stone-400">No doctor appointments scheduled for today or tomorrow</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {data.doctorReminders.map(d => (
                  <Card key={d.id} className="border hover:border-blue-300 transition-all">
                    <CardContent className="p-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900 text-sm">{d.patient?.fullName}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">MRN: {d.patient?.mrn}</Badge>
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{d.appointmentDate}</Badge>
                        </div>
                        <div className="text-xs text-stone-500 flex items-center gap-3 mt-1">
                          <span>👨‍⚕️ {d.doctor?.name}</span>
                          <span>⏰ {d.startTime} - {d.endTime}</span>
                          <span>📞 {d.patient?.mobile}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1.5 shrink-0"
                        onClick={() => sendReminder(d, "doctor")}
                        disabled={sendingId === d.id}
                      >
                        <Send className="h-3 w-3" />
                        {sendingId === d.id ? "Sending..." : "Send Doctor Reminder"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Doctors Tab ──────────────────────────────────────────────────────────────
function DoctorsTab() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [depts, setDepts] = useState<any[]>([])
  const [form, setForm] = useState({ name: "", specialization: "", departmentId: "", mobile: "", email: "", languages: "" })

  const loadDoctors = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/hospital/doctors?includeInactive=1").then(r => r.json()).catch(() => []),
      fetch("/api/hospital/departments").then(r => r.json()).catch(() => []),
    ]).then(([d, dps]) => {
      setDoctors(Array.isArray(d) ? d : [])
      setDepts(Array.isArray(dps) ? dps : [])
      if (Array.isArray(dps) && dps.length > 0 && !form.departmentId) {
        setForm(p => ({ ...p, departmentId: dps[0].id }))
      }
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadDoctors() }, [])

  const save = async () => {
    if (!form.name.trim()) { toast.error("Doctor name is required"); return }
    const res = await fetch(editing ? `/api/hospital/doctors/${editing.id}` : "/api/hospital/doctors", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success("Doctor saved")
      setShowAdd(false); setEditing(null)
      setForm({ name: "", specialization: "", departmentId: depts[0]?.id || "", mobile: "", email: "", languages: "" })
      loadDoctors()
    } else {
      toast.error("Failed to save doctor")
    }
  }

  const editDoctor = (d: any) => { setEditing(d); setForm({ name: d.name || "", specialization: d.specialization || "", departmentId: d.departmentId || d.department?.id || "", mobile: d.mobile || "", email: d.email || "", languages: d.languages || "" }); setShowAdd(true) }
  const archiveDoctor = async (d: any) => { if (!confirm(`Archive ${d.name}? Clinical history will be preserved.`)) return; const res = await fetch(`/api/hospital/doctors/${d.id}`, { method: "DELETE" }); if (res.ok) { toast.success("Doctor archived"); loadDoctors() } else toast.error("Could not archive doctor") }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-stone-800">Medical Specialists &amp; Oncologists</h3>
        <Button size="sm" onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-3.5 w-3.5 mr-1" />Add Doctor
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {doctors.map(d => (
            <Card key={d.id}>
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-stone-900">{d.name}</div>
                  <div className="text-sm text-stone-500">{d.specialization}</div>
                  <Badge variant="outline" className="text-[10px] mt-1">{d.department?.name || "Oncology"}</Badge>
                </div>
                <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editDoctor(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                {d.isActive && <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => archiveDoctor(d)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                <Badge className={d.isActive ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}>
                  {d.isActive ? "Active" : "Inactive"}
                </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {doctors.length === 0 && <div className="col-span-3 text-center text-stone-400 py-8">No doctors found</div>}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit Doctor" : "Add Doctor"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full name (e.g. Dr. Ahmed Khan)" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Specialization (e.g. Medical Oncology)" value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2"><Input placeholder="Mobile" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} /><Input placeholder="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <Input placeholder="Languages (e.g. English, Arabic)" value={form.languages} onChange={e => setForm(p => ({ ...p, languages: e.target.value }))} />
            {depts.length > 0 && (
              <Select value={form.departmentId || depts[0]?.id} onValueChange={v => setForm(p => ({ ...p, departmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{depts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={save}>{editing ? "Update Doctor" : "Save Doctor"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Patients Tab ─────────────────────────────────────────────────────────────
function PatientsTab() {
  const [patients, setPatients] = useState<any[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ mrn: "", fullName: "", mobile: "", email: "", dob: "", gender: "", nationalId: "", emergContact: "" })

  const search = async (query = q) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/hospital/patients?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setPatients(Array.isArray(data) ? data : [])
    } catch {
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { search("") }, [])

  const openPatient = async (p?: any) => {
    if (!p) { setEditing(null); setForm({ mrn: "", fullName: "", mobile: "", email: "", dob: "", gender: "", nationalId: "", emergContact: "" }); setShowAdd(true); return }
    const res = await fetch(`/api/hospital/patients/${p.id}`); const d = await res.json(); const value = d.patient || d
    setEditing(value); setForm({ mrn: value.mrn || "", fullName: value.fullName || "", mobile: value.mobile || "", email: value.email || "", dob: value.dob ? String(value.dob).slice(0, 10) : "", gender: value.gender || "", nationalId: value.nationalId || "", emergContact: value.emergContact || "" }); setShowAdd(true)
  }
  const savePatient = async () => { if (!form.fullName.trim() || !form.mobile.trim()) { toast.error("Full name and mobile are required"); return }; const res = await fetch(editing ? `/api/hospital/patients/${editing.id}` : "/api/hospital/patients", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (res.ok) { toast.success(editing ? "Patient updated" : "Patient added"); setShowAdd(false); search() } else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not save patient") } }
  const deletePatient = async (p: any) => { if (!confirm(`Delete ${p.fullName}? Only records without clinical history can be deleted.`)) return; const res = await fetch(`/api/hospital/patients/${p.id}`, { method: "DELETE" }); const d = await res.json().catch(() => ({})); if (res.ok) { toast.success("Patient deleted"); search() } else toast.error(d.error || "Patient cannot be deleted") }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
          <Input placeholder="Search by name, MRN, or mobile..." className="pl-8" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} />
        </div>
        <Button onClick={() => search()}>Search</Button>
        <Button onClick={() => openPatient()} className="bg-teal-600 hover:bg-teal-700"><Plus className="h-4 w-4 mr-1" />Add Patient</Button>
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {patients.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                  {p.fullName?.[0] || "P"}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{p.fullName}</div>
                  <div className="text-sm text-stone-500">MRN: {p.mrn} · {p.mobile}</div>
                </div>
                <div className="text-right text-xs text-stone-400">
                  <div>{p._count?.chemoBookings || 0} chemo</div>
                  <div>{p._count?.appointments || 0} apts</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openPatient(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                {!(p._count?.chemoBookings || p._count?.appointments || p._count?.treatments) && <Button variant="ghost" size="icon" className="text-rose-600" onClick={() => deletePatient(p)}><Trash2 className="h-3.5 w-3.5" /></Button>}
              </CardContent>
            </Card>
          ))}
          {patients.length === 0 && <div className="text-center text-stone-400 py-8">No patients found</div>}
        </div>
      )}
      <Dialog open={showAdd} onOpenChange={setShowAdd}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Patient Details" : "Add Patient"}</DialogTitle></DialogHeader><div className="space-y-3"><div className="grid grid-cols-2 gap-2"><Input placeholder="MRN (optional)" value={form.mrn} onChange={e => setForm(p => ({ ...p, mrn: e.target.value }))} /><Input placeholder="Full name" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} /></div><div className="grid grid-cols-2 gap-2"><Input placeholder="Mobile" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} /><Input placeholder="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div><div className="grid grid-cols-2 gap-2"><Input placeholder="Date of birth" type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} /><Input placeholder="Gender" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} /></div><Input placeholder="National ID" value={form.nationalId} onChange={e => setForm(p => ({ ...p, nationalId: e.target.value }))} /><Input placeholder="Emergency contact" value={form.emergContact} onChange={e => setForm(p => ({ ...p, emergContact: e.target.value }))} /><Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={savePatient}>{editing ? "Update Patient" : "Save Patient"}</Button></div></DialogContent></Dialog>
    </div>
  )
}

// ─── Bookings Tab ─────────────────────────────────────────────────────────────
function BookingsTab() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))

  useEffect(() => {
    setLoading(true)
    fetch(`/api/hospital/chemo?date=${date}`)
      .then(r => r.json())
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [date])

  const statusColor: Record<string, string> = {
    CONFIRMED: "bg-blue-100 text-blue-700",
    CHECKED_IN: "bg-emerald-100 text-emerald-700",
    COMPLETED: "bg-stone-100 text-stone-600",
    CANCELLED: "bg-rose-100 text-rose-600",
    OCCUPIED: "bg-amber-100 text-amber-700",
  }

  const update = async (id: string, status: string) => {
    await fetch(`/api/hospital/chemo/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    toast.success("Updated")
    const res = await fetch(`/api/hospital/chemo?date=${date}`)
    const data = await res.json()
    setBookings(Array.isArray(data) ? data : [])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40 h-8 text-xs" />
        <span className="text-sm text-stone-500">{bookings.length} bookings</span>
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : bookings.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-stone-400">No chemotherapy bookings for this date</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {bookings.map(b => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-stone-500">{b.bookingRef}</span>
                      <Badge className={statusColor[b.status] || "bg-stone-100 text-stone-600"}>{b.status}</Badge>
                    </div>
                    <div className="font-semibold mt-1">{b.patient?.fullName}</div>
                    <div className="text-sm text-stone-500">MRN: {b.patient?.mrn}</div>
                    <div className="flex gap-3 mt-1 text-xs text-stone-500">
                      <span>🛏️ {b.bed?.bedNumber} · {b.bed?.ward?.name}</span>
                      {b.session && <span>⏰ {b.session.name}</span>}
                      <span>👨‍⚕️ {b.doctor?.name}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {b.status === "CONFIRMED" && (
                      <Button size="sm" variant="outline" className="text-emerald-600 text-xs h-7" onClick={() => update(b.id, "CHECKED_IN")}>
                        Check In
                      </Button>
                    )}
                    {b.status === "CHECKED_IN" && (
                      <Button size="sm" variant="outline" className="text-blue-600 text-xs h-7" onClick={() => update(b.id, "TREATMENT_STARTED")}>
                        Start Tx
                      </Button>
                    )}
                    {b.status === "TREATMENT_STARTED" && (
                      <Button size="sm" variant="outline" className="text-stone-600 text-xs h-7" onClick={() => update(b.id, "COMPLETED")}>
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


// ─── Calendar Tab ────────────────────────────────────────────────────────────
function CalendarTab() {
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), "yyyy-MM"))
  const [events, setEvents] = useState<Record<string, { chemo: any[]; doctor: any[]; total: number }>>({})
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), "yyyy-MM-dd"))

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/hospital/calendar?month=${currentMonth}`)
      .then(r => r.json())
      .then(d => {
        setEvents(d.eventsByDate || {})
        setStats(d.stats || {})
      })
      .catch(() => { setEvents({}); setStats({}) })
      .finally(() => setLoading(false))
  }, [currentMonth])

  useEffect(() => { load() }, [load])

  const [year, month] = currentMonth.split("-").map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0 = Sunday

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1)
    setCurrentMonth(format(d, "yyyy-MM"))
  }
  const nextMonth = () => {
    const d = new Date(year, month, 1)
    setCurrentMonth(format(d, "yyyy-MM"))
  }
  const goToday = () => {
    setCurrentMonth(format(new Date(), "yyyy-MM"))
    setSelectedDate(format(new Date(), "yyyy-MM-dd"))
  }

  const selectedDayEvents = selectedDate && events[selectedDate] ? events[selectedDate] : null

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-lg">
              {format(new Date(year, month - 1, 1), "MMMM yyyy")}
            </h3>
            <p className="text-xs text-stone-500">
              {stats.totalChemoMonth || 0} Chemo Sessions · {stats.totalDoctorMonth || 0} Doctor Apts · {stats.activeDays || 0} Active Days
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 text-xs">
            <ChevronLeft className="h-4 w-4 mr-0.5" /> Prev
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className="h-8 text-xs">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 text-xs">
            Next <ChevronRight className="h-4 w-4 ml-0.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={load} className="h-8 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-4">
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-stone-400 pb-2 border-b">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {/* Empty offset padding */}
            {[...Array(firstDayOfWeek)].map((_, i) => (
              <div key={`empty-${i}`} className="h-20 sm:h-24 rounded-lg bg-stone-50/50" />
            ))}

            {/* Month Day Cells */}
            {[...Array(daysInMonth)].map((_, i) => {
              const dayNum = i + 1
              const dStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
              const dayData = events[dStr]
              const isSelected = selectedDate === dStr
              const isToday = dStr === format(new Date(), "yyyy-MM-dd")

              return (
                <button
                  key={dStr}
                  onClick={() => setSelectedDate(dStr)}
                  className={`h-20 sm:h-24 p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all hover:border-blue-400 cursor-pointer ${
                    isSelected
                      ? "border-blue-600 ring-2 ring-blue-100 bg-blue-50/30"
                      : isToday
                      ? "border-amber-400 bg-amber-50/20"
                      : "border-stone-200 bg-white hover:bg-stone-50/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isToday ? "bg-amber-500 text-white px-1.5 py-0.5 rounded-full" : "text-stone-700"}`}>
                      {dayNum}
                    </span>
                    {dayData && (
                      <span className="text-[10px] font-bold text-stone-400">
                        {dayData.total}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    {dayData && dayData.chemo.length > 0 && (
                      <div className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 px-1 py-0.5 rounded truncate font-medium">
                        💊 {dayData.chemo.length} Chemo
                      </div>
                    )}
                    {dayData && dayData.doctor.length > 0 && (
                      <div className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.5 rounded truncate font-medium">
                        🩺 {dayData.doctor.length} Doctor
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Day Side Panel */}
        <div className="bg-white rounded-xl border p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">
                  {selectedDate ? format(new Date(selectedDate), "EEEE, d MMMM yyyy") : "Select a date"}
                </h4>
                <p className="text-xs text-stone-500">
                  {selectedDayEvents ? `${selectedDayEvents.total} Scheduled Patients` : "No bookings for this date"}
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                Kauvery Day Care
              </Badge>
            </div>

            <div className="space-y-3 pt-3 max-h-[460px] overflow-y-auto pr-1">
              {!selectedDayEvents || selectedDayEvents.total === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs">
                  <BedDouble className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No patients booked on this day.
                </div>
              ) : (
                <>
                  {/* Chemo Sessions */}
                  {selectedDayEvents.chemo.map(c => (
                    <div key={c.id} className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 text-xs">{c.patientName}</span>
                        <Badge className="bg-rose-100 text-rose-700 border-0 text-[10px]">Bed {c.bedNumber}</Badge>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        MRN: {c.mrn} · {c.sessionTime}
                      </div>
                      <div className="text-[11px] text-stone-600 flex items-center justify-between pt-1 border-t border-rose-100">
                        <span>👨‍⚕️ {c.doctorName || "Dr. Ahmed Khan"}</span>
                        <Badge variant="outline" className="text-[9px]">{c.wardName || "Ward"}</Badge>
                      </div>
                    </div>
                  ))}

                  {/* Doctor Appointments */}
                  {selectedDayEvents.doctor.map(d => (
                    <div key={d.id} className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 text-xs">{d.patientName}</span>
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">{d.startTime} - {d.endTime}</Badge>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        MRN: {d.mrn} · {d.mobile}
                      </div>
                      <div className="text-[11px] text-stone-600 flex items-center justify-between pt-1 border-t border-blue-100">
                        <span>👨‍⚕️ {d.doctorName}</span>
                        <Badge variant="outline" className="text-[9px]">{d.specialization || "Oncology"}</Badge>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => window.open("/hospital/book", "_blank")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Book New Session for this Date
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main HospitalView ────────────────────────────────────────────────────────
export default function HospitalView() {
  const [tab, setTab] = useState<Tab>("dashboard")

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "dashboard", label: "Dashboard", icon: Activity },
    { key: "calendar", label: "Calendar", icon: CalendarDays },
    { key: "bed-map", label: "Bed Map (30 Beds)", icon: BedDouble },
    { key: "therapies", label: "Services & Therapies", icon: HeartPulse },
    { key: "reminders", label: "Reminders & Alerts", icon: BellRing },
    { key: "bookings", label: "Bookings", icon: CalendarClock },
    { key: "doctors", label: "Doctors", icon: Stethoscope },
    { key: "patients", label: "Patients", icon: Users },
    { key: "permissions", label: "Permissions", icon: ShieldCheck },
  ]

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            Kauvery Hospital
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">Chemotherapy Day Care (30 Beds), Oncology Therapies &amp; Doctor Appointments</p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.open("/hospital/book", "_blank")}
          className="text-blue-600 border-blue-200"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />Patient Booking Portal
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-stone-500 hover:text-stone-900"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "dashboard" && <DashboardTab />}
      {tab === "calendar" && <CalendarTab />}
      {tab === "bed-map" && <BedMapTab />}
      {tab === "therapies" && <TherapiesTab />}
      {tab === "reminders" && <RemindersTab />}
      {tab === "bookings" && <BookingsTab />}
      {tab === "doctors" && <DoctorsTab />}
      {tab === "patients" && <PatientsTab />}
      {tab === "permissions" && <PermissionsTab />}
    </div>
  )
}
