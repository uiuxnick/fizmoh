"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Plus,
  Link2,
  RefreshCw,
  Copy,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  UserMinus,
  ShieldAlert,
  MessageSquare,
} from "lucide-react"
import { toast } from "sonner"

interface WaGroupParticipant {
  id: string
  waId: string
  joinRequestId?: string | null
  status: string
  joinedAt?: string | null
}

interface WaGroupMessage {
  id: string
  waMessageId?: string | null
  senderWaId?: string | null
  direction: "INBOUND" | "OUTBOUND"
  type: string
  body?: string | null
  mediaRef?: string | null
  status: string
  timestamp: string
}

interface WaGroup {
  id: string
  groupId: string
  phoneNumberId: string
  subject: string
  description?: string | null
  joinApprovalMode: "auto_approve" | "approval_required"
  inviteLink?: string | null
  status: string
  participants?: WaGroupParticipant[]
  messages?: WaGroupMessage[]
  _count?: { messages: number; participants: number }
}

export default function WhatsAppGroupsView() {
  const [groups, setGroups] = useState<WaGroup[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<WaGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [disabled, setDisabled] = useState(false)

  // Create group dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [joinApprovalMode, setJoinApprovalMode] = useState<"auto_approve" | "approval_required">("auto_approve")
  const [creating, setCreating] = useState(false)

  // Invite template
  const [invitePhone, setInvitePhone] = useState("")
  const [inviting, setInviting] = useState(false)

  // Send message
  const [msgType, setMsgType] = useState<"text" | "image" | "document" | "template">("text")
  const [msgBody, setMsgBody] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [templateName, setTemplateName] = useState("")
  const [sending, setSending] = useState(false)

  async function loadGroups() {
    setLoading(true)
    try {
      const res = await fetch("/api/whatsapp-groups", { cache: "no-store" })
      if (res.status === 404) {
        setDisabled(true)
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load groups")
      setGroups(data.groups || [])
      if (!selectedId && data.groups?.length) {
        setSelectedId(data.groups[0].id)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load WhatsApp groups")
    } finally {
      setLoading(false)
    }
  }

  async function loadGroupDetails(id: string) {
    try {
      const res = await fetch(`/api/whatsapp-groups/${id}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to sync group")
      setSelected(data.group)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (selectedId) loadGroupDetails(selectedId)
  }, [selectedId])

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/whatsapp-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), description: description.trim(), joinApprovalMode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create group")
      toast.success("WhatsApp group created")
      setCreateOpen(false)
      setSubject("")
      setDescription("")
      await loadGroups()
      setSelectedId(data.group.id)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleResetInviteLink() {
    if (!selected) return
    try {
      const res = await fetch(`/api/whatsapp-groups/${selected.id}/invite-link`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reset invite link")
      toast.success("Invite link reset")
      await loadGroupDetails(selected.id)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !invitePhone.trim()) return
    setInviting(true)
    try {
      const res = await fetch(`/api/whatsapp-groups/${selected.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: invitePhone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send invite template")
      toast.success(`Invite template sent to ${data.to}`)
      setInvitePhone("")
      await loadGroupDetails(selected.id)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function handleJoinRequest(joinRequestId: string, action: "approve" | "reject") {
    if (!selected) return
    try {
      const res = await fetch(`/api/whatsapp-groups/${selected.id}/join-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, joinRequestId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${action} request`)
      toast.success(`Join request ${action}d`)
      await loadGroupDetails(selected.id)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleRemoveParticipant(waId: string) {
    if (!selected) return
    try {
      const res = await fetch(`/api/whatsapp-groups/${selected.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to remove participant")
      toast.success(`Removed ${waId}`)
      await loadGroupDetails(selected.id)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSending(true)
    try {
      const res = await fetch(`/api/whatsapp-groups/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: msgType,
          body: msgBody,
          mediaUrl: mediaUrl || undefined,
          templateName: templateName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send message")
      toast.success("Message sent to group")
      setMsgBody("")
      setMediaUrl("")
      await loadGroupDetails(selected.id)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteGroup() {
    if (!selected) return
    try {
      const res = await fetch(`/api/whatsapp-groups/${selected.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete group")
      toast.success("Group deleted")
      setSelected(null)
      setSelectedId(null)
      await loadGroups()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (disabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Groups Disabled</CardTitle>
          <CardDescription>
            Set <code>WHATSAPP_GROUPS_ENABLED=true</code> to enable Official Business Account (OBA) WhatsApp Groups.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const participants = selected?.participants || []
  const pendingRequests = participants.filter(p => p.status === "requested")
  const joinedCount = participants.filter(p => p.status === "joined").length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            WhatsApp Groups (Cloud API)
          </h2>
          <p className="text-sm text-stone-500">
            Official Business Account (OBA) only · Max 8 participants per group · Invite-link onboarding
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="h-4 w-4" /> Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create WhatsApp Group</DialogTitle>
              <DialogDescription>
                Requires an Official Business Account (OBA) on Cloud API. Participants join via invite link (max 8).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Group Subject (max 128 chars)</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} maxLength={128} required placeholder="VIP Safari Group — Dec 12" />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2048} placeholder="Trip updates, meeting point & support" />
              </div>
              <div className="space-y-1.5">
                <Label>Join Approval Mode</Label>
                <Select value={joinApprovalMode} onValueChange={v => setJoinApprovalMode(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto_approve">Auto Approve (anyone with link joins)</SelectItem>
                    <SelectItem value="approval_required">Approval Required (admin approves requests)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Group list */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Active Groups ({groups.length})</CardTitle>
            <Button size="icon" variant="ghost" onClick={loadGroups} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {groups.length === 0 ? (
              <p className="text-sm text-stone-500 py-6 text-center">No active WhatsApp groups yet.</p>
            ) : (
              groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selected?.id === g.id
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <div className="font-semibold text-sm truncate">{g.subject}</div>
                  <div className="flex items-center justify-between mt-1 text-xs text-stone-500">
                    <span>{g.joinApprovalMode === "approval_required" ? "Approval required" : "Auto-approve"}</span>
                    <span>{g._count?.participants ?? 0}/8</span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Group detail */}
        <div className="lg:col-span-8 space-y-4">
          {!selected ? (
            <Card>
              <CardContent className="py-16 text-center text-stone-500 text-sm">
                Select or create a WhatsApp group to manage invites, participants, and messages.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{selected.subject}</CardTitle>
                      {selected.description && <CardDescription className="mt-1">{selected.description}</CardDescription>}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline">{joinedCount}/8 participants</Badge>
                        <Badge variant="secondary">{selected.joinApprovalMode}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => loadGroupDetails(selected.id)}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleDeleteGroup}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Invite Link */}
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Link2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-mono truncate">{selected.inviteLink || "No invite link generated yet"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected.inviteLink && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(selected.inviteLink!)
                            toast.success("Invite link copied")
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={handleResetInviteLink}>
                        Reset Link
                      </Button>
                    </div>
                  </div>

                  {/* Send Invite Template */}
                  <form onSubmit={handleSendInvite} className="flex flex-wrap items-center gap-2">
                    <Input
                      value={invitePhone}
                      onChange={e => setInvitePhone(e.target.value)}
                      placeholder="Send invite template to E.164 phone (e.g. 96891234567)"
                      className="flex-1 min-w-[220px]"
                    />
                    <Button type="submit" disabled={inviting || joinedCount >= 8}>
                      <Send className="h-3.5 w-3.5 mr-1" /> {inviting ? "Sending..." : "Send Invite Template"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Join Requests */}
              {pendingRequests.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Pending Join Requests ({pendingRequests.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pendingRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                        <span className="font-mono text-sm">+{req.waId}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700"
                            disabled={!req.joinRequestId}
                            onClick={() => req.joinRequestId && handleJoinRequest(req.joinRequestId, "approve")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-700"
                            disabled={!req.joinRequestId}
                            onClick={() => req.joinRequestId && handleJoinRequest(req.joinRequestId, "reject")}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Participants */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Participants ({participants.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {participants.length === 0 ? (
                    <p className="text-xs text-stone-500">No participants yet. Send an invite template to let users join.</p>
                  ) : (
                    participants.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border border-stone-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">+{p.waId}</span>
                          <Badge variant={p.status === "joined" ? "default" : "secondary"}>{p.status}</Badge>
                        </div>
                        {p.status === "joined" && (
                          <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleRemoveParticipant(p.waId)}>
                            <UserMinus className="h-3.5 w-3.5 mr-1" /> Remove
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Group Message Thread */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-600" /> Group Messages
                  </CardTitle>
                  <CardDescription className="text-xs flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                    Supported: text, image, document, video, audio, template (interactive, commerce, calls, edit/delete are disabled by Meta).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="max-h-72 overflow-y-auto space-y-2 p-3 rounded-xl bg-stone-50 border">
                    {(selected.messages || []).length === 0 ? (
                      <p className="text-xs text-stone-400 text-center py-6">No messages in this group yet.</p>
                    ) : (
                      (selected.messages || []).map(m => (
                        <div
                          key={m.id}
                          className={`p-2.5 rounded-lg text-sm max-w-[85%] ${
                            m.direction === "OUTBOUND" ? "ml-auto bg-emerald-700 text-white" : "bg-white border"
                          }`}
                        >
                          {m.senderWaId && <div className="text-[10px] opacity-75 font-mono mb-0.5">+{m.senderWaId}</div>}
                          <div>{m.body || `[${m.type}]`}</div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Select value={msgType} onValueChange={v => setMsgType(v as any)}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="document">Document</SelectItem>
                          <SelectItem value="template">Template</SelectItem>
                        </SelectContent>
                      </Select>
                      {msgType === "template" ? (
                        <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Approved template name" className="flex-1" />
                      ) : msgType !== "text" ? (
                        <Input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="Public media HTTPS URL" className="flex-1" />
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={msgBody}
                        onChange={e => setMsgBody(e.target.value)}
                        placeholder={msgType === "text" ? "Type a group message..." : "Caption (optional)"}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={sending}>
                        <Send className="h-4 w-4 mr-1" /> Send
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
