"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export function AptSettingsManager() {
  const [settings, setSettings] = useState<any>({
    isEnabled: true,
    defaultTimezone: "Asia/Muscat",
    autoConfirm: true,
    cancellationDeadlineHours: 24,
    cancellationPolicyText: "",
    reminder24h: true,
    reminder2h: true,
    reminder30m: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/apt/settings")
      .then(r => r.json())
      .then(d => {
        if (d.settings) setSettings(d.settings)
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/apt/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        toast.success("Settings saved successfully")
      } else {
        toast.error("Failed to save settings")
      }
    } catch {
      toast.error("Error saving settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-stone-800">Appointment Module Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 bg-stone-50 border rounded-lg">
            <div>
              <p className="font-semibold text-stone-800">Enable Appointments Module</p>
              <p className="text-stone-500">Allow customers to book appointments via WhatsApp & Admin.</p>
            </div>
            <Switch
              checked={settings.isEnabled}
              onCheckedChange={v => setSettings({ ...settings, isEnabled: v })}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-stone-50 border rounded-lg">
            <div>
              <p className="font-semibold text-stone-800">Auto-Confirm Bookings</p>
              <p className="text-stone-500">Automatically confirm new WhatsApp appointments without manual review.</p>
            </div>
            <Switch
              checked={settings.autoConfirm}
              onCheckedChange={v => setSettings({ ...settings, autoConfirm: v })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <Label className="text-xs">Default Timezone</Label>
              <Input
                value={settings.defaultTimezone}
                onChange={e => setSettings({ ...settings, defaultTimezone: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Cancellation Deadline (Hours)</Label>
              <Input
                type="number"
                value={settings.cancellationDeadlineHours}
                onChange={e => setSettings({ ...settings, cancellationDeadlineHours: Number(e.target.value) })}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold text-stone-700">Automated WhatsApp Reminders</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Send 24 Hours Before Appointment</span>
                <Switch
                  checked={settings.reminder24h}
                  onCheckedChange={v => setSettings({ ...settings, reminder24h: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Send 2 Hours Before Appointment</span>
                <Switch
                  checked={settings.reminder2h}
                  onCheckedChange={v => setSettings({ ...settings, reminder2h: v })}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <Label className="text-xs">Cancellation Policy Text</Label>
            <Textarea
              value={settings.cancellationPolicyText || ""}
              onChange={e => setSettings({ ...settings, cancellationPolicyText: e.target.value })}
              placeholder="e.g. Free cancellation up to 24 hours before your scheduled appointment."
              className="mt-1 text-xs min-h-[60px]"
            />
          </div>

          <div className="pt-3 border-t flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
