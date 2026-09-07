"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Calendar, Clock, User, Phone, Mail, CheckCircle, XCircle,
  RefreshCw, AlertCircle, ExternalLink, Video, MapPin, Building
} from "lucide-react"
import { toast } from "sonner"

interface AptDetailProps {
  appointment: any
  onClose: () => void
  onUpdate: () => void
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  CONFIRMED: { label: "Confirmed", style: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  COMPLETED: { label: "Completed", style: "bg-sky-100 text-sky-800 border-sky-200" },
  CANCELLED: { label: "Cancelled", style: "bg-rose-100 text-rose-800 border-rose-200" },
  NO_SHOW: { label: "No-Show", style: "bg-stone-100 text-stone-700 border-stone-200" },
  RESCHEDULED: { label: "Rescheduled", style: "bg-purple-100 text-purple-800 border-purple-200" },
  PENDING_PAYMENT: { label: "Pending Payment", style: "bg-amber-100 text-amber-800 border-amber-200" },
}

export function AptDetailDrawer({ appointment, onClose, onUpdate }: AptDetailProps) {
  const [loading, setLoading] = useState(false)

  if (!appointment) return null

  const dateStr = new Date(appointment.appointmentDate).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  })

  const statusInfo = STATUS_CONFIG[appointment.status] || { label: appointment.status, style: "bg-stone-100 text-stone-700" }

  const handleAction = async (action: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/apt/appointments/${appointment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        toast.success(`Appointment marked as ${action.toLowerCase()}`)
        onUpdate()
        onClose()
      } else {
        toast.error("Failed to update status")
      }
    } catch {
      toast.error("Error updating appointment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold">
                Appointment #{appointment.reference}
              </DialogTitle>
              <p className="text-xs text-stone-500 mt-0.5">
                Booked via {appointment.bookingSource} · {new Date(appointment.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
            <Badge className={statusInfo.style}>{statusInfo.label}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm py-2">
          {/* Customer Info */}
          <div className="bg-stone-50 p-3.5 rounded-lg border border-stone-100 space-y-2">
            <h4 className="font-semibold text-stone-700 text-xs uppercase tracking-wider">Customer Profile</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-stone-400" />
                <span className="font-medium">{appointment.customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-stone-400" />
                <a href={`https://wa.me/${appointment.customerPhone?.replace(/\D/g, "")}`} target="_blank" className="text-emerald-600 hover:underline">
                  {appointment.customerPhone}
                </a>
              </div>
              {appointment.customerEmail && (
                <div className="flex items-center gap-2 col-span-2">
                  <Mail className="h-4 w-4 text-stone-400" />
                  <span>{appointment.customerEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Appointment Info */}
          <div className="space-y-2">
            <h4 className="font-semibold text-stone-700 text-xs uppercase tracking-wider">Service & Schedule</h4>
            <div className="grid grid-cols-2 gap-3 border p-3 rounded-lg">
              <div>
                <p className="text-xs text-stone-500">Service</p>
                <p className="font-medium text-stone-800">{appointment.service?.name}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Provider</p>
                <p className="font-medium text-stone-800">{appointment.provider?.name || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Date</p>
                <p className="font-medium text-stone-800">{dateStr}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Time</p>
                <p className="font-medium text-stone-800">{appointment.startTime} - {appointment.endTime} ({appointment.durationMins}m)</p>
              </div>
              {appointment.branch && (
                <div className="col-span-2">
                  <p className="text-xs text-stone-500">Location / Branch</p>
                  <p className="font-medium text-stone-800">{appointment.branch.name}</p>
                </div>
              )}
              {appointment.meetLink && (
                <div className="col-span-2 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
                  <p className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 text-emerald-600" /> Google Meet Video Session
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href={appointment.meetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                    >
                      <Video className="h-3.5 w-3.5" /> Join Google Meet Call
                    </a>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(appointment.meetLink); toast.success("Google Meet link copied to clipboard!") }}
                      className="text-xs text-emerald-800 hover:underline px-2 py-1 bg-white border border-emerald-200 rounded-lg"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
            <div>
              <p className="text-xs text-stone-500">Payment Status</p>
              <p className="font-semibold text-stone-800">{appointment.paymentStatus}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500">Total Fee</p>
              <p className="text-base font-bold text-emerald-700">{appointment.totalAmount} {appointment.service?.currency || "OMR"}</p>
            </div>
          </div>

          {appointment.notes && (
            <div>
              <p className="text-xs text-stone-500 mb-1">Internal Notes</p>
              <p className="p-2.5 bg-stone-50 border rounded-lg text-xs text-stone-700">{appointment.notes}</p>
            </div>
          )}

          {/* Status Timeline History */}
          {appointment.history && appointment.history.length > 0 && (
            <div>
              <h4 className="font-semibold text-stone-700 text-xs uppercase tracking-wider mb-2">History & Audit Trail</h4>
              <div className="space-y-1.5 border-l-2 border-stone-200 pl-3">
                {appointment.history.map((h: any) => (
                  <div key={h.id} className="text-xs">
                    <span className="font-medium text-stone-800">{h.statusTo}</span>
                    <span className="text-stone-400"> · {new Date(h.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                    {h.notes && <p className="text-stone-500">{h.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction("CANCEL")}
            disabled={loading || appointment.status === "CANCELLED"}
            className="text-rose-600 hover:bg-rose-50"
          >
            <XCircle className="h-4 w-4 mr-1" /> Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("NO_SHOW")}
              disabled={loading || appointment.status === "NO_SHOW"}
            >
              No-Show
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("COMPLETE")}
              disabled={loading || appointment.status === "COMPLETED"}
              className="text-sky-600 border-sky-200 hover:bg-sky-50"
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Complete
            </Button>
            <Button
              size="sm"
              onClick={() => handleAction("CONFIRM")}
              disabled={loading || appointment.status === "CONFIRMED"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
