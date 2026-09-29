"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Layers,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import type { Rule } from "@/lib/segments"

interface SegmentBuilderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment?: {
    id: string
    name: string
    channel: string
    filterRules?: any
    parsedRules?: Rule[]
    contactCount?: number
  } | null
  onSaved: (segment: any) => void
  onDeleted?: (id: string) => void
  availableTags?: string[]
  customFieldDefs?: Array<{ key: string; label: string; type: string }>
}

const FIELD_OPTIONS = [
  { value: "tag", label: "🏷️ Tag / Label" },
  { value: "status", label: "✅ Consent / Status" },
  { value: "channel", label: "📱 Channel" },
  { value: "stage", label: "🎯 CRM Stage" },
  { value: "loyaltyTier", label: "⭐ Loyalty Tier" },
  { value: "totalSpent", label: "💰 Total Spent" },
  { value: "totalBookings", label: "📦 Total Bookings" },
  { value: "preferredLang", label: "🌐 Preferred Language" },
  { value: "lastContactAt", label: "🕒 Days Since Last Contact" },
  { value: "customField", label: "🧩 Custom Field" },
]

export function SegmentBuilderModal({
  open,
  onOpenChange,
  segment,
  onSaved,
  onDeleted,
  availableTags = [],
  customFieldDefs = [],
}: SegmentBuilderModalProps) {
  const isEditing = Boolean(segment?.id)

  const [name, setName] = useState("")
  const [channel, setChannel] = useState("ALL")
  const [rules, setRules] = useState<Rule[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Reach evaluation preview
  const [evaluating, setEvaluating] = useState(false)
  const [reach, setReach] = useState<{ count: number; totalReachable: number; sample: any[] } | null>(null)

  // Reset or populate form when opened
  useEffect(() => {
    if (open) {
      if (segment) {
        setName(segment.name || "")
        setChannel(segment.channel || "ALL")
        let parsed: Rule[] = []
        if (segment.parsedRules) {
          parsed = segment.parsedRules
        } else if (typeof segment.filterRules === "string") {
          try {
            parsed = JSON.parse(segment.filterRules)
          } catch {}
        } else if (Array.isArray(segment.filterRules)) {
          parsed = segment.filterRules
        }
        setRules(parsed.length > 0 ? parsed : [{ field: "tag", op: "contains", value: "" }])
      } else {
        setName("")
        setChannel("ALL")
        setRules([{ field: "tag", op: "contains", value: "" }])
      }
    }
  }, [open, segment])

  // Live evaluate rules reach
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setEvaluating(true)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/segments/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, filterRules: rules }),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) {
          setReach(data)
        }
      } catch {
        if (!cancelled) setReach(null)
      } finally {
        if (!cancelled) setEvaluating(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, channel, rules])

  const addRule = () => {
    setRules(prev => [...prev, { field: "tag", op: "contains", value: "" }])
  }

  const removeRule = (idx: number) => {
    setRules(prev => prev.filter((_, i) => i !== idx))
  }

  const updateRule = (idx: number, patch: Partial<Rule>) => {
    setRules(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Please provide a name for this segment")
      return
    }

    setSaving(true)
    try {
      const url = isEditing ? `/api/segments/${segment!.id}` : "/api/segments"
      const method = isEditing ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          channel,
          filterRules: rules,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save segment")

      toast.success(isEditing ? "Segment updated successfully" : "Dynamic segment created")
      onSaved(data.segment)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to save segment")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!segment?.id) return
    if (!confirm(`Are you sure you want to delete the segment "${segment.name}"?`)) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/segments/${segment.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete segment")
      toast.success("Segment deleted")
      if (onDeleted) onDeleted(segment.id)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to delete segment")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-stone-900">
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
            {isEditing ? `Edit Segment: ${segment?.name}` : "Create Smart Dynamic Segment"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 pt-2">
          {/* Segment Name & Channel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Segment Name</Label>
              <Input
                placeholder="e.g. VIP High Spenders, Inactive WhatsApp..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-stone-700">Target Channel</Label>
              <select
                value={channel}
                onChange={e => setChannel(e.target.value)}
                className="w-full h-9 text-xs border border-stone-200 rounded-md px-2.5 bg-white font-medium text-stone-800"
              >
                <option value="ALL">All Channels</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="INSTAGRAM">Instagram</option>
              </select>
            </div>
          </div>

          {/* Rules Builder Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  Filter Conditions (All rules must match)
                </Label>
                <p className="text-[11px] text-stone-500">
                  Subscribers matching all conditions below are automatically enrolled in this segment.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRule}
                className="h-7 text-xs px-2.5 gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Condition
              </Button>
            </div>

            {/* Rules list */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {rules.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-stone-200 text-center text-xs text-stone-400">
                  No conditions defined. All subscribers in the selected channel will be included.
                </div>
              ) : (
                rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs"
                  >
                    {/* Field Selector */}
                    <select
                      value={rule.field.startsWith("customFields.") ? "customField" : rule.field}
                      onChange={e => {
                        const newField = e.target.value
                        let defaultOp = "eq"
                        let defaultValue: any = ""
                        if (newField === "tag") {
                          defaultOp = "contains"
                        } else if (newField === "status") {
                          defaultOp = "eq"
                          defaultValue = "opted_in"
                        } else if (newField === "totalSpent" || newField === "totalBookings") {
                          defaultOp = "gte"
                          defaultValue = "100"
                        } else if (newField === "lastContactAt") {
                          defaultOp = "within_days"
                          defaultValue = "30"
                        } else if (newField === "stage") {
                          defaultValue = "CUSTOMER"
                        } else if (newField === "loyaltyTier") {
                          defaultValue = "GOLD"
                        }
                        updateRule(idx, { field: newField, op: defaultOp, value: defaultValue, key: undefined })
                      }}
                      className="h-8 text-xs border border-stone-200 rounded-lg px-2 bg-white font-medium text-stone-800 shrink-0 w-36"
                    >
                      {FIELD_OPTIONS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>

                    {/* Custom Field Key selector if customField */}
                    {rule.field === "customField" && (
                      <div className="w-32 shrink-0">
                        {customFieldDefs.length > 0 ? (
                          <select
                            value={rule.key || (customFieldDefs[0]?.key ?? "")}
                            onChange={e => updateRule(idx, { key: e.target.value })}
                            className="w-full h-8 text-xs border border-stone-200 rounded-lg px-2 bg-white font-medium text-stone-800"
                          >
                            <option value="">Select Property...</option>
                            {customFieldDefs.map(cf => (
                              <option key={cf.key} value={cf.key}>{cf.label || cf.key}</option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            placeholder="Property Key"
                            value={rule.key || ""}
                            onChange={e => updateRule(idx, { key: e.target.value })}
                            className="h-8 text-xs bg-white"
                          />
                        )}
                      </div>
                    )}

                    {/* Operator Selector */}
                    <select
                      value={rule.op}
                      onChange={e => updateRule(idx, { op: e.target.value })}
                      className="h-8 text-xs border border-stone-200 rounded-lg px-2 bg-white font-medium text-stone-800 shrink-0 w-28"
                    >
                      {rule.field === "tag" ? (
                        <>
                          <option value="contains">Contains tag</option>
                          <option value="not_contains">Does not have</option>
                        </>
                      ) : rule.field === "totalSpent" || rule.field === "totalBookings" ? (
                        <>
                          <option value="gte">&gt;= (Greater/Equal)</option>
                          <option value="gt">&gt; (Greater than)</option>
                          <option value="lte">&lt;= (Less/Equal)</option>
                          <option value="lt">&lt; (Less than)</option>
                          <option value="eq">= (Equals)</option>
                        </>
                      ) : rule.field === "lastContactAt" ? (
                        <>
                          <option value="within_days">Within last (days)</option>
                          <option value="older_than_days">Older than (days)</option>
                        </>
                      ) : (
                        <>
                          <option value="eq">Is equal to</option>
                          <option value="neq">Is not equal to</option>
                          <option value="contains">Contains</option>
                          <option value="exists">Property exists</option>
                        </>
                      )}
                    </select>

                    {/* Value Input */}
                    {rule.op !== "exists" && (
                      <div className="flex-1 min-w-[120px]">
                        {rule.field === "tag" ? (
                          <div className="flex items-center gap-1">
                            <Input
                              placeholder="e.g. VIP, Wholesale..."
                              value={String(rule.value || "")}
                              onChange={e => updateRule(idx, { value: e.target.value })}
                              className="h-8 text-xs bg-white"
                              list={`tags-list-${idx}`}
                            />
                            <datalist id={`tags-list-${idx}`}>
                              {availableTags.map(t => (
                                <option key={t} value={t} />
                              ))}
                            </datalist>
                          </div>
                        ) : rule.field === "status" ? (
                          <select
                            value={String(rule.value || "opted_in")}
                            onChange={e => updateRule(idx, { value: e.target.value })}
                            className="w-full h-8 text-xs border border-stone-200 rounded-lg px-2 bg-white font-medium text-stone-800"
                          >
                            <option value="opted_in">Subscribed (Opted In)</option>
                            <option value="opted_out">Opted Out</option>
                          </select>
                        ) : rule.field === "stage" ? (
                          <select
                            value={String(rule.value || "NEW")}
                            onChange={e => updateRule(idx, { value: e.target.value })}
                            className="w-full h-8 text-xs border border-stone-200 rounded-lg px-2 bg-white font-medium text-stone-800"
                          >
                            <option value="NEW">New</option>
                            <option value="ENGAGED">Engaged</option>
                            <option value="QUALIFIED">Qualified</option>
                            <option value="CUSTOMER">Customer</option>
                            <option value="REPEAT">Repeat</option>
                            <option value="LOST">Lost</option>
                          </select>
                        ) : rule.field === "loyaltyTier" ? (
                          <select
                            value={String(rule.value || "BRONZE")}
                            onChange={e => updateRule(idx, { value: e.target.value })}
                            className="w-full h-8 text-xs border border-stone-200 rounded-lg px-2 bg-white font-medium text-stone-800"
                          >
                            <option value="BRONZE">Bronze</option>
                            <option value="SILVER">Silver</option>
                            <option value="GOLD">Gold</option>
                          </select>
                        ) : rule.field === "preferredLang" ? (
                          <select
                            value={String(rule.value || "en")}
                            onChange={e => updateRule(idx, { value: e.target.value })}
                            className="w-full h-8 text-xs border border-stone-200 rounded-lg px-2 bg-white font-medium text-stone-800"
                          >
                            <option value="en">English (en)</option>
                            <option value="ar">Arabic (ar)</option>
                          </select>
                        ) : (
                          <Input
                            placeholder="Value..."
                            value={String(rule.value ?? "")}
                            onChange={e => updateRule(idx, { value: e.target.value })}
                            className="h-8 text-xs bg-white"
                          />
                        )}
                      </div>
                    )}

                    {/* Delete rule button */}
                    <button
                      type="button"
                      onClick={() => removeRule(idx)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Reach Preview Card */}
          <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-purple-900 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-purple-600" />
                Live Segment Reach Estimation
              </span>
              {evaluating ? (
                <span className="flex items-center gap-1 text-[11px] text-purple-600">
                  <Loader2 className="h-3 w-3 animate-spin" /> Calculating...
                </span>
              ) : (
                <Badge variant="outline" className="bg-white border-purple-200 text-purple-800 font-bold">
                  {reach?.count ?? 0} matching contacts
                </Badge>
              )}
            </div>

            {reach && reach.sample.length > 0 && (
              <div className="pt-1.5 border-t border-purple-100/60">
                <div className="text-[10px] uppercase font-bold text-purple-700 tracking-wider mb-1">
                  Sample Matches:
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {reach.sample.map(s => (
                    <span
                      key={s.id}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-purple-200/70 text-stone-800 font-medium"
                    >
                      {s.name || s.phone || "Contact"}
                    </span>
                  ))}
                  {(reach?.count ?? 0) > reach.sample.length && (
                    <span className="text-[10px] text-purple-600">
                      +{reach.count - reach.sample.length} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
            <div>
              {isEditing && onDeleted && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-9"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                  Delete Segment
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !name.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                {isEditing ? "Save Changes" : "Create Segment"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
