import { useState } from "react";
import { format } from "date-fns";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  User, Mail, Phone, Tag, FileText, Clock, Activity, Plus, Sparkles, Loader2,
} from "lucide-react";
import type { Lead, LeadActivity } from "@/hooks/useLeads";
import { useLeadActivities, useUpdateLead, useLogActivity } from "@/hooks/useLeads";
import { useQualifyLead, type AiQualification } from "@/hooks/useQualifyLead";
import SalesConversationTimeline from "@/components/leads/SalesConversationTimeline";

const STATUSES = ["New", "Warm", "Hot", "Won", "Lost"];

const statusColor: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Warm: "bg-amber-100 text-amber-700",
  Hot: "bg-red-100 text-red-700",
  Won: "bg-green-100 text-green-700",
  Lost: "bg-muted text-muted-foreground",
};

function getScoreStage(score: number): { label: string; color: string } {
  if (score > 100) return { label: "🔥 Hot Buyer", color: "bg-red-600 text-white" };
  if (score >= 81) return { label: "Sales Qualified", color: "bg-orange-500 text-white" };
  if (score >= 51) return { label: "Marketing Qualified", color: "bg-amber-500 text-white" };
  if (score >= 21) return { label: "Warm Lead", color: "bg-yellow-100 text-yellow-800" };
  return { label: "Cold Lead", color: "bg-blue-100 text-blue-700" };
}

const verdictConfig: Record<string, { label: string; color: string; bg: string }> = {
  hot: { label: "🔥 Hot", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  warm: { label: "🌤 Warm", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  cold: { label: "❄️ Cold", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  not_qualified: { label: "⏳ Insufficient Data", color: "text-muted-foreground", bg: "bg-muted border-border" },
};

type Props = {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
};

const activityLabel: Record<string, string> = {
  stage_change: "Status Changed",
  manual_note: "Note Added",
  email_open: "Email Opened",
  link_click: "Link Clicked",
  form_submit: "Form Submitted",
  whatsapp_reply: "WhatsApp Reply",
  sms_reply: "SMS Reply",
  ai_qualification: "AI Qualified",
};

const LeadDetailsDrawer = ({ lead, open, onOpenChange, workspaceId }: Props) => {
  const { data: activities = [] } = useLeadActivities(lead?.id ?? null);
  const updateLead = useUpdateLead();
  const logActivity = useLogActivity();
  const qualifyLead = useQualifyLead();
  const [noteText, setNoteText] = useState("");
  const [editingScore, setEditingScore] = useState(false);
  const [scoreVal, setScoreVal] = useState(0);

  if (!lead) return null;

  const aiQ = (lead as any).ai_qualification as AiQualification | null;
  const vConfig = aiQ ? verdictConfig[aiQ.verdict] || verdictConfig.not_qualified : null;

  const handleStatusChange = (newStatus: string) => {
    updateLead.mutate({ id: lead.id, status: newStatus, prev: { status: lead.status }, workspace_id: workspaceId });
  };

  const handleScoreSave = () => {
    updateLead.mutate({ id: lead.id, score: scoreVal, prev: {}, workspace_id: workspaceId });
    setEditingScore(false);
  };

  const handleLogNote = () => {
    if (!noteText.trim()) return;
    logActivity.mutate({ leadId: lead.id, type: "manual_note", meta: { note: noteText.trim() }, workspaceId });
    setNoteText("");
  };

  const handleQualify = () => {
    qualifyLead.mutate({ leadId: lead.id, workspaceId });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-accent" />
            {lead.full_name || lead.email || "Unnamed Lead"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="grid gap-3 text-sm">
            {lead.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {lead.email}</div>}
            {lead.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {lead.phone}</div>}
            <div className="flex items-center gap-2 text-muted-foreground"><FileText className="h-4 w-4" /> Source: {lead.source}</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> Created {format(new Date(lead.created_at), "MMM d, yyyy")}</div>
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Status</p>
            <Select value={lead.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Score</p>
            {editingScore ? (
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={100} value={scoreVal} onChange={(e) => setScoreVal(+e.target.value)} className="w-24" />
                <Button size="sm" onClick={handleScoreSave} className="bg-accent text-accent-foreground">Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingScore(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => { setScoreVal(lead.score); setEditingScore(true); }} className="text-lg font-bold text-accent hover:underline">
                  {lead.score}
                </button>
                <Badge className={`${getScoreStage(lead.score).color} text-xs`}>
                  {getScoreStage(lead.score).label}
                </Badge>
              </div>
            )}
          </div>

          {/* AI Qualification Section */}
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI Qualification
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleQualify}
                disabled={qualifyLead.isPending}
                className="text-xs h-7 gap-1"
              >
                {qualifyLead.isPending ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing…</>
                ) : (
                  <><Sparkles className="h-3 w-3" /> {aiQ ? "Re-Qualify" : "Qualify with AI"}</>
                )}
              </Button>
            </div>

            {aiQ && vConfig && (
              <div className={`rounded-lg border p-3 space-y-2 ${vConfig.bg}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-sm ${vConfig.color}`}>{vConfig.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {aiQ.confidence}% confident
                  </span>
                </div>
                <Progress value={aiQ.confidence} className="h-1.5" />
                <p className="text-xs leading-relaxed">{aiQ.reasoning}</p>
                <div className="pt-1 border-t border-current/10">
                  <p className="text-xs font-medium">Recommended Action:</p>
                  <p className="text-xs text-muted-foreground">{aiQ.recommended_action}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Qualified {format(new Date(aiQ.qualified_at), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            )}
          </div>

          {lead.tags && lead.tags.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Tags</p>
              <div className="flex flex-wrap gap-1">
                {lead.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              </div>
            </div>
          )}

          {lead.notes && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          <Separator />

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground flex items-center gap-1"><Plus className="h-3 w-3" /> Log Activity</p>
            <div className="flex gap-2">
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" rows={2} className="flex-1" />
              <Button size="sm" onClick={handleLogNote} disabled={!noteText.trim()} className="bg-accent text-accent-foreground self-end">Add</Button>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-xs font-medium text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Activity Timeline</p>
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activities yet.</p>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    <div>
                      <p className="font-medium">{activityLabel[a.type] || a.type}</p>
                      {(a.meta as any)?.note && <p className="text-xs text-muted-foreground">{(a.meta as any).note}</p>}
                      {(a.meta as any)?.old_status && (
                        <p className="text-xs text-muted-foreground">{(a.meta as any).old_status} → {(a.meta as any).new_status}</p>
                      )}
                      {(a.meta as any)?.verdict && (
                        <p className="text-xs text-muted-foreground">Verdict: {(a.meta as any).verdict} ({(a.meta as any).confidence}%)</p>
                      )}
                      <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, yyyy h:mm a")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LeadDetailsDrawer;
