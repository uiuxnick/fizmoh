"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Stethoscope, Heart, Sparkles, User, Calendar, Clock, CheckCircle2,
  ChevronRight, ChevronLeft, ShieldCheck, MapPin, CreditCard, AlertCircle, Phone, Mail, UserCheck
} from "lucide-react"
import { toast } from "sonner"
import { localDateKey } from "@/lib/timezone"

interface BookingWizardProps {
  onClose: () => void
  onSuccess: () => void
}

export function AptBookingWizard({ onClose, onSuccess }: BookingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)

  // Data sources
  const [categories, setCategories] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([])

  // Selections
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedService, setSelectedService] = useState<any | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(localDateKey(new Date()))
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null)

  // Customer & Intake form
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [problemDescription, setProblemDescription] = useState("")
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(true)
  const [notes, setNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "BANK" | "IN_PERSON">("CARD")

  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch services and providers
  useEffect(() => {
    fetch("/api/apt/services")
      .then(r => r.json())
      .then(d => {
        const svcs = d.services || []
        setServices(svcs)

        // Extract categories
        const cats = Array.from(new Set(svcs.map((s: any) => s.category?.name).filter(Boolean)))
        setCategories(cats)
      })

    fetch("/api/apt/providers")
      .then(r => r.json())
      .then(d => setProviders(d.providers || []))
  }, [])

  // Fetch slots when service, date, or provider changes
  useEffect(() => {
    if (!selectedService || !selectedDate) return
    setLoadingSlots(true)
    const prvId = selectedProvider?.id || ""
    fetch(`/api/apt/availability?serviceId=${selectedService.id}&date=${selectedDate}&providerId=${prvId}`)
      .then(r => r.json())
      .then(d => {
        setSlots(d.slots || [])
        setSelectedSlot(null)
      })
      .finally(() => setLoadingSlots(false))
  }, [selectedService, selectedDate, selectedProvider])

  const filteredServices = selectedCategory === "all"
    ? services
    : services.filter(s => s.category?.name === selectedCategory)

  // Available slots split by morning, afternoon, evening
  const morningSlots = slots.filter(s => s.available && Number(s.time.split(":")[0]) < 12)
  const afternoonSlots = slots.filter(s => s.available && Number(s.time.split(":")[0]) >= 12 && Number(s.time.split(":")[0]) < 16)
  const eveningSlots = slots.filter(s => s.available && Number(s.time.split(":")[0]) >= 16)

  const handleFinalSubmit = async () => {
    if (!customerName || !customerPhone || !selectedService || !selectedDate || !selectedSlot) {
      toast.error("Please complete all required steps")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/apt/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          serviceId: selectedService.id,
          providerId: selectedProvider?.id,
          date: selectedDate,
          startTime: selectedSlot.time,
          durationMins: selectedService.durationMins,
          notes: `Problem/Therapy Reason: ${problemDescription}\nFirst Visit: ${isFirstVisit ? "Yes" : "No"}\n${notes}`,
          bookingSource: "ADMIN_WIZARD",
        }),
      })

      if (res.ok) {
        toast.success("Appointment booked successfully!")
        onSuccess()
        onClose()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to book appointment")
      }
    } catch {
      toast.error("Error submitting appointment")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Wizard Header */}
        <div className="bg-stone-900 text-white p-5 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Create Booking Flow</h3>
                <p className="text-xs text-stone-400">Step-by-step therapy, service & slot booking wizard</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-2.5 py-1">
              Step {step} of 5
            </Badge>
          </div>

          {/* Progress Indicator */}
          <div className="grid grid-cols-5 gap-2 mt-4">
            {[
              { id: 1, label: "Therapy / Service" },
              { id: 2, label: "Provider" },
              { id: 3, label: "Intake & Reason" },
              { id: 4, label: "Date & Slot" },
              { id: 5, label: "Confirm & Pay" },
            ].map(s => (
              <div key={s.id} className="space-y-1">
                <div className={`h-1.5 rounded-full transition-all ${
                  step >= s.id ? "bg-emerald-400" : "bg-stone-700"
                }`} />
                <span className={`text-[10px] block truncate ${
                  step === s.id ? "text-emerald-400 font-semibold" : "text-stone-400"
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 space-y-4">
          {/* STEP 1: SERVICE / THERAPY SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-base">Select Therapy or Service</h4>
                  <p className="text-xs text-stone-500">Choose the consultation, treatment, or therapy package.</p>
                </div>
                {categories.length > 0 && (
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                    <Button
                      variant={selectedCategory === "all" ? "default" : "ghost"}
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => setSelectedCategory("all")}
                    >
                      All
                    </Button>
                    {categories.map((cat: any) => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? "default" : "ghost"}
                        size="sm"
                        className="h-6 text-[11px] px-2"
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredServices.map(s => {
                  const isSelected = selectedService?.id === s.id
                  return (
                    <Card
                      key={s.id}
                      onClick={() => setSelectedService(s)}
                      className={`cursor-pointer transition-all border-2 ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/30 shadow-md ring-1 ring-emerald-500"
                          : "border-stone-200 hover:border-stone-400 hover:shadow-sm"
                      }`}
                    >
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-lg ${isSelected ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>
                              <Stethoscope className="h-4 w-4" />
                            </div>
                            <div>
                              <h5 className="font-bold text-stone-900 text-sm">{s.name}</h5>
                              {s.category && <span className="text-[10px] text-stone-500 font-medium">{s.category.name}</span>}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
                        </div>

                        {s.description && (
                          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">{s.description}</p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t text-xs">
                          <span className="text-stone-500 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> {s.durationMins} mins
                          </span>
                          <span className="font-bold text-emerald-700 text-sm">
                            {s.price > 0 ? `${s.price} ${s.currency}` : "Free"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 2: PROVIDER / SPECIALIST SELECTION */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-stone-900 text-base">Select Provider / Specialist</h4>
                <p className="text-xs text-stone-500">Pick a specific doctor, therapist, or staff member (or choose Any Available).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Option 0: Any Available */}
                <Card
                  onClick={() => setSelectedProvider(null)}
                  className={`cursor-pointer transition-all border-2 ${
                    selectedProvider === null
                      ? "border-emerald-500 bg-emerald-50/30 shadow-md"
                      : "border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-stone-900 text-sm">Any Available Provider</h5>
                        <p className="text-xs text-stone-500">Fastest booking based on schedule</p>
                      </div>
                    </div>
                    {selectedProvider === null && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  </CardContent>
                </Card>

                {providers.map(p => {
                  const isSelected = selectedProvider?.id === p.id
                  return (
                    <Card
                      key={p.id}
                      onClick={() => setSelectedProvider(p)}
                      className={`cursor-pointer transition-all border-2 ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/30 shadow-md"
                          : "border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="font-bold text-stone-900 text-sm">{p.name}</h5>
                            <p className="text-xs text-stone-500">{p.role} {p.specialty ? `· ${p.specialty}` : ""}</p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 3: INTAKE & PROBLEM DESCRIPTION */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-stone-900 text-base">Customer Info & Therapy Reason</h4>
                <p className="text-xs text-stone-500">Enter customer details, primary complaint, or reason for visit.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-xs font-semibold">Customer Full Name *</Label>
                  <Input
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g. Ahmed Sharma"
                    className="mt-1 h-9 text-xs"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">WhatsApp Number *</Label>
                  <Input
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="+968 91234567"
                    className="mt-1 h-9 text-xs"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold">Email Address (Optional)</Label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t text-xs">
                <div>
                  <Label className="text-xs font-semibold">Primary Problem / Therapy Reason / Symptoms *</Label>
                  <Textarea
                    value={problemDescription}
                    onChange={e => setProblemDescription(e.target.value)}
                    placeholder="Describe the complaint, symptoms, or what therapy is needed..."
                    className="mt-1 text-xs min-h-[70px]"
                    required
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-stone-50 border rounded-lg">
                  <div>
                    <p className="font-semibold text-stone-800">Is this a First Visit?</p>
                    <p className="text-[11px] text-stone-500">New patient / client initial intake session</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={isFirstVisit ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIsFirstVisit(true)}
                    >
                      Yes (New)
                    </Button>
                    <Button
                      type="button"
                      variant={!isFirstVisit ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIsFirstVisit(false)}
                    >
                      No (Follow-up)
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Additional Administrative Notes</Label>
                  <Input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Internal staff notes..."
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: DATE & TIME SLOT SELECTION */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-base">Select Date & Available Time Slot</h4>
                  <p className="text-xs text-stone-500">
                    Showing available times for {selectedService?.name} {selectedProvider ? `with ${selectedProvider.name}` : ""}
                  </p>
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-40 h-8 text-xs font-semibold"
                />
              </div>

              {loadingSlots ? (
                <div className="text-center py-10 border rounded-lg text-xs text-stone-500">
                  Loading available time slots...
                </div>
              ) : slots.filter(s => s.available).length === 0 ? (
                <div className="text-center py-10 border rounded-lg bg-rose-50/50 text-rose-700 text-xs">
                  <AlertCircle className="h-5 w-5 mx-auto mb-1 text-rose-500" />
                  No available time slots on {selectedDate}. Please select another date above.
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {morningSlots.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-stone-600 mb-1.5 flex items-center gap-1">
                        🌅 Morning Slots (Before 12 PM)
                      </h5>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {morningSlots.map(s => {
                          const isSel = selectedSlot?.time === s.time
                          return (
                            <Button
                              key={s.time}
                              variant={isSel ? "default" : "outline"}
                              size="sm"
                              className={`h-9 text-xs font-bold ${isSel ? "bg-emerald-600 text-white" : ""}`}
                              onClick={() => setSelectedSlot(s)}
                            >
                              {s.time}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {afternoonSlots.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-stone-600 mb-1.5 flex items-center gap-1">
                        ☀️ Afternoon Slots (12 PM - 4 PM)
                      </h5>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {afternoonSlots.map(s => {
                          const isSel = selectedSlot?.time === s.time
                          return (
                            <Button
                              key={s.time}
                              variant={isSel ? "default" : "outline"}
                              size="sm"
                              className={`h-9 text-xs font-bold ${isSel ? "bg-emerald-600 text-white" : ""}`}
                              onClick={() => setSelectedSlot(s)}
                            >
                              {s.time}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {eveningSlots.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-stone-600 mb-1.5 flex items-center gap-1">
                        🌆 Evening Slots (After 4 PM)
                      </h5>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {eveningSlots.map(s => {
                          const isSel = selectedSlot?.time === s.time
                          return (
                            <Button
                              key={s.time}
                              variant={isSel ? "default" : "outline"}
                              size="sm"
                              className={`h-9 text-xs font-bold ${isSel ? "bg-emerald-600 text-white" : ""}`}
                              onClick={() => setSelectedSlot(s)}
                            >
                              {s.time}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: SUMMARY, PAYMENT & FINAL CONFIRMATION */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-stone-900 text-base">Booking Summary & Confirmation</h4>
                <p className="text-xs text-stone-500">Review appointment details and confirm booking.</p>
              </div>

              <div className="bg-stone-50 border p-4 rounded-lg space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 border-b pb-3">
                  <div>
                    <span className="text-stone-500 text-[11px]">Customer</span>
                    <p className="font-bold text-stone-800 text-sm">{customerName}</p>
                    <p className="text-stone-500">{customerPhone}</p>
                  </div>
                  <div>
                    <span className="text-stone-500 text-[11px]">Service / Therapy</span>
                    <p className="font-bold text-stone-800 text-sm">{selectedService?.name}</p>
                    <p className="text-stone-500">{selectedService?.durationMins} mins duration</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-b pb-3">
                  <div>
                    <span className="text-stone-500 text-[11px]">Provider</span>
                    <p className="font-bold text-stone-800">{selectedProvider?.name || "Any Available Provider"}</p>
                  </div>
                  <div>
                    <span className="text-stone-500 text-[11px]">Scheduled Date & Time</span>
                    <p className="font-bold text-emerald-700">{selectedDate} at {selectedSlot?.time}</p>
                  </div>
                </div>

                <div>
                  <span className="text-stone-500 text-[11px]">Reason / Complaint</span>
                  <p className="p-2 bg-white border rounded text-stone-700 mt-1 font-medium">{problemDescription || "N/A"}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2 pt-1 text-xs">
                <Label className="font-semibold text-xs">Select Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === "CARD" ? "default" : "outline"}
                    className={`h-10 text-xs flex items-center justify-center gap-1.5 ${paymentMethod === "CARD" ? "bg-emerald-600 text-white" : ""}`}
                    onClick={() => setPaymentMethod("CARD")}
                  >
                    <CreditCard className="h-4 w-4" /> Card (AmwalPay Link)
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "BANK" ? "default" : "outline"}
                    className={`h-10 text-xs flex items-center justify-center gap-1.5 ${paymentMethod === "BANK" ? "bg-emerald-600 text-white" : ""}`}
                    onClick={() => setPaymentMethod("BANK")}
                  >
                    Bank Transfer
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "IN_PERSON" ? "default" : "outline"}
                    className={`h-10 text-xs flex items-center justify-center gap-1.5 ${paymentMethod === "IN_PERSON" ? "bg-emerald-600 text-white" : ""}`}
                    onClick={() => setPaymentMethod("IN_PERSON")}
                  >
                    Pay at Clinic / Desk
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="bg-stone-100 p-4 rounded-b-lg flex items-center justify-between border-t">
          {step > 1 ? (
            <Button variant="outline" size="sm" onClick={() => setStep((step - 1) as any)} className="text-xs">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
          )}

          {step < 5 ? (
            <Button
              size="sm"
              disabled={
                (step === 1 && !selectedService) ||
                (step === 3 && (!customerName || !customerPhone || !problemDescription)) ||
                (step === 4 && !selectedSlot)
              }
              onClick={() => setStep((step + 1) as any)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              Next Step <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={submitting}
              onClick={handleFinalSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6"
            >
              {submitting ? "Booking..." : "Confirm & Send WhatsApp Notification"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
