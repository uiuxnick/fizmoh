"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Clock, DollarSign, Check, X } from "lucide-react"
import { toast } from "sonner"

export function AptServicesManager() {
  const [services, setServices] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/apt/services").then(r => r.json()),
      fetch("/api/apt/providers").then(r => r.json()),
    ]).then(([sData, pData]) => {
      setServices(sData.services || [])
      setProviders(pData.providers || [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return
    const res = await fetch(`/api/apt/services/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Service deleted")
      load()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-stone-800">Digital Marketing Services &amp; Strategy Packages</h3>
          <p className="text-xs text-stone-500">Configure digital marketing appointment types, Google Meet video consultations, duration, pricing, and assigned consultants.</p>
        </div>
        <Button size="sm" onClick={() => { setEditing({}); setIsCreating(true) }} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
          <Plus className="h-4 w-4 mr-1" /> Add Service
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map(s => (
          <Card key={s.id} className="border-stone-200 hover:border-stone-300 transition-all">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-stone-800 text-sm">{s.name}</h4>
                  {s.nameAr && <p className="text-xs text-stone-400 font-arabic">{s.nameAr}</p>}
                </div>
                <Badge variant={s.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px]">
                  {s.status}
                </Badge>
              </div>

              {s.description && (
                <p className="text-xs text-stone-600 line-clamp-2">{s.description}</p>
              )}

              <div className="flex items-center justify-between text-xs pt-2 border-t text-stone-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-stone-400" />
                  <span>{s.durationMins}m (+{s.bufferMins}m buffer)</span>
                </div>
                <div className="font-bold text-emerald-700">
                  {s.price > 0 ? `${s.price} ${s.currency}` : "Free"}
                </div>
              </div>

              {s.providerServices && s.providerServices.length > 0 && (
                <div className="text-[11px] text-stone-500">
                  Providers: {s.providerServices.map((ps: any) => ps.provider?.name).join(", ")}
                </div>
              )}

              <div className="flex items-center justify-end gap-1.5 pt-2">
                <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => { setEditing(s); setIsCreating(false) }}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <ServiceEditorModal
          service={editing}
          providers={providers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function ServiceEditorModal({ service, providers, onClose, onSaved }: { service: any; providers: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: service.name || "",
    nameAr: service.nameAr || "",
    description: service.description || "",
    durationMins: service.durationMins || 30,
    bufferMins: service.bufferMins || 0,
    price: service.price || 0,
    currency: service.currency || "OMR",
    onlineInPerson: service.onlineInPerson || "IN_PERSON",
    providerIds: service.providerServices?.map((ps: any) => ps.providerId) || [],
  })

  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = service.id ? `/api/apt/services/${service.id}` : "/api/apt/services"
      const method = service.id ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        toast.success("Service saved successfully")
        onSaved()
      } else {
        toast.error("Failed to save service")
      }
    } catch {
      toast.error("Error saving service")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{service.id ? "Edit Service" : "New Service"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs py-1">
          <div>
            <Label className="text-xs">Service Name *</Label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. General Consultation"
              required
              className="mt-1 h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Duration (mins) *</Label>
              <Input
                type="number"
                value={form.durationMins}
                onChange={e => setForm({ ...form, durationMins: Number(e.target.value) })}
                className="mt-1 h-8 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Buffer Time (mins)</Label>
              <Input
                type="number"
                value={form.bufferMins}
                onChange={e => setForm({ ...form, bufferMins: Number(e.target.value) })}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Price</Label>
              <Input
                type="number"
                value={form.price}
                onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Currency</Label>
              <Input
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="mt-1 text-xs min-h-[60px]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {saving ? "Saving..." : "Save Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
