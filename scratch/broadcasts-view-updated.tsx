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

interface Template {
  id: string;
  name: string;
  category: string;
  templateType: string;
  language: string;
  status: string;
  componentsJson?: string;
  components?: {
    body?: string;
    header?: any;
    footer?: string;
  };
}

interface Broadcast {
  id: string;
  name: string;
  status: string;
  templateId?: string | null;
  template?: Template | null;
  audienceCount: number;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  segmentJson?: string;
  statsJson?: string;
  stats?: {
    sent?: number;
    delivered?: number;
    read?: number;
    replied?: number;
    failed?: number;
  };
  segment?: {
    segmentId?: string;
    segmentName?: string;
    tags?: string[];
    excludeSegmentId?: string;
    excludeSegmentName?: string;
    message?: string;
    timezone?: string;
    filter?: any;
  };
}

const COMMON_TIMEZONES = [
  { label: "Oman / Gulf (GST +04:00)", value: "Asia/Muscat" },
  { label: "Dubai / UAE (GST +04:00)", value: "Asia/Dubai" },
  { label: "Saudi Arabia (AST +03:00)", value: "Asia/Riyadh" },
  { label: "India (IST +05:30)", value: "Asia/Kolkata" },
  { label: "London / GMT (+00:00)", value: "Europe/London" },
  { label: "US Eastern (EST -05:00)", value: "America/New_York" },
];

export function BroadcastsView() {
  const { data, loading, refresh } = useFetch<Broadcast[]>("/api/broadcasts");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingBroadcast, setEditingBroadcast] = React.useState<Broadcast | null>(null);
  const [reviewingBroadcast, setReviewingBroadcast] = React.useState<Broadcast | null>(null);
  const [analyticsId, setAnalyticsId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const params = useNav((s) => s.params);
  const setView = useNav((s) => s.setView);

  React.useEffect(() => {
    if (params.segmentId && !dialogOpen) {
      setDialogOpen(true);
    }
  }, [params.segmentId, dialogOpen]);

  const handleDialogClose = React.useCallback(() => {
    setDialogOpen(false);
    setEditingBroadcast(null);
    if (params.segmentId) {
      setView("broadcasts");
    }
  }, [params.segmentId, setView]);

  const broadcasts = data || [];
  const sent = broadcasts.filter((b) => b.status === "sent");
  const scheduled = broadcasts.filter((b) => b.status === "scheduled");
  const totalSent = sent.reduce((s, b) => s + (b.stats?.sent || 0), 0);
  const totalRead = sent.reduce((s, b) => s + (b.stats?.read || 0), 0);
  const totalReplied = sent.reduce((s, b) => s + (b.stats?.replied || 0), 0);

  const filteredBroadcasts = broadcasts.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/broadcasts/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to clone");
      toast.success("Broadcast duplicated as draft");
      refresh();
    } catch {
      toast.error("Failed to duplicate broadcast");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this broadcast?")) return;
    try {
      const res = await fetch(`/api/broadcasts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Broadcast deleted");
      refresh();
    } catch {
      toast.error("Failed to delete broadcast");
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      const res = await fetch(`/api/broadcasts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatchNow: true }),
      });
      if (!res.ok) throw new Error("Failed to send");
      toast.success("Broadcast queued & sent");
      setReviewingBroadcast(null);
      refresh();
    } catch {
      toast.error("Failed to dispatch broadcast");
    }
  };

  const handleExportCSV = (b: Broadcast) => {
    const stats = b.stats || {};
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Metric,Value", `Campaign Name,"${b.name}"`, `Status,${b.status}`, `Audience Count,${b.audienceCount}`, `Sent,${stats.sent || 0}`, `Delivered,${stats.delivered || 0}`, `Read,${stats.read || 0}`, `Replied,${stats.replied || 0}`, `Failed,${stats.failed || 0}`].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `broadcast_${b.name.replace(/\s+/g, "_")}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported campaign report");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Broadcasts & Campaigns"
        description="Segmented WhatsApp sends with delivery, template selection, and real-time analytics"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setEditingBroadcast(null); setDialogOpen(true); }}>
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

      {/* Filter and Search controls */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Icons.Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {["all", "draft", "scheduled", "sent", "failed"].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs capitalize"
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : filteredBroadcasts.length === 0 ? (
        <EmptyState icon={Icons.Megaphone} title="No broadcasts found" description={searchQuery ? "No campaign matches your search." : "Create your first campaign to reach customers on WhatsApp."} action={<Button onClick={() => setDialogOpen(true)}>Create broadcast</Button>} />
      ) : (
        <div className="space-y-3">
          {filteredBroadcasts.map((b) => {
            const stats = b.stats || {};
            const readRate = stats.sent ? Math.round(((stats.read || 0) / stats.sent) * 100) : 0;
            const replyRate = stats.sent ? Math.round(((stats.replied || 0) / stats.sent) * 100) : 0;
            const seg = b.segment || {};
            const audienceLabel = seg.segmentName
              ? `Segment: ${seg.segmentName}`
              : Array.isArray(seg.tags) && seg.tags.length
                ? `Tags: ${seg.tags.join(", ")}`
                : "All contacts";
            const isAnalyticsExpanded = analyticsId === b.id;

            return (
              <Card key={b.id} className="p-4 sm:p-5 transition-shadow hover:shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{b.name}</h3>
                      <StatusBadge status={b.status} />
                      {seg.excludeSegmentName && (
                        <Badge variant="outline" className="text-[9px] text-rose-500 border-rose-500/30">
                          Excludes: {seg.excludeSegmentName}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Icons.Users className="h-3 w-3" /> {audienceLabel}
                      </span>
                      {" · "}
                      {b.template ? `Template: ${b.template.name}` : seg.message ? "Custom message" : "No template"}
                      {" · "}{b.audienceCount} recipients
                      {b.scheduledAt && ` · Scheduled ${new Date(b.scheduledAt).toLocaleString()}`}
                      {b.sentAt && ` · Sent ${new Date(b.sentAt).toLocaleString()}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {b.status === "draft" && (
                      <>
                        <Button size="sm" variant="default" className="gap-1 text-xs" onClick={() => setReviewingBroadcast(b)}>
                          <Icons.Send className="h-3.5 w-3.5" /> Review & Send
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setEditingBroadcast(b); setDialogOpen(true); }}>
                          <Icons.Edit2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </>
                    )}

                    {b.status === "scheduled" && (
                      <>
                        <Button size="sm" variant="default" className="gap-1 text-xs" onClick={() => handleDispatch(b.id)}>
                          <Icons.Send className="h-3.5 w-3.5" /> Send now
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setEditingBroadcast(b); setDialogOpen(true); }}>
                          <Icons.Edit2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-xs text-rose-600 hover:text-rose-700"
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
                          <Icons.X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      </>
                    )}

                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleDuplicate(b.id)}>
                      <Icons.Copy className="h-3.5 w-3.5" /> Clone
                    </Button>

                    <Button
                      size="sm"
                      variant={isAnalyticsExpanded ? "secondary" : "ghost"}
                      className="h-8 text-xs gap-1"
                      onClick={() => setAnalyticsId(isAnalyticsExpanded ? null : b.id)}
                    >
                      <Icons.BarChart2 className="h-3.5 w-3.5" /> Analytics
                    </Button>

                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(b.id)}>
                      <Icons.Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {stats.sent > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Metric label="Sent" value={stats.sent} />
                    <Metric label="Delivered" value={stats.delivered || 0} pct={Math.round(((stats.delivered || 0) / stats.sent) * 100)} />
                    <Metric label="Read" value={stats.read || 0} pct={readRate} />
                    <Metric label="Replied" value={stats.replied || 0} pct={replyRate} />
                    <Metric label="Failed" value={stats.failed || 0} pct={Math.round(((stats.failed || 0) / stats.sent) * 100)} danger />
                  </div>
                )}

                {/* Expanded Analytics Panel */}
                {isAnalyticsExpanded && (
                  <div className="mt-4 border-t pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Icons.BarChart3 className="h-4 w-4 text-primary" /> Campaign Performance & Details
                      </h4>
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => handleExportCSV(b)}>
                        <Icons.Download className="h-3 w-3" /> Export CSV
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
                        <div className="text-[11px] text-muted-foreground font-medium">Delivery Rate</div>
                        <div className="text-xl font-bold text-emerald-600">
                          {stats.sent ? Math.round(((stats.delivered || 0) / stats.sent) * 100) : 0}%
                        </div>
                        <Progress value={stats.sent ? ((stats.delivered || 0) / stats.sent) * 100 : 0} className="h-1.5" />
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
                        <div className="text-[11px] text-muted-foreground font-medium">Read Rate</div>
                        <div className="text-xl font-bold text-teal-600">{readRate}%</div>
                        <Progress value={readRate} className="h-1.5" />
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
                        <div className="text-[11px] text-muted-foreground font-medium">Response Rate</div>
                        <div className="text-xl font-bold text-amber-600">{replyRate}%</div>
                        <Progress value={replyRate} className="h-1.5" />
                      </div>
                    </div>

                    {b.template ? (
                      <div className="rounded-lg border p-3 space-y-1.5 bg-muted/10">
                        <div className="text-xs font-medium flex items-center gap-1">
                          <Icons.FileText className="h-3.5 w-3.5 text-primary" /> Template: {b.template.name} ({b.template.language})
                        </div>
                        <div className="text-xs text-muted-foreground bg-background p-2.5 rounded border">
                          {b.template.components?.body || "Template message"}
                        </div>
                      </div>
                    ) : seg.message ? (
                      <div className="rounded-lg border p-3 space-y-1.5 bg-muted/10">
                        <div className="text-xs font-medium flex items-center gap-1">
                          <Icons.MessageSquare className="h-3.5 w-3.5 text-primary" /> Message Body
                        </div>
                        <div className="text-xs text-muted-foreground bg-background p-2.5 rounded border">
                          {seg.message}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {dialogOpen && (
        <NewBroadcastDialog
          editingBroadcast={editingBroadcast}
          onClose={handleDialogClose}
          onCreated={() => { handleDialogClose(); refresh(); }}
          preselectSegmentId={params.segmentId}
          preselectSegmentName={params.segmentName}
        />
      )}

      {reviewingBroadcast && (
        <ReviewBroadcastDialog
          broadcast={reviewingBroadcast}
          onClose={() => setReviewingBroadcast(null)}
          onConfirm={() => handleDispatch(reviewingBroadcast.id)}
        />
      )}
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
      {Icon && <Icon className={cn("h-2.5 w-2.5 mr-1", status === "sending" && "animate-spin")} />}
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

function ReviewBroadcastDialog({ broadcast, onClose, onConfirm }: { broadcast: Broadcast; onClose: () => void; onConfirm: () => void }) {
  const [testingPhone, setTestingPhone] = React.useState("");
  const [testSending, setTestSending] = React.useState(false);

  const handleTestSend = async () => {
    if (!testingPhone) { toast.error("Enter a test phone number"); return; }
    setTestSending(true);
    try {
      const res = await fetch("/api/broadcasts/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testingPhone,
          templateId: broadcast.templateId,
          message: broadcast.segment?.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test send failed");
      toast.success("Test message sent to " + testingPhone);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send test message");
    }
    setTestSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Icons.Send className="h-4 w-4 text-primary" /> Review & Confirm Dispatch
          </h3>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <Icons.X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Campaign:</span>
            <span className="font-medium">{broadcast.name}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Target Audience:</span>
            <span className="font-medium">{broadcast.segment?.segmentName || "All Contacts"} ({broadcast.audienceCount} recipients)</span>
          </div>
          {broadcast.segment?.excludeSegmentName && (
            <div className="flex justify-between border-b pb-2 text-rose-500">
              <span>Excluded Audience:</span>
              <span className="font-medium">{broadcast.segment.excludeSegmentName}</span>
            </div>
          )}
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Template / Message:</span>
            <span className="font-medium">{broadcast.template?.name || "Custom Message"}</span>
          </div>

          {/* Test Send Section */}
          <div className="rounded-md border p-2.5 bg-muted/20 space-y-2 mt-2">
            <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
              <Icons.Smartphone className="h-3.5 w-3.5 text-primary" /> Send Test Message
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. +96890000000"
                value={testingPhone}
                onChange={(e) => setTestingPhone(e.target.value)}
                className="h-8 flex-1 rounded border bg-background px-2 text-xs"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleTestSend} disabled={testSending}>
                {testSending ? <Icons.Loader2 className="h-3 w-3 animate-spin" /> : <Icons.Send className="h-3 w-3" />}
                Test
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} className="gap-1.5">
            <Icons.Send className="h-4 w-4" /> Confirm & Dispatch
          </Button>
        </div>
      </Card>
    </div>
  );
}

function NewBroadcastDialog({
  editingBroadcast,
  onClose,
  onCreated,
  preselectSegmentId,
  preselectSegmentName,
}: {
  editingBroadcast?: Broadcast | null;
  onClose: () => void;
  onCreated: () => void;
  preselectSegmentId?: string;
  preselectSegmentName?: string;
}) {
  const isEditing = !!editingBroadcast;
  const initialSeg = editingBroadcast?.segment || {};

  const [name, setName] = React.useState(editingBroadcast?.name || "");
  const [templateId, setTemplateId] = React.useState<string>(editingBroadcast?.templateId || "");
  const [customMessage, setCustomMessage] = React.useState<string>(initialSeg.message || "");
  const [audienceMode, setAudienceMode] = React.useState<AudienceMode>(
    initialSeg.segmentId || preselectSegmentId ? "segment" : "all"
  );
  const [segmentId, setSegmentId] = React.useState<string>(initialSeg.segmentId || preselectSegmentId || "");
  const [excludeSegmentId, setExcludeSegmentId] = React.useState<string>(initialSeg.excludeSegmentId || "");
  const [tags, setTags] = React.useState(initialSeg.tags ? initialSeg.tags.join(", ") : "");
  const [sendMode, setSendMode] = React.useState<SendMode>(editingBroadcast?.scheduledAt ? "schedule" : "now");
  const [scheduledAt, setScheduledAt] = React.useState<string>(
    editingBroadcast?.scheduledAt
      ? new Date(editingBroadcast.scheduledAt).toISOString().slice(0, 16)
      : ""
  );
  const [timezone, setTimezone] = React.useState<string>(initialSeg.timezone || "Asia/Muscat");
  const [sending, setSending] = React.useState(false);
  const [testPhone, setTestPhone] = React.useState("");
  const [testSending, setTestSending] = React.useState(false);

  const { data: segmentsData, loading: segmentsLoading } = useFetch<Segment[]>("/api/segments");
  const { data: templatesData, loading: templatesLoading } = useFetch<Template[]>("/api/templates");

  const segments = segmentsData || [];
  const templates = templatesData || [];
  const selectedSegment = segments.find((s) => s.id === segmentId) || null;
  const selectedTemplate = templates.find((t) => t.id === templateId) || null;

  // AI copywriter state
  const [showAi, setShowAi] = React.useState(false);
  const [brief, setBrief] = React.useState("");
  const [tone, setTone] = React.useState("friendly");
  const [audience, setAudience] = React.useState(preselectSegmentName ? `segment: ${preselectSegmentName}` : "all customers");
  const [cta, setCta] = React.useState("Shop now");
  const [generating, setGenerating] = React.useState(false);
  const [generated, setGenerated] = React.useState<{ body: string; variants: string[] } | null>(null);

  React.useEffect(() => {
    if (!editingBroadcast && !scheduledAt) {
      const d = new Date(Date.now() + 60 * 60 * 1000);
      d.setSeconds(0, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      setScheduledAt(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    }
  }, [editingBroadcast, scheduledAt]);

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
        toast.success("AI copy generated — variants ready");
      } else {
        toast.error(json.error || "Generation failed");
      }
    } catch { toast.error("AI request failed"); }
    setGenerating(false);
  };

  const handleUseAiCopy = (text: string) => {
    setCustomMessage(text);
    if (!name) setName("AI Campaign - " + brief.slice(0, 20));
    toast.success("Copy applied to message body");
  };

  const handleTestSend = async () => {
    if (!testPhone) { toast.error("Enter a test phone number"); return; }
    setTestSending(true);
    try {
      const res = await fetch("/api/broadcasts/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, templateId, message: customMessage }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Test send failed");
      toast.success("Test message sent to " + testPhone);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send test message");
    }
    setTestSending(false);
  };

  const saveBroadcast = async () => {
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
        templateId: templateId || null,
        message: customMessage || undefined,
        excludeSegmentId: excludeSegmentId || undefined,
        timezone,
        status: sendMode === "schedule" ? "scheduled" : "draft",
      };

      if (audienceMode === "segment") {
        payload.segmentId = segmentId;
      } else {
        const tagsArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
        if (tagsArr.length) payload.segment = { tags: tagsArr };
      }
      if (sendMode === "schedule") payload.scheduledAt = scheduledAt;

      const url = isEditing ? `/api/broadcasts/${editingBroadcast.id}` : "/api/broadcasts";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }
      const json = await res.json();
      toast.success(
        isEditing
          ? "Broadcast updated"
          : sendMode === "schedule"
            ? `Broadcast scheduled — ${json.audienceCount ?? 0} recipients`
            : `Broadcast draft created — ${json.audienceCount ?? 0} recipients`,
      );
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save broadcast");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto cc-scroll p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-semibold">{isEditing ? "Edit Broadcast" : "New Broadcast"}</h3>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAi(!showAi)}>
            <Icons.Sparkles className="h-3.5 w-3.5 text-violet-500" /> AI Copywriter
          </Button>
        </div>

        {showAi && (
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-violet-600 dark:text-violet-400">
              <Icons.Sparkles className="h-3.5 w-3.5" /> AI Copywriter Generator
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Campaign Brief</label>
              <textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. Desert Safari 20% discount offer for weekend booking" className="mt-1 min-h-[50px] w-full rounded-md border bg-background p-2 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs">
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="urgent">Urgent (FOMO)</option>
                  <option value="playful">Playful</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">CTA Text</label>
                <input value={cta} onChange={(e) => setCta(e.target.value)} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs" />
              </div>
            </div>
            <Button onClick={generate} disabled={generating} size="sm" className="w-full gap-1.5 text-xs">
              {generating ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.Sparkles className="h-3.5 w-3.5" />}
              {generating ? "Generating..." : "Generate AI Copy"}
            </Button>

            {generated && (
              <div className="space-y-2 mt-2">
                <div className="rounded-md border bg-card p-2 text-xs">
                  <div className="font-semibold text-[10px] text-muted-foreground">Primary Suggestion</div>
                  <p className="mt-1">{generated.body}</p>
                  <Button variant="secondary" size="sm" className="mt-1.5 h-6 text-[10px]" onClick={() => handleUseAiCopy(generated.body)}>
                    Use this text
                  </Button>
                </div>
                {generated.variants?.map((v, i) => (
                  <div key={i} className="rounded-md border bg-card p-2 text-xs">
                    <div className="font-semibold text-[10px] text-muted-foreground">Variant {i + 1}</div>
                    <p className="mt-1">{v}</p>
                    <Button variant="secondary" size="sm" className="mt-1.5 h-6 text-[10px]" onClick={() => handleUseAiCopy(v)}>
                      Use variant {i + 1}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Campaign Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Oman National Day Promo" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </div>

          {/* Template Selector */}
          <div className="rounded-lg border p-3 space-y-2">
            <label className="text-xs font-medium flex items-center justify-between">
              <span>WhatsApp Template</span>
              <span className="text-[10px] text-muted-foreground">Recommended for Meta Compliance</span>
            </label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={templatesLoading ? "Loading templates..." : "Select template (or use custom text)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No template (Custom text message)</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.category} - {t.language})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTemplate ? (
              <div className="rounded border bg-muted/20 p-2 text-xs space-y-1">
                <div className="font-medium text-primary flex items-center gap-1">
                  <Icons.FileText className="h-3 w-3" /> Template Body Preview:
                </div>
                <p className="text-muted-foreground text-[11px]">{selectedTemplate.components?.body || "Template content"}</p>
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-medium text-muted-foreground">Custom Message Text</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter message text..."
                  className="min-h-[60px] w-full rounded-md border bg-background p-2 text-xs"
                />
              </div>
            )}
          </div>

          {/* Audience Selector */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Audience</label>
              {selectedSegment && (
                <Badge variant="secondary" className="gap-0.5 text-[9px]">
                  <Icons.Users className="h-2.5 w-2.5" /> {selectedSegment.contactCount ?? 0} contacts
                </Badge>
              )}
            </div>

            <RadioGroup value={audienceMode} onValueChange={(v) => setAudienceMode(v as AudienceMode)} className="grid gap-2 sm:grid-cols-2">
              <Label className={cn("flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors", audienceMode === "all" ? "border-primary bg-primary/5" : "hover:bg-muted/40")}>
                <RadioGroupItem value="all" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium"><Icons.Users className="h-3.5 w-3.5" /> All contacts</div>
                  <p className="text-[10px] text-muted-foreground">Send to every opted-in contact.</p>
                </div>
              </Label>
              <Label className={cn("flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors", audienceMode === "segment" ? "border-primary bg-primary/5" : "hover:bg-muted/40")}>
                <RadioGroupItem value="segment" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium"><Icons.Layers className="h-3.5 w-3.5" /> Specific segment</div>
                  <p className="text-[10px] text-muted-foreground">Target a saved dynamic segment.</p>
                </div>
              </Label>
            </RadioGroup>

            {audienceMode === "segment" && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-medium text-muted-foreground">Target Segment</label>
                <Select value={segmentId} onValueChange={setSegmentId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={segmentsLoading ? "Loading..." : "Choose segment"} />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.contactCount ?? 0})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {audienceMode === "all" && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-medium text-muted-foreground">Narrow by Tags (optional, comma-separated)</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vip, muscat" className="h-8 w-full rounded-md border bg-background px-2.5 text-xs" />
              </div>
            )}

            {/* Exclude Segment */}
            <div className="space-y-1.5 pt-2 border-t">
              <label className="text-[10px] font-medium text-rose-500 flex items-center gap-1">
                <Icons.UserX className="h-3 w-3" /> Exclude Segment (Optional)
              </label>
              <Select value={excludeSegmentId} onValueChange={setExcludeSegmentId}>
                <SelectTrigger className="h-8 text-xs border-dashed">
                  <SelectValue placeholder="Do not exclude anyone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Do not exclude anyone</SelectItem>
                  {segments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>Exclude {s.name} ({s.contactCount ?? 0})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Delivery & Scheduler */}
          <div className="rounded-lg border p-3 space-y-3">
            <label className="text-xs font-medium">Delivery Mode</label>
            <RadioGroup value={sendMode} onValueChange={(v) => setSendMode(v as SendMode)} className="grid gap-2 sm:grid-cols-2">
              <Label className={cn("flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors", sendMode === "now" ? "border-primary bg-primary/5" : "hover:bg-muted/40")}>
                <RadioGroupItem value="now" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium"><Icons.Send className="h-3.5 w-3.5" /> Draft / Immediate</div>
                  <p className="text-[10px] text-muted-foreground">Save as draft — send anytime.</p>
                </div>
              </Label>
              <Label className={cn("flex cursor-pointer items-start gap-2 rounded-md border p-2.5 transition-colors", sendMode === "schedule" ? "border-primary bg-primary/5" : "hover:bg-muted/40")}>
                <RadioGroupItem value="schedule" className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium"><Icons.Clock className="h-3.5 w-3.5" /> Schedule for later</div>
                  <p className="text-[10px] text-muted-foreground">Auto-dispatch at specified time.</p>
                </div>
              </Label>
            </RadioGroup>

            {sendMode === "schedule" && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">Scheduled Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">Timezone</label>
                    <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs">
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Inline Test Send */}
          <div className="rounded-lg border p-3 space-y-2 bg-muted/10">
            <label className="text-xs font-medium flex items-center gap-1">
              <Icons.Smartphone className="h-3.5 w-3.5 text-primary" /> Test Send Before Publishing
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter test phone (e.g. +96891234567)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="h-8 flex-1 rounded border bg-background px-2 text-xs"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleTestSend} disabled={testSending}>
                {testSending ? <Icons.Loader2 className="h-3 w-3 animate-spin" /> : <Icons.Send className="h-3 w-3" />}
                Send Test
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={saveBroadcast} disabled={sending} className="gap-1.5">
            {sending ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Check className="h-4 w-4" />}
            {sending ? "Saving..." : isEditing ? "Update Broadcast" : sendMode === "schedule" ? "Schedule Broadcast" : "Create Draft"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
