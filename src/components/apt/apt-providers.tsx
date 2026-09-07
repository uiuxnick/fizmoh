"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, User, Clock, Calendar, Check, Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function AptProvidersManager() {
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProvider, setEditingProvider] = useState<any | null>(null)
  const [scheduleProvider, setScheduleProvider] = useState<any | null>(null)

  const load = () => {
    setLoading(true)
    fetch("/api/apt/providers")
      .then(r => r.json())
      .then(d => { setProviders(d.providers || []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-stone-800">Staff & Providers</h3>
          <p className="text-xs text-stone-500">Manage healthcare professionals, trainers, consultants, and their weekly working hours schedules.</p>
        </div>
        <Button size="sm" onClick={() => setEditingProvider({})} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
          <Plus className="h-4 w-4 mr-1" /> Add Provider
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {providers.map(p => (
          <Card key={p.id} className="border-stone-200 hover:border-stone-300 transition-all">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-600 text-sm border">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-stone-800 text-sm">{p.name}</h4>
                  <p className="text-xs text-stone-500">{p.role} {p.specialty ? `· ${p.specialty}` : ""}</p>
                </div>
              </div>

              {p.providerServices && p.providerServices.length > 0 && (
                <div className="text-xs text-stone-600 bg-stone-50 p-2 rounded border">
                  <span className="font-medium">Services: </span>
                  {p.providerServices.map((ps: any) => ps.service?.name).join(", ")}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t text-xs">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setScheduleProvider(p)}>
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Working Hours
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingProvider(p)}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingProvider && (
        <ProviderEditorModal
          provider={editingProvider}
          onClose={() => setEditingProvider(null)}
          onSaved={() => { setEditingProvider(null); load() }}
        />
      )}

      {scheduleProvider && (
        <ScheduleEditorModal
          provider={scheduleProvider}
          onClose={() => setScheduleProvider(null)}
          onSaved={() => { setScheduleProvider(null); load() }}
        />
      )}
    </div>
  )
}

function ProviderEditorModal({ provider, onClose, onSaved }: { provider: any; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(provider.name || "")
  const [role, setRole] = useState(provider.role || "Provider")
  const [specialty, setSpecialty] = useState(provider.specialty || "")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = provider.id ? `/api/apt/providers/${provider.id}` : "/api/apt/providers"
      const method = provider.id ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, specialty }),
      })

      if (res.ok) {
        toast.success("Provider saved")
        onSaved()
      } else {
        toast.error("Failed to save provider")
      }
    } catch {
      toast.error("Error saving provider")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{provider.id ? "Edit Provider" : "New Provider"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs py-1">
          <div>
            <Label className="text-xs">Full Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required className="mt-1 h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Role (e.g. Doctor, Trainer, Consultant)</Label>
            <Input value={role} onChange={e => setRole(e.target.value)} className="mt-1 h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Specialty (Optional)</Label>
            <Input value={specialty} onChange={e => setSpecialty(e.target.value)} className="mt-1 h-8 text-xs" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
              Save Provider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ScheduleEditorModal({ provider, onClose, onSaved }: { provider: any; onClose: () => void; onSaved: () => void }) {
  const [schedules, setSchedules] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/apt/providers/${provider.id}/schedule`)
      .then(r => r.json())
      .then(d => {
        const existing = d.schedules || []
        const full: any[] = []
        for (let day = 0; day <= 6; day++) {
          const found = existing.find((s: any) => s.dayOfWeek === day)
          if (found) {
            let shifts = [{ start: "09:00", end: "17:00" }]
            try { shifts = JSON.parse(found.shiftsJson || "[]") } catch {}
            full.push({ dayOfWeek: day, isWorkingDay: found.isWorkingDay, shifts })
          } else {
            full.push({ dayOfWeek: day, isWorkingDay: day >= 1 && day <= 5, shifts: [{ start: "09:00", end: "17:00" }] })
          }
        }
        setSchedules(full)
      })
  }, [provider.id])

  const toggleDay = (index: number) => {
    setSchedules(sc => sc.map((s, i) => i === index ? { ...s, isWorkingDay: !s.isWorkingDay } : s))
  }

  const updateShift = (index: number, start: string, end: string) => {
    setSchedules(sc => sc.map((s, i) => i === index ? { ...s, shifts: [{ start, end }] } : s))
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/apt/providers/${provider.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules }),
      })
      if (res.ok) {
        toast.success("Schedule saved successfully")
        onSaved()
      } else {
        toast.error("Failed to save schedule")
      }
    } catch {
      toast.error("Error saving schedule")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Working Hours: {provider.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2 text-xs">
          {schedules.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 bg-stone-50 border rounded-lg">
              <div className="flex items-center gap-3 w-32">
                <Switch checked={s.isWorkingDay} onCheckedChange={() => toggleDay(idx)} />
                <span className={`font-medium ${s.isWorkingDay ? "text-stone-800" : "text-stone-400 line-through"}`}>
                  {DAYS[s.dayOfWeek]}
                </span>
              </div>
              {s.isWorkingDay ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={s.shifts[0]?.start || "09:00"}
                    onChange={e => updateShift(idx, e.target.value, s.shifts[0]?.end || "17:00")}
                    className="h-7 text-xs w-28"
                  />
                  <span>to</span>
                  <Input
                    type="time"
                    value={s.shifts[0]?.end || "17:00"}
                    onChange={e => updateShift(idx, s.shifts[0]?.start || "09:00", e.target.value)}
                    className="h-7 text-xs w-28"
                  />
                </div>
              ) : (
                <span className="text-stone-400 text-xs italic">Closed</span>
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            Save Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
