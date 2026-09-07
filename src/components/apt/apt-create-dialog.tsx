"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { localDateKey } from "@/lib/timezone"

interface AptCreateDialogProps {
  onClose: () => void
  onCreated: () => void
}

export function AptCreateDialog({ onClose, onCreated }: AptCreateDialogProps) {
  const [services, setServices] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    serviceId: "",
    providerId: "",
    date: localDateKey(new Date()),
    startTime: "10:00",
    notes: "",
  })

  useEffect(() => {
    fetch("/api/apt/services")
      .then(r => r.json())
      .then(d => setServices(d.services || []))

    fetch("/api/apt/providers")
      .then(r => r.json())
      .then(d => setProviders(d.providers || []))
  }, [])

  // Fetch slots whenever service or date changes
  useEffect(() => {
    if (!form.serviceId || !form.date) return
    setLoadingSlots(true)
    fetch(`/api/apt/availability?serviceId=${form.serviceId}&date=${form.date}&providerId=${form.providerId || ""}`)
      .then(r => r.json())
      .then(d => {
        setSlots(d.slots || [])
        if (d.slots?.length > 0 && !d.slots.some((s: any) => s.time === form.startTime)) {
          const firstAvail = d.slots.find((s: any) => s.available)
          if (firstAvail) setForm(f => ({ ...f, startTime: firstAvail.time }))
        }
      })
      .finally(() => setLoadingSlots(false))
  }, [form.serviceId, form.date, form.providerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customerName || !form.customerPhone || !form.serviceId || !form.date || !form.startTime) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/apt/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bookingSource: "MANUAL",
        }),
      })

      if (res.ok) {
        toast.success("Appointment created successfully!")
        onCreated()
        onClose()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to create appointment")
      }
    } catch {
      toast.error("Error creating appointment")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs py-1">
          <div>
            <Label className="text-xs">Customer Name *</Label>
            <Input
              value={form.customerName}
              onChange={e => setForm({ ...form, customerName: e.target.value })}
              placeholder="Full Name"
              required
              className="mt-1 h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">WhatsApp Phone *</Label>
              <Input
                value={form.customerPhone}
                onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                placeholder="+968 91234567"
                required
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Email (Optional)</Label>
              <Input
                type="email"
                value={form.customerEmail}
                onChange={e => setForm({ ...form, customerEmail: e.target.value })}
                placeholder="name@example.com"
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Service *</Label>
            <Select value={form.serviceId} onValueChange={v => setForm({ ...form, serviceId: v })}>
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue placeholder="Select Service" />
              </SelectTrigger>
              <SelectContent>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.durationMins}m · {s.price > 0 ? `${s.price} ${s.currency}` : "Free"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Provider (Optional)</Label>
            <Select value={form.providerId} onValueChange={v => setForm({ ...form, providerId: v })}>
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue placeholder="Any Available Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Available</SelectItem>
                {providers.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="mt-1 h-8 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Time Slot *</Label>
              <Select value={form.startTime} onValueChange={v => setForm({ ...form, startTime: v })}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder={loadingSlots ? "Loading..." : "Select Time"} />
                </SelectTrigger>
                <SelectContent>
                  {slots.length === 0 ? (
                    <SelectItem value="10:00">10:00 AM (Default)</SelectItem>
                  ) : (
                    slots.map(s => (
                      <SelectItem key={s.time} value={s.time} disabled={!s.available}>
                        {s.time} {!s.available ? `(${s.reason || "unavailable"})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional appointment details..."
              className="mt-1 text-xs min-h-[60px]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting ? "Booking..." : "Create Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
