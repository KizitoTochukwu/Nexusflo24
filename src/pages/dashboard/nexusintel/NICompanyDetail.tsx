import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useNICompany, useUpdateNICompany, useNINotes, useAddNINote,
  useNITasks, useAddNITask, useNIReports,
} from "@/lib/nexusintel/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["New Research", "Good Fit", "Contacted", "Follow-Up", "Discovery Booked", "Proposal Sent", "Won", "Lost"];

export default function NICompanyDetail() {
  const workspaceId = useWorkspaceId();
  const { id } = useParams<{ id: string }>();
  const { data: company } = useNICompany(workspaceId, id);
  const updateCompany = useUpdateNICompany();
  const { data: notes = [] } = useNINotes(workspaceId, id);
  const { data: tasks = [] } = useNITasks(workspaceId, id);
  const { data: reports = [] } = useNIReports(workspaceId);
  const addNote = useAddNINote();
  const addTask = useAddNITask();

  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");

  if (!company) return <DashboardLayout><p>Loading...</p></DashboardLayout>;

  const companyReports = reports.filter((r) => r.company_id === company.id);
  const latest = companyReports[0];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/dashboard/${workspaceId}/nexusintel/companies`}>
            <ArrowLeft className="h-4 w-4" /> Back to companies
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{company.name}</h1>
            <a className="text-accent text-sm hover:underline" href={`https://${company.website_url}`} target="_blank" rel="noreferrer">
              {company.website_url}
            </a>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="outline">{company.industry}</Badge>
              <Badge variant="outline">{company.location}</Badge>
              <Badge variant="outline">Score {company.lead_score ?? 0}</Badge>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Select
              value={company.status}
              onValueChange={(v) =>
                updateCompany.mutate(
                  { workspaceId, id: company.id, patch: { status: v } as any },
                  { onSuccess: () => toast.success("Status updated.") },
                )
              }
            >
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {latest && (
              <Button asChild>
                <Link to={`/dashboard/${workspaceId}/nexusintel/reports/${latest.id}`}>View latest report</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Profile summary</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>{company.summary}</p>
              <p><strong>Business model:</strong> {company.business_model}</p>
              <p><strong>Target customers:</strong> {company.target_customers}</p>
              <p><strong>Recommended offer:</strong> {company.recommended_offer}</p>
              <p><strong>Next action:</strong> {company.next_action}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note..." rows={3} />
              <Button
                size="sm"
                onClick={() => {
                  if (!note.trim()) return;
                  addNote.mutate(
                    { workspaceId, companyId: company.id, note },
                    { onSuccess: () => { setNote(""); toast.success("Note added."); } },
                  );
                }}
              >
                Add note
              </Button>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notes.map((n: any) => (
                  <div key={n.id} className="text-sm border-l-2 border-accent pl-3">
                    <p>{n.note}</p>
                    <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="w-44" />
                <Button
                  onClick={() => {
                    if (!taskTitle.trim()) return;
                    addTask.mutate(
                      { workspaceId, companyId: company.id, title: taskTitle, due_date: taskDue || null },
                      { onSuccess: () => { setTaskTitle(""); setTaskDue(""); toast.success("Task created."); } },
                    );
                  }}
                >
                  Add task
                </Button>
              </div>
              <div className="space-y-1">
                {tasks.map((t: any) => (
                  <div key={t.id} className="flex justify-between border rounded p-2 text-sm">
                    <span>{t.title}</span>
                    <span className="text-muted-foreground">{t.due_date ?? "No due date"} · {t.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
