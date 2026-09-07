"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Calendar, CalendarCheck, CheckCircle2, Clock, XCircle, UserX, PlusCircle } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"

interface AptStatsProps {
  stats: {
    total: number
    today: number
    confirmed: number
    completed: number
    cancelled: number
    noShow: number
    whatsapp: number
    manual: number
  }
  onFilterStatus?: (status: string) => void
}

export function AptStats({ stats, onFilterStatus }: AptStatsProps) {
  const cards = [
    { label: "Today's Appts", value: stats.today, icon: CalendarCheck, color: "text-amber-600 bg-amber-50", filter: "all" },
    { label: "Confirmed", value: stats.confirmed, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50", filter: "CONFIRMED" },
    { label: "Completed", value: stats.completed, icon: Clock, color: "text-sky-600 bg-sky-50", filter: "COMPLETED" },
    { label: "Cancelled", value: stats.cancelled, icon: XCircle, color: "text-rose-600 bg-rose-50", filter: "CANCELLED" },
    { label: "No-Show", value: stats.noShow, icon: UserX, color: "text-stone-600 bg-stone-100", filter: "NO_SHOW" },
    { label: "WhatsApp Bookings", value: stats.whatsapp, icon: WhatsAppIcon, color: "text-teal-600 bg-teal-50", filter: "all" },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <Card
            key={i}
            className="cursor-pointer hover:shadow-sm transition-shadow border-stone-200"
            onClick={() => onFilterStatus?.(c.filter)}
          >
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500 font-medium">{c.label}</p>
                <h4 className="text-xl font-bold text-stone-800 mt-1">{c.value}</h4>
              </div>
              <div className={`p-2 rounded-lg ${c.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
