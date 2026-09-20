"use client";
import * as React from "react";
import * as Icons from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useFetch, PageHeader, EmptyState, StatCard } from "./_shared";
import { useNav } from "@/store/nav-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SendMode = "now" | "schedule";
type AudienceMode = "all" | "segment";

interface Segment {
  id: string;
  name: string;
  color: string;
  contactCount: number;
}

export function BroadcastsView() {
  const { data, loading, refresh } = useFetch<any[]>("/api/broadcasts");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const params = useNav((s) => s.params);
  const setView = useNav((s) => s.setView);

  // If we were handed a segmentId (e.g. from "Broadcast to segment" in the
  // Contacts → Segments tab), auto-open the dialog pre-seeded with it.
  React.useEffect(() => {
    if (params.segmentId && !dialogOpen) {
      setDialogOpen(true);
    }
  }, [params.segmentId, dialogOpen]);

  // Clear the nav params once the dialog has been opened so a refresh doesn't
  // re-trigger it.
  const handleDialogClose = React.useCallback(() => {
    setDialogOpen(false);
    if (params.segmentId) {
      setView("broadcasts");
    }
  }, [params.segmentId, setView]);

  const sent = (data || []).filter((b) => b.status === "sent");
  const scheduled = (data || []).filter((b) => b.status === "scheduled");
  const totalSent = sent.reduce((s, b) => s + (b.stats?.sent || 0), 0);
  const totalRead = sent.reduce((s, b) => s + (b.stats?.read || 0), 0);
  const totalReplied = sent.reduce((s, b) => s + (b.stats?.replied || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Broadcasts & Campaigns"
        description="Segmented sends with delivery, read and reply analytics"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Icons.Plus className="h-4 w-4" /> New broadcast
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Campaigns sent" value={sent.length} icon={Icons.Send} accent="primary" />
        <StatCard label="Scheduled" value={scheduled.length} icon={Icons.Clock} accent="violet" />
        <StatCard label="Avg read rate" value={`${totalSent ? Math.round((totalRead / totalSent) * 100) : 0}%`} icon={Icons.Eye} accent="teal" />
        <StatCard label="Avg reply rate" value={`${totalSent ? Math.round((totalReplied / totalSent) * 100) : 0}%`} icon={Icons.Reply} accent="amber" />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : (data || []).length === 0 ? (
        <EmptyState icon={Icons.Megaphone} title="No broadcasts yet" description="Create your first campaign to reach customers on WhatsApp." action={<Button onClick={() => setDialogOpen(true)}>Create broadcast</Button>} />
      ) : (
        <div className="space-y-3">
          {(data || []).map((b) => {
            const stats = b.stats || {};
            const readRate = stats.sent ? Math.round((stats.read / stats.sent) * 100) : 0;
            const replyRate = stats.sent ? Math.round((stats.replied / stats.sent) * 100) : 0;
            const seg = b.segment || {};
            const audienceLabel = seg.segmentName
              ? `Segment: ${seg.segmentName}`
              : Array.isArray(seg.tags) && seg.tags.length
                ? `Tags: ${seg.tags.join(", ")}`
                : "All contacts";
            return (
              <Card key={b.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{b.name}</h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Icons.Users className="h-3 w-3" /> {audienceLabel}
                      </span>
                      {" · "}
                      {b.template ? `Template: ${b.template.name}` : "No template"}
                      {" · "}{b.audienceCount} recipients
                      {b.scheduledAt && ` · Scheduled ${new Date(b.scheduledAt).toLocaleString()}`}
                      {b.sentAt && ` · Sent ${new Date(b.sentAt).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {b.status === "draft" && <Button size="sm" variant="outline" onClick={() => toast.info("Review & schedule")}>Review & send</Button>}
                    {b.status === "scheduled" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/broadcasts/${b.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "sent", scheduledAt: null }),
                              });
                              if (!res.ok) throw new Error("Send failed");
                              toast.success("Broadcast queued for sending now");
                              refresh();
                            } catch {
                              toast.error("Failed to send broadcast");
                            }
                          }}
                        >
                          <Icons.Send className="h-3.5 w-3.5" /> Send now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/broadcasts/${b.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "cancelled" }),
                              });
                              if (!res.ok) throw new Error("Cancel failed");
                              toast.success("Scheduled broadcast cancelled");
                              refresh();
                            } catch {
                              toast.error("Failed to cancel broadcast");
                            }
                          }}
                        >
                          <Icons.X className="h-3.5 w-3.5" /> Cancel scheduled
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => toast.info("View analytics")}>Analytics</Button>
                  </div>
                </div>
                {stats.sent > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Metric label="Sent" value={stats.sent} />
                    <Metric label="Delivered" value={stats.delivered} pct={Math.round((stats.delivered / stats.sent) * 100)} />
                    <Metric label="Read" value={stats.read} pct={readRate} />
                    <Metric label="Replied" value={stats.replied} pct={replyRate} />
                    <Metric label="Failed" value={stats.failed} pct={Math.round((stats.failed / stats.sent) * 100)} danger />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {dialogOpen && <NewBroadcastDialog onClose={handleDialogClose} onCreated={() => { handleDialogClose(); refresh(); }} preselectSegmentId={params.segmentId} preselectSegmentName={params.segmentName} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; className?: string; icon?: React.ComponentType<{ className?: string }> }> = {
    sent: { variant: "default" },
    scheduled: { variant: "secondary", className: "bg-violet-500/15 text-violet-600 dark:text-violet-300", icon: Icons.Clock },
    sending: { variant: "secondary", className: "bg-amber-500/15 text-amber-600 dark:text-amber-300", icon: Icons.Loader2 },
    failed: { variant: "destructive" },
    cancelled: { variant: "outline", className: "text-rose-600 dark:text-rose-400" },
    draft: { variant: "outline" },
  };
  const cfg = map[status] || { variant: "outline" as const };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className={cn("text-[9px] capitalize", cfg.className)}>
      {Icon && <Icon className={cn("h-2.5 w-2.5", status === "sending" && "animate-spin")} />}
      {status}
    </Badge>
  );
}

function Metric({ label, value, pct, danger }: { label: string; value: number; pct?: number; danger?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-semibold", danger && value > 0 && "text-rose-600 dark:text-rose-400")}>{value}</div>
      {typeof pct === "number" && <Progress value={pct} className="mt-1 h-1" />}
    </div>
  );
}

function NewBroadcastDialog({ onClose, onCreated, preselectSegmentId, preselectSegmentName }: { onClose: () => void; onCreated: () => void; preselectSegmentId?: string; preselectSegmentName?: string }) {
  const [name, setName] = React.useState("");
  const [audienceMode, setAudienceMode] = React.useState<AudienceMode>(preselectSegmentId ? "segment" : "all");
  const [segmentId, setSegmentId] = React.useState<string>(preselectSegmentId || "");
  const [tags, setTags] = React.useState("");
  const [sendMode, setSendMode] = React.useState<SendMode>("now");
  const [scheduledAt, setScheduledAt] = React.useState<string>("");
  const [sending, setSending] = React.useState(false);

  // Fetch available segments for the audience dropdown.
  const { data: segmentsData, loading: segmentsLoading } = useFetch<Segment[]>("/api/segments");
  const segments = segmentsData || [];
  const selectedSegment = segments.find((s) => s.id === segmentId) || null;

  // AI copywriter state
  const [showAi, setShowAi] = React.useState(false);
  const [brief, setBrief] = React.useState("");
  const [tone, setTone] = React.useState("friendly");
  const [audience, setAudience] = React.useState(preselectSegmentName ? `segment: ${preselectSegmentName}` : "all customers");
  const [cta, setCta] = React.useState("Shop now");
  const [generating, setGenerating] = React.useState(false);
  const [generated, setGenerated] = React.useState<{ body: string; variants: string[] } | null>(null);

  // Default the datetime picker to 1 hour from now
  React.useEffect(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    setScheduledAt(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    );
  }, []);

  // Keep the AI brief "audience" field in sync with the selected segment.
  React.useEffect(() => {
    if (selectedSegment) setAudience(`segment: ${selectedSegment.name}`);
    else if (audienceMode === "all") setAudience("all customers");
  }, [selectedSegment, audienceMode]);

  const generate = async () => {
    if (!brief) { toast.error("Brief required"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/copywriter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, tone, audience, cta }),
      });
      const json = await res.json();
      if (json.body) {
        setGenerated(json);
        toast.success("AI copy generated — 3 variants ready");
      } else {
        toast.error(json.error || "Generation failed");
      }
    } catch { toast.error("AI request failed"); }
    setGenerating(false);
  };

  const create = async () => {
    if (!name) { toast.error("Name required"); return; }
    if (audienceMode === "segment" && !segmentId) { toast.error("Pick a segment"); return; }
    if (sendMode === "schedule") {
      if (!scheduledAt) { toast.error("Pick a date and time"); return; }
      const when = new Date(scheduledAt);
      if (isNaN(when.getTime())) { toast.error("Invalid date"); return; }
      if (when.getTime() <= Date.now()) { toast.error("Scheduled time must be in the future"); return; }
    }
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        status: sendMode === "schedule" ? "scheduled" : "draft",
      };
      if (audienceMode === "segment") {
        payload.segmentId = segmentId;
      } else {
        // All contacts — optionally narrowed by inline tags.
        const tagsArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
        if (tagsArr.length) payload.segment = { tags: tagsArr };
      }
      if (sendMode === "schedule") payload.scheduledAt = scheduledAt;
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Create failed");
      }
      const json = await res.json();
      toast.success(
        sendMode === "schedule"
          ? `Broadcast scheduled — ${json.audienceCount ?? 0} recipients`
          : `Broadcast draft created — ${json.audienceCount ?? 0} recipients`,
      );
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create broadcast");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto cc-scroll p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">New broadcast</h3>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAi(!showAi)}>
            <Icons.Sparkles className="h-3.5 w-3.5 text-violet-500" /> AI Copywriter
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Create a campaign. Send now or schedule it for later — scheduled sends are dispatched automatically by the cron job.</p>

        {showAi && (
          <div className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400">
              <Icons.Sparkles className="h-3.5 w-3.5" /> AI Copywriter
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">What's the campaign about? (brief)</label>
              <textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. Flash sale on JBL speakers, 25% off this weekend only" className="mt-1 min-h-[60px] w-full rounded-md border bg-background p-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm">
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="urgent">Urgent (FOMO)</option>
                  <option value="playful">Playful</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Audience</label>
                <input value={audience} onChange={(e) => setAudience(e.target.value)} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Call-to-action</label>
              <input value={cta} onChange={(e) => setCta(e.target.value)} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm" />
            </div>
            <Button onClick={generate} disabled={generating} size="sm" className="w-full gap-1.5">
              {generating ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.Sparkles className="h-3.5 w-3.5" />}
              {generating ? "Generating…" : "Generate copy"}
            </Button>

            {generated && (
              <div className="space-y-2">
                <div className="text-[10px] font-medium text-muted-foreground">Primary:</div>
                <div className="rounded-md border bg-card p-2 text-xs">{generated.body}</div>
                {generated.variants.length > 0 && (
                  <>
                    <div className="text-[10px] font-medium text-muted-foreground">A/B variants:</div>
                    {generated.variants.map((v, i) => (
                      <div key={i} className="rounded-md border bg-card p-2 text-xs">
                        <span className="text-[9px] font-medium text-muted-foreground">Variant {i + 1}</span>
                        <p className="mt-0.5">{v}</p>
                      </div>
                    ))}
                  </>
                )}
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setName(name || "AI-generated campaign"); toast.success("Copy applied to broadcast"); }}>
                  Use this copy
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium">Campaign name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramadan Flash Sale" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </div>

          {/* Audience selector — All contacts | Specific segment */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Audience</label>
              {selectedSegment && (
                <Badge variant="secondary" className="gap-0.5 text-[9px]">
                  <Icons.Users className="h-2.5 w-2.5" /> {selectedSegment.contactCount ?? 0} contacts
                </Badge>
              )}
            </div>
            <RadioGroup
              value={audienceMode}
              onValueChange={(v) => setAudienceMode(v as AudienceMode)}
              className="mt-2 grid gap-2 sm:grid-cols-2"
            >
              <Label
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors",
                  audienceMode === "all" ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                )}
              >
                <RadioGroupItem value="all" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Icons.Users className="h-3.5 w-3.5" /> All contacts
                  </div>
                  <p className="text-[10px] text-muted-foreground">Send to every opted-in contact.</p>
                </div>
              </Label>
              <Label
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors",
                  audienceMode === "segment" ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                )}
              >
                <RadioGroupItem value="segment" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Icons.Layers className="h-3.5 w-3.5" /> Specific segment
                  </div>
                  <p className="text-[10px] text-muted-foreground">Target a saved dynamic group.</p>
                </div>
              </Label>
            </RadioGroup>

            {audienceMode === "segment" && (
              <div className="mt-2.5 space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground">Segment</label>
                <Select value={segmentId} onValueChange={setSegmentId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={segmentsLoading ? "Loading segments…" : "Choose a segment"} />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.length === 0 && !segmentsLoading && (
                      <SelectItem value="__none" disabled>No segments yet — create one in Contacts → Segments</SelectItem>
                    )}
                    {segments.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.contactCount ?? 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {segments.length === 0 && !segmentsLoading && (
                  <p className="text-[10px] text-muted-foreground">
                    Tip: build a segment from the Contacts → Segments tab to target by tags, source, opt-in, orders or recency.
                  </p>
                )}
              </div>
            )}

            {audienceMode === "all" && (
              <div className="mt-2.5 space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground">Narrow by tags (optional, comma-separated)</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vip, dubai" className="h-8 w-full rounded-md border bg-background px-2.5 text-sm" />
              </div>
            )}
          </div>

          {/* Schedule toggle */}
          <div className="rounded-lg border p-3">
            <label className="text-xs font-medium">Delivery</label>
            <RadioGroup
              value={sendMode}
              onValueChange={(v) => setSendMode(v as SendMode)}
              className="mt-2 grid gap-2 sm:grid-cols-2"
            >
              <Label
                htmlFor="send-now"
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors",
                  sendMode === "now" ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                )}
              >
                <RadioGroupItem value="now" id="send-now" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Icons.Send className="h-3.5 w-3.5" /> Send now
                  </div>
                  <p className="text-[10px] text-muted-foreground">Create as a draft — dispatch immediately on review.</p>
                </div>
              </Label>
              <Label
                htmlFor="send-schedule"
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors",
                  sendMode === "schedule" ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                )}
              >
                <RadioGroupItem value="schedule" id="send-schedule" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Icons.Clock className="h-3.5 w-3.5" /> Schedule for later
                  </div>
                  <p className="text-[10px] text-muted-foreground">Auto-send at the chosen time via the cron job.</p>
                </div>
              </Label>
            </RadioGroup>

            {sendMode === "schedule" && (
              <div className="mt-3 space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground">Scheduled date & time</label>
                <div className="flex items-center gap-2">
                  <Icons.CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
                  />
                </div>
                {scheduledAt && new Date(scheduledAt).getTime() > Date.now() && (
                  <p className="flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400">
                    <Icons.CheckCircle2 className="h-3 w-3" />
                    Will be sent {new Date(scheduledAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={create} disabled={sending} className="gap-1.5">
            {sending ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : sendMode === "schedule" ? <Icons.Clock className="h-4 w-4" /> : <Icons.Plus className="h-4 w-4" />}
            {sending ? "Saving…" : sendMode === "schedule" ? "Schedule broadcast" : "Create draft"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
