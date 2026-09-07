"use client"

import { useState, useEffect } from "react"
import { AptStats } from "@/components/apt/apt-stats"
import { AptCalendarView } from "@/components/apt/apt-calendar"
import { AptServicesManager } from "@/components/apt/apt-services"
import { AptProvidersManager } from "@/components/apt/apt-providers"
import { AptSettingsManager } from "@/components/apt/apt-settings"
import { AptDetailDrawer } from "@/components/apt/apt-detail-drawer"
import { AptBookingWizard } from "@/components/apt/apt-booking-wizard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  CalendarClock, Search, Plus, Calendar, List, Settings, Briefcase, UserCheck, RefreshCw, Sparkles, Phone, ShieldCheck
} from "lucide-react"

export default function AppointmentModuleMain() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "calendar" | "appointments" | "services" | "providers" | "settings">("dashboard")
  const [appointments, setAppointments] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0, today: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0, whatsapp: 0, manual: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedApt, setSelectedApt] = useState<any | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)

  const load = () => {
    const query = new URLSearchParams()
    if (search) query.set("search", search)
    if (statusFilter !== "all") query.set("status", statusFilter)

    fetch(`/api/apt/appointments?${query.toString()}`)
      .then(r => r.json())
      .then(d => {
        setAppointments(d.appointments || [])
        if (d.stats) setStats(d.stats)
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    window.addEventListener("focus", load)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", load)
    }
  }, [search, statusFilter])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-sm">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">Appointments</h1>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                  Digital Appointments &amp; Video Consultations
                </Badge>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Digital marketing consultations, Google Meet video sessions, strategy calls, and automated WhatsApp appointment reminders.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} className="text-xs border-stone-300">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setWizardOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 px-4"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
            Create Booking Flow
          </Button>
        </div>
      </div>

      {/* Stats Header */}
      <AptStats stats={stats} onFilterStatus={st => { setStatusFilter(st); setActiveTab("appointments") }} />

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b pb-2 text-xs overflow-x-auto">
        {[
          { id: "dashboard", label: "Overview", icon: CalendarClock },
          { id: "calendar", label: "Calendar", icon: Calendar },
          { id: "appointments", label: "Appointments List", icon: List },
          { id: "services", label: "Digital Marketing Services", icon: Briefcase },
          { id: "providers", label: "Providers & Working Hours", icon: UserCheck },
          { id: "settings", label: "Module Settings", icon: Settings },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={`h-8 text-xs transition-all ${
                isActive
                  ? "bg-stone-900 text-white font-medium shadow-sm"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {/* TAB CONTENT */}

      {/* Overview Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-800 text-sm">Recent Appointments</h3>
            <Button size="sm" variant="ghost" className="text-xs text-emerald-700" onClick={() => setActiveTab("appointments")}>
              View All →
            </Button>
          </div>
          <AptTable
            appointments={appointments}
            onSelect={setSelectedApt}
          />
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <AptCalendarView
          appointments={appointments}
          onSelectAppointment={setSelectedApt}
          onNewAppointment={() => setWizardOpen(true)}
        />
      )}

      {/* Appointments List Tab */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search reference, name, phone..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              {["all", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map(st => (
                <Button
                  key={st}
                  variant={statusFilter === st ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[11px] capitalize"
                  onClick={() => setStatusFilter(st)}
                >
                  {st.toLowerCase()}
                </Button>
              ))}
            </div>
          </div>

          <AptTable appointments={appointments} onSelect={setSelectedApt} />
        </div>
      )}

      {/* Services Catalog Tab */}
      {activeTab === "services" && <AptServicesManager />}

      {/* Providers & Working Hours Tab */}
      {activeTab === "providers" && <AptProvidersManager />}

      {/* Settings Tab */}
      {activeTab === "settings" && <AptSettingsManager />}

      {/* Modals & Drawers */}
      {selectedApt && (
        <AptDetailDrawer
          appointment={selectedApt}
          onClose={() => setSelectedApt(null)}
          onUpdate={load}
        />
      )}

      {wizardOpen && (
        <AptBookingWizard
          onClose={() => setWizardOpen(false)}
          onSuccess={load}
        />
      )}
    </div>
  )
}

function AptTable({ appointments, onSelect }: { appointments: any[]; onSelect: (apt: any) => void }) {
  if (appointments.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-xl bg-stone-50/50 text-stone-500 text-xs">
        <CalendarClock className="h-8 w-8 mx-auto mb-2 text-stone-300" />
        No appointments found matching your filters.
      </div>
    )
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-stone-50">
          <TableRow>
            <TableHead className="text-xs font-bold text-stone-700">Ref #</TableHead>
            <TableHead className="text-xs font-bold text-stone-700">Customer</TableHead>
            <TableHead className="text-xs font-bold text-stone-700">Digital Marketing Service</TableHead>
            <TableHead className="text-xs font-bold text-stone-700">Provider</TableHead>
            <TableHead className="text-xs font-bold text-stone-700">Date & Time</TableHead>
            <TableHead className="text-xs font-bold text-stone-700">Source</TableHead>
            <TableHead className="text-xs font-bold text-stone-700">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map(apt => (
            <TableRow
              key={apt.id}
              className="cursor-pointer hover:bg-stone-50 text-xs transition-colors"
              onClick={() => onSelect(apt)}
            >
              <TableCell className="font-mono font-bold text-stone-800">#{apt.reference}</TableCell>
              <TableCell>
                <div className="font-semibold text-stone-800">{apt.customerName}</div>
                <div className="text-[11px] text-stone-400 font-mono">{apt.customerPhone}</div>
              </TableCell>
              <TableCell className="font-medium text-stone-800">{apt.service?.name}</TableCell>
              <TableCell className="text-stone-600">{apt.provider?.name || "Any Provider"}</TableCell>
              <TableCell>
                <div className="font-semibold text-stone-800">
                  {new Date(apt.appointmentDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </div>
                <div className="text-[11px] text-stone-500 font-mono">{apt.startTime} - {apt.endTime}</div>
                {apt.meetLink && (
                  <a
                    href={apt.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200"
                  >
                    🎥 Google Meet
                  </a>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] uppercase font-normal bg-stone-50">
                  {apt.bookingSource}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={`text-[10px] font-semibold ${
                  apt.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                  apt.status === "COMPLETED" ? "bg-sky-100 text-sky-800 border-sky-200" :
                  apt.status === "CANCELLED" ? "bg-rose-100 text-rose-800 border-rose-200" : "bg-stone-100 text-stone-700"
                }`}>
                  {apt.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
