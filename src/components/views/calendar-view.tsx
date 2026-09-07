"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CalendarDays, ChevronLeft, ChevronRight, Users, MapPin, Phone, Download, Baby,
} from "lucide-react"
import { formatCurrency } from "@/lib/helpers"
import { OrderDetail } from "@/components/views/bookings-view"

interface Order {
  id: string; orderNumber: string; customerName: string; customerPhone: string
  paxAdult: number; paxChild: number; paxInfant: number
  orderStatus: string; paymentStatus: string; totalAmount: number
  specialRequests: string | null; pickupLocation: string | null
}

interface Departure {
  id: string; date: string; startTime: string; endTime: string | null
  capacity: number; seatsLeft: number; guests: number; infants: number
  tour: { id: string; name: string; city: string; meetingPoint: string | null; durationHours: number }
  orders: Order[]
}

const STATUS_TONE: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  PAYMENT_SUBMITTED: "bg-teal-100 text-teal-700",
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  CANCELLATION_REQUESTED: "bg-orange-100 text-orange-700",
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

/**
 * The operations calendar.
 *
 * Organised by departure rather than by order, because what a team needs each
 * morning is who is on the 09:00 dhow — not a list of bookings sorted by when
 * they were placed. Departures with nobody on them are left out.
 */
export default function CalendarView() {
  const [cursor, setCursor] = useState(() => new Date())
  const [departures, setDepartures] = useState<Departure[]>([])
  const [totals, setTotals] = useState({ departures: 0, guests: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [openOrder, setOpenOrder] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/calendar?month=${monthKey(cursor)}`)
      .then(r => r.json())
      .then(d => { setDepartures(d.departures || []); setTotals(d.totals || { departures: 0, guests: 0, revenue: 0 }); setLoading(false) })
      .catch(() => setLoading(false))
  }, [cursor])

  useEffect(() => { load() }, [load])

  const byDay = new Map<string, Departure[]>()
  for (const departure of departures) {
    byDay.set(departure.date, [...(byDay.get(departure.date) ?? []), departure])
  }

  // A full month grid, Monday first, including the blanks before the 1st.
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7
  const cells: (string | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`),
  ]

  const today = new Date().toISOString().slice(0, 10)
  const selected = openDay ? byDay.get(openDay) ?? [] : []

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-none space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
            </div>
            Booking Calendar
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {totals.departures} departures · {totals.guests} guests · {formatCurrency(totals.revenue)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[9rem] text-center text-sm font-semibold">
            {cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/calendar/ics?month=${monthKey(cursor)}`} download>
              <Download className="h-3.5 w-3.5 mr-1.5" />Export
            </a>
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                <div key={d} className="text-[11px] font-semibold text-stone-400 text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((date, i) => {
                if (!date) return <div key={`blank-${i}`} />
                const list = byDay.get(date) ?? []
                const guests = list.reduce((sum, d) => sum + d.guests, 0)
                return (
                  <button
                    key={date}
                    onClick={() => list.length && setOpenDay(date)}
                    className={`min-h-[5.5rem] p-1.5 rounded-lg border text-left align-top transition-colors
                      ${date === today ? "border-emerald-400 bg-emerald-50/40" : "border-stone-100"}
                      ${list.length ? "hover:bg-stone-50 cursor-pointer" : "cursor-default"}`}
                  >
                    <div className={`text-xs font-semibold ${date === today ? "text-emerald-700" : "text-stone-600"}`}>
                      {Number(date.slice(-2))}
                    </div>
                    {list.slice(0, 2).map(departure => (
                      <div key={departure.id} className="mt-1 px-1 py-0.5 rounded bg-emerald-600/10 text-[9px] leading-tight text-emerald-800 truncate">
                        {departure.startTime} {departure.tour.name}
                      </div>
                    ))}
                    {list.length > 2 && <div className="text-[9px] text-stone-400 mt-0.5">+{list.length - 2} more</div>}
                    {guests > 0 && (
                      <div className="text-[9px] text-stone-500 mt-0.5 flex items-center gap-0.5">
                        <Users className="h-2.5 w-2.5" />{guests}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {openDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpenDay(null)}>
          <Card className="w-full max-w-2xl max-h-[88vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <div className="text-sm font-semibold">
                {new Date(openDay).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpenDay(null)}>Close</Button>
            </div>
            <ScrollArea className="max-h-[78vh]">
              <div className="p-4 space-y-3">
                {selected.map(departure => (
                  <div key={departure.id} className="rounded-lg border">
                    <div className="p-3 bg-stone-50 border-b">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm text-stone-900">
                          {departure.startTime} · {departure.tour.name}
                        </div>
                        <Badge variant="outline">
                          {departure.guests}/{departure.capacity} seats
                          {departure.infants > 0 && ` · ${departure.infants} infant${departure.infants === 1 ? "" : "s"}`}
                        </Badge>
                      </div>
                      {departure.tour.meetingPoint && (
                        <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />{departure.tour.meetingPoint}
                        </div>
                      )}
                    </div>
                    <div className="divide-y">
                      {departure.orders.map(order => (
                        <button
                          key={order.id}
                          onClick={() => { setOpenOrder(order.id); setOpenDay(null) }}
                          className="w-full p-3 text-xs text-left hover:bg-stone-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-stone-800">{order.customerName}</span>
                            <Badge className={STATUS_TONE[order.orderStatus] || "bg-stone-100 text-stone-600"}>
                              {order.orderStatus.replace(/_/g, " ").toLowerCase()}
                            </Badge>
                          </div>
                          <div className="text-stone-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{order.customerPhone}</span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {order.paxAdult} adult{order.paxAdult === 1 ? "" : "s"}
                              {order.paxChild > 0 && `, ${order.paxChild} child${order.paxChild === 1 ? "" : "ren"}`}
                            </span>
                            {order.paxInfant > 0 && (
                              <span className="flex items-center gap-1 text-amber-700">
                                <Baby className="h-3 w-3" />{order.paxInfant} infant{order.paxInfant === 1 ? "" : "s"}
                              </span>
                            )}
                            <span>{order.orderNumber}</span>
                          </div>
                          {order.pickupLocation && <div className="text-stone-500 mt-0.5">Pickup: {order.pickupLocation}</div>}
                          {order.specialRequests && (
                            <div className="mt-1 px-2 py-1 rounded bg-amber-50 text-amber-800">{order.specialRequests}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      )}

      {/* The same order detail the bookings screen uses, so editing, status
          changes and the payment proof are all available from here too. */}
      {openOrder && (
        <OrderDetail
          orderId={openOrder}
          onClose={() => setOpenOrder(null)}
          onUpdate={load}
        />
      )}
    </div>
  )
}
