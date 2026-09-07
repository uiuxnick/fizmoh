"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, X, Plus } from "lucide-react"
import { localDateKey } from "@/lib/timezone"

interface AptCalendarProps {
  appointments: any[]
  onSelectAppointment: (apt: any) => void
  onNewAppointment: (date?: string) => void
}

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  COMPLETED: "bg-sky-100 text-sky-800 border-sky-300",
  CANCELLED: "bg-rose-100 text-rose-800 border-rose-300",
  NO_SHOW: "bg-stone-100 text-stone-700 border-stone-300",
  RESCHEDULED: "bg-purple-100 text-purple-800 border-purple-300",
}

export function AptCalendarView({ appointments, onSelectAppointment, onNewAppointment }: AptCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month")
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()
  const monthName = currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })

  const navigateMonth = (delta: number) => {
    setSelectedDateKey(null)
    setCurrentDate(new Date(year, month + delta, 1))
  }

  const aptsByDate = new Map<string, any[]>()
  appointments.forEach(a => {
    const dStr = localDateKey(new Date(a.appointmentDate))
    if (!aptsByDate.has(dStr)) aptsByDate.set(dStr, [])
    aptsByDate.get(dStr)!.push(a)
  })

  const selectedDayApts = selectedDateKey ? (aptsByDate.get(selectedDateKey) || []) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-3 border rounded-lg">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="font-bold text-stone-800 text-base ml-2">{monthName}</h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs ml-2" onClick={() => { setCurrentDate(new Date()); setSelectedDateKey(null) }}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
          {(["month", "agenda"] as const).map(mode => (
            <Button
              key={mode}
              variant={viewMode === mode ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => { setViewMode(mode); setSelectedDateKey(null) }}
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      {viewMode === "month" && (
        <div className="space-y-3">
          <Card className="border-stone-200 overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b bg-stone-50 text-center py-2 text-xs font-semibold text-stone-600">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr bg-stone-200 gap-px">
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={"e" + i} className="bg-stone-50/50 min-h-[100px]" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1
                  const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                  const dayApts = aptsByDate.get(dateKey) || []
                  const isToday = localDateKey(new Date()) === dateKey
                  const isSelected = selectedDateKey === dateKey
                  return (
                    <div
                      key={dayNum}
                      className={`bg-white min-h-[100px] p-1.5 flex flex-col transition-colors cursor-pointer ${isToday ? "ring-2 ring-emerald-500 ring-inset" : ""} ${isSelected ? "bg-emerald-50" : "hover:bg-stone-50/80"}`}
                      onClick={() => {
                        if (dayApts.length > 0) {
                          setSelectedDateKey(isSelected ? null : dateKey)
                        } else {
                          onNewAppointment(dateKey)
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${isToday ? "text-emerald-700" : isSelected ? "text-emerald-600" : "text-stone-700"}`}>{dayNum}</span>
                        {dayApts.length > 0 && (
                          <span className={`text-[10px] font-semibold ${isSelected ? "text-emerald-600" : "text-stone-500"}`}>{dayApts.length} apts</span>
                        )}
                      </div>
                      <div className="space-y-0.5 overflow-hidden max-h-[80px]">
                        {dayApts.slice(0, 3).map(apt => (
                          <div
                            key={apt.id}
                            onClick={e => { e.stopPropagation(); onSelectAppointment(apt) }}
                            className={`text-[10px] px-1 py-0.5 rounded border truncate font-medium cursor-pointer hover:opacity-80 ${STATUS_COLOR[apt.status] || "bg-stone-100 text-stone-700"}`}
                          >
                            {apt.startTime} {apt.customerName}
                          </div>
                        ))}
                        {dayApts.length > 3 && (
                          <div className="text-[10px] text-stone-400 pl-1">+{dayApts.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDateKey && selectedDayApts.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-stone-800 text-sm">
                      {new Date(selectedDateKey + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                    </h4>
                    <p className="text-xs text-stone-500">{selectedDayApts.length} appointment{selectedDayApts.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setSelectedDateKey(null); onNewAppointment(selectedDateKey) }}>
                      <Plus className="h-3 w-3 mr-1" /> New
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDateKey(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {[...selectedDayApts]
                    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
                    .map(apt => (
                      <div
                        key={apt.id}
                        onClick={() => onSelectAppointment(apt)}
                        className="flex items-center justify-between bg-white border border-stone-200 rounded-lg p-3 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[48px]">
                            <div className="text-xs font-bold text-emerald-700">{apt.startTime}</div>
                            <div className="text-[10px] text-stone-400">{apt.endTime}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-stone-800 text-sm">{apt.customerName}</div>
                            <div className="text-xs text-stone-500">{apt.service?.name || "Service"} · {apt.provider?.name || "Any Provider"}</div>
                          </div>
                        </div>
                        <Badge className={`text-[10px] font-semibold ${STATUS_COLOR[apt.status] || "bg-stone-100 text-stone-700"}`}>
                          {apt.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {viewMode === "agenda" && (
        <Card className="border-stone-200">
          <CardContent className="p-4 space-y-3">
            {appointments.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-6">No upcoming appointments scheduled.</p>
            ) : (
              [...appointments]
                .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
                .map(apt => (
                  <div
                    key={apt.id}
                    onClick={() => onSelectAppointment(apt)}
                    className="flex items-center justify-between p-3 border rounded-lg hover:border-stone-400 cursor-pointer bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs text-center w-16">
                        <div>{new Date(apt.appointmentDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                        <div className="text-[10px] text-stone-500 font-normal">{apt.startTime}</div>
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-800 text-sm">{apt.customerName}</h4>
                        <p className="text-xs text-stone-500">{apt.service?.name} {apt.provider ? "· " + apt.provider.name : ""}</p>
                      </div>
                    </div>
                    <Badge className={STATUS_COLOR[apt.status] || "bg-stone-100 text-stone-700"}>
                      {apt.status}
                    </Badge>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
