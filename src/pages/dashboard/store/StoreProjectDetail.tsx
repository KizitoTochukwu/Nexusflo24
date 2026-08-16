import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Star } from "lucide-react";
import LeaveReviewDialog from "@/components/store/LeaveReviewDialog";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  projectStatusLabel, useStoreProject, useStoreProjectUpdates, useUpdateStoreProject,
} from "@/hooks/useStoreOrders";

/** Onboarding never asks for passwords — access is always granted by invitation. */
const ONBOARDING_FIELDS = [
  { id: "business_overview", label: "Briefly describe how this process runs today", type: "textarea" },
  { id: "systems", label: "Which tools should this automation connect to?", type: "text" },
  { id: "access_owner", label: "Who will grant access (name and email)?", type: "text" },
  { id: "brand_voice", label: "Tone of voice for any messages we send", type: "text" },
  { id: "working_hours", label: "Business hours and time zone", type: "text" },
  { id: "success_measure", label: "What does success look like in 30 days?", type: "textarea" },
];

export default function StoreProjectDetail() {
  const { projectId } = useParams();
  const workspaceId = useWorkspaceId();
  const { data: project, isLoading } = useStoreProject(projectId);
  const { data: updates = [] } = useStoreProjectUpdates(projectId);
  const update = useUpdateStoreProject();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (project) setAnswers((project.onboarding_data ?? {}) as Record<string, string>);
  }, [project]);

  const saveOnboarding = async (complete: boolean) => {
    if (!project) return;
    try {
      await update.mutateAsync({
        id: project.id,
        patch: {
          onboarding_data: answers,
          ...(complete
            ? {
                onboarding_completed_at: new Date().toISOString(),
                status: project.status === "onboarding" ? "in_build" : project.status,
                progress: Math.max(project.progress, 30),
              }
            : {}),
        } as any,
      });
      toast.success(complete ? "Onboarding submitted — the build starts next." : "Progress saved.");
    } catch (err: any) {
      toast.error(err?.message || "Could not save your onboarding.");
    }
  };

  const approve = async () => {
    if (!project) return;
    try {
      await update.mutateAsync({
        id: project.id,
        patch: {
          approved_at: new Date().toISOString(),
          status: "live",
          progress: 100,
          go_live_at: new Date().toISOString(),
        } as any,
      });
      toast.success("Approved. Your automation is now live.");
    } catch (err: any) {
      toast.error(err?.message || "Could not record your approval.");
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1000px] space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/dashboard/${workspaceId}/my-automations`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> My Automations
          </Link>
        </Button>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : !project ? (
          <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
            This project could not be found.
          </div>
        ) : (
          <>
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold">{project.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    Ordered {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={project.status === "live" ? "default" : "secondary"}>
                  {projectStatusLabel(project.status)}
                </Badge>
              </div>
              <Progress value={project.progress} className="mt-5" />
              <p className="mt-2 text-xs text-muted-foreground">{project.progress}% complete</p>

              {project.status === "awaiting_approval" && (
                <div className="mt-5 rounded-xl border border-accent/40 bg-accent/5 p-4">
                  <p className="text-sm font-medium">Your automation is built and tested.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Review the workflow with our team, then approve to go live.
                  </p>
                  <Button className="mt-3" onClick={approve} disabled={update.isPending}>
                    {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Approve and go live
                  </Button>
                </div>
              )}

              {project.status === "live" && project.product_slug && (
                <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border bg-surface p-4">
                  <div className="min-w-[200px] flex-1">
                    <p className="text-sm font-medium">How is this automation working for you?</p>
                    <p className="text-xs text-muted-foreground">
                      Share a short review to help other businesses choose.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setReviewing(true)}>
                    <Star className="mr-2 h-4 w-4" /> Leave a review
                  </Button>
                </div>
              )}
            </div>

            {project.product_slug && (
              <LeaveReviewDialog
                open={reviewing}
                onOpenChange={setReviewing}
                productSlug={project.product_slug}
                projectId={project.id}
                productName={project.name}
              />
            )}

            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Onboarding</h2>
                {project.onboarding_completed_at && (
                  <span className="flex items-center gap-1 text-xs text-accent">
                    <CheckCircle2 className="h-4 w-4" /> Submitted
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Share the context we need. Never send passwords — we always request access by secure
                invitation to your accounts.
              </p>
              <div className="mt-5 space-y-4">
                {ONBOARDING_FIELDS.map((field) => (
                  <div key={field.id}>
                    <Label htmlFor={field.id}>{field.label}</Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        id={field.id}
                        rows={3}
                        value={answers[field.id] ?? ""}
                        onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      />
                    ) : (
                      <Input
                        id={field.id}
                        value={answers[field.id] ?? ""}
                        onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={() => saveOnboarding(true)} disabled={update.isPending}>
                  {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {project.onboarding_completed_at ? "Update onboarding" : "Submit onboarding"}
                </Button>
                <Button variant="outline" onClick={() => saveOnboarding(false)} disabled={update.isPending}>
                  Save draft
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6">
              <h2 className="font-semibold">Project updates</h2>
              {updates.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Updates from the delivery team will appear here.
                </p>
              ) : (
                <ol className="mt-4 space-y-4">
                  {updates.map((u) => (
                    <li key={u.id} className="border-l-2 border-accent/40 pl-4">
                      <p className="text-sm font-medium">{u.title}</p>
                      {u.body && <p className="text-sm text-muted-foreground">{u.body}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
