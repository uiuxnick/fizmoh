"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Loader2, Save, ShieldAlert, RotateCcw, Video, Link2, Unlink } from "lucide-react"

interface Field {
  key: string
  label: string
  secret?: boolean
  envVar: string
  hint?: string
  options?: string[]
  set: boolean
  source: "db" | "env" | "unset"
  value?: string
  masked?: string
}

interface Group {
  id: string
  title: string
  description: string
  fields: Field[]
}

/**
 * Integration settings, editable in the panel.
 *
 * Everything here used to be environment-only, so changing a credential meant
 * editing a file on the server. Saved values take precedence over the
 * environment, which stays as the bootstrap default.
 */
export function ConfigPanel() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/config")
      if (res.status === 403) { setForbidden(true); return }
      const data = await res.json()
      setGroups(data.groups || [])
      setDrafts({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // The consent round trip returns here with the result in the query string.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("google")
    if (!status) return
    if (status === "connected") toast.success("Google account connected — appointments now get their own Meet link")
    else if (status === "invalid_state") toast.error("That sign-in did not start here, so it was rejected")
    else toast.error(`Google refused the connection: ${status}`)
    window.history.replaceState({}, "", window.location.pathname)
  }, [])

  const saveGroup = async (group: Group) => {
    const payload: Record<string, string> = {}
    for (const field of group.fields) {
      const draft = drafts[field.key]
      if (draft !== undefined && draft !== "") payload[field.key] = draft
    }
    if (Object.keys(payload).length === 0) { toast.error("Nothing changed"); return }

    setSaving(group.id)
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || "Could not save"); return }
      toast.success(`${group.title} updated · takes effect immediately`)
      await load()
    } finally {
      setSaving(null)
    }
  }

  /**
   * Sends the operator to Google's consent screen.
   *
   * Only a signed-in person can create a Meet link — a service account is
   * refused — so this is the one credential that cannot be typed into a box.
   */
  const connectGoogle = async () => {
    setSaving("meet")
    try {
      const res = await fetch("/api/google/connect")
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) { toast.error(data.error || "Could not start the connection"); return }
      window.location.href = data.url
    } finally {
      setSaving(null)
    }
  }

  const disconnectGoogle = async () => {
    if (!confirm("Disconnect the Google account? New appointments will fall back to the standing Meet room.")) return
    await fetch("/api/config", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: "google_oauth_refresh_token" }),
    })
    await fetch("/api/config", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: "google_oauth_account" }),
    })
    toast.success("Disconnected")
    load()
  }

  const revert = async (field: Field) => {
    if (!confirm(`Revert ${field.label} to the value from the environment (${field.envVar})?`)) return
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: field.key }),
    })
    if (!res.ok) { toast.error("Could not revert"); return }
    toast.success("Reverted to the environment value")
    load()
  }

  if (forbidden) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-5 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-sm text-amber-900">Administrators only</div>
            <p className="text-xs text-amber-700 mt-0.5">
              These settings decide where payments and messages go, so they are limited to admin and manager accounts.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
  }

  // Exclude tenant-level duplicate groups (payments, business, email) that already exist in tenant tabs
  const platformGroups = groups.filter(g => !["payments", "business", "email"].includes(g.id))

  return (
    <div className="space-y-4">
      {platformGroups.map(group => (
        <Card key={group.id}>
          <CardHeader className="border-b">
            <CardTitle className="text-base">{group.title}</CardTitle>
            <p className="text-xs text-stone-500 whitespace-pre-line">{group.description}</p>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {group.fields.map(field => (
              <div key={field.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-stone-600">{field.label}</label>
                  <div className="flex items-center gap-1.5">
                    {field.source === "db" && (
                      <>
                        <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700">Set here</Badge>
                        <Button variant="ghost" size="icon" className="h-5 w-5" title="Revert to the environment value" onClick={() => revert(field)}>
                          <RotateCcw className="h-3 w-3 text-stone-400" />
                        </Button>
                      </>
                    )}
                    {field.source === "env" && <Badge variant="outline" className="text-[9px] bg-stone-100 text-stone-500">From environment</Badge>}
                    {field.source === "unset" && <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700">Not set</Badge>}
                  </div>
                </div>

                {field.options ? (
                  <select
                    value={drafts[field.key] ?? field.value ?? field.options[0]}
                    onChange={e => setDrafts({ ...drafts, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border bg-white text-sm"
                  >
                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <Input
                    type={field.secret ? "password" : "text"}
                    value={drafts[field.key] ?? (field.secret ? "" : field.value ?? "")}
                    placeholder={field.secret ? (field.masked || "Not set") : ""}
                    onChange={e => setDrafts({ ...drafts, [field.key]: e.target.value })}
                    className="bg-white font-mono text-xs"
                  />
                )}

                <p className="text-[11px] text-stone-400 mt-0.5">
                  {field.hint}
                  {field.hint && field.secret ? " · " : ""}
                  {field.secret && "Leave blank to keep the current value."}
                </p>
              </div>
            ))}

            {group.id === "meet" && (() => {
              const account = group.fields.find(f => f.key === "google_oauth_account")?.value
              const connected = group.fields.find(f => f.key === "google_oauth_refresh_token")?.set
              const ready = group.fields.find(f => f.key === "google_oauth_client_id")?.set
              return (
                <div className="rounded-lg border bg-stone-50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Video className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium">Per-appointment Meet links</span>
                    {connected
                      ? <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700">Connected</Badge>
                      : <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700">Not connected</Badge>}
                  </div>
                  <p className="text-[11px] text-stone-500 mb-2">
                    {connected
                      ? `Signed in as ${account || "a Google account"}. Each appointment gets its own room.`
                      : "A Meet room belongs to a person, so Google will not let the service account create one. Connect an account once and every appointment gets a fresh link."}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={connectGoogle} disabled={!ready || saving === "meet"}>
                      {saving === "meet" ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Link2 className="h-3 w-3 mr-1.5" />}
                      {connected ? "Reconnect" : "Connect Google account"}
                    </Button>
                    {connected && (
                      <Button size="sm" variant="ghost" onClick={disconnectGoogle}>
                        <Unlink className="h-3 w-3 mr-1.5" />Disconnect
                      </Button>
                    )}
                  </div>
                  {!ready && (
                    <p className="text-[11px] text-amber-600 mt-1.5">
                      Add the OAuth client ID and secret above, and save, before connecting.
                    </p>
                  )}
                </div>
              )
            })()}

            <Button
              onClick={() => saveGroup(group)}
              disabled={saving === group.id}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving === group.id ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save {group.title}
            </Button>
          </CardContent>
        </Card>
      ))}

      <p className="text-[11px] text-stone-400">
        A value saved here overrides the server environment and applies immediately — no redeploy.
        Reverting a field falls back to the environment variable named beside it.
      </p>
    </div>
  )
}
