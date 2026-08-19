import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  PROJECT_STATUSES, orderStatusLabel, projectStatusLabel, useAddProjectUpdate, useAdminStoreOrders,
  useAdminStoreProjects, useUpdateStoreProject, type StoreProject,
} from "@/hooks/useStoreOrders";
import { useStoreAnalytics } from "@/hooks/useStoreAdmin";
import { useAdminReviews, useDeleteReview, useModerateReview } from "@/hooks/useStoreReviews";
import { formatGbp } from "@/lib/store/price";

function ProjectRow({ project }: { project: StoreProject }) {
  const update = useUpdateStoreProject();
  const addUpdate = useAddProjectUpdate();
  const [progress, setProgress] = useState(String(project.progress));
  const [note, setNote] = useState({ title: "", body: "" });

  const setStatus = async (status: string) => {
    try {
      await update.mutateAsync({
        id: project.id,
        patch: {
          status,
          ...(status === "awaiting_approval" ? { approval_requested_at: new Date().toISOString() } : {}),
          ...(status === "live" ? { go_live_at: new Date().toISOString(), progress: 100 } : {}),
        } as any,
      });
      toast.success("Project status updated.");
    } catch (err: any) {
      toast.error(err?.message || "Could not update the project.");
    }
  };

  const saveProgress = async () => {
    const value = Math.max(0, Math.min(100, Number(progress) || 0));
    await update.mutateAsync({ id: project.id, patch: { progress: value } as any });
    toast.success("Progress saved.");
  };

  const postUpdate = async () => {
    if (!note.title.trim()) {
      toast.error("Add a short title for the update.");
      return;
    }
    await addUpdate.mutateAsync({ project_id: project.id, title: note.title, body: note.body });
    setNote({ title: "", body: "" });
    toast.success("Update posted to the customer.");
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{project.name}</h3>
          <p className="text-xs text-muted-foreground">
            Created {new Date(project.created_at).toLocaleDateString()} ·{" "}
            {project.onboarding_completed_at ? "Onboarding complete" : "Awaiting onboarding"}
          </p>
        </div>
        <Badge variant={project.status === "live" ? "default" : "secondary"}>
          {projectStatusLabel(project.status)}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={project.status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Progress (%)</Label>
          <Input value={progress} onChange={(e) => setProgress(e.target.value)} inputMode="numeric" />
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="w-full" onClick={saveProgress} disabled={update.isPending}>
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save progress
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-lg border bg-surface p-4">
        <Label className="text-xs">Post an update to the customer</Label>
        <Input
          placeholder="Update title"
          value={note.title}
          onChange={(e) => setNote({ ...note, title: e.target.value })}
        />
        <Textarea
          rows={2}
          placeholder="Optional detail"
          value={note.body}
          onChange={(e) => setNote({ ...note, body: e.target.value })}
        />
        <Button size="sm" onClick={postUpdate} disabled={addUpdate.isPending}>
          {addUpdate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post update
        </Button>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const { data, isLoading } = useStoreAnalytics();
  if (isLoading || !data) return <Skeleton className="h-64" />;

  const cards = [
    { label: "Paid orders", value: String(data.paidOrders) },
    { label: "Setup revenue", value: formatGbp(data.setupRevenuePence) },
    { label: "Recurring revenue", value: `${formatGbp(data.monthlyRevenuePence)}/mo` },
    { label: "Average order", value: formatGbp(data.averageOrderPence) },
    { label: "Checkout conversion", value: `${data.conversionRate}%` },
    { label: "Custom requests", value: String(data.requests) },
    { label: "Live automations", value: String(data.liveProjects) },
    { label: "In delivery", value: String(data.activeProjects) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">Best sellers</h3>
          {data.byProduct.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No paid items yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.byProduct.slice(0, 8).map((row) => (
                <li key={row.slug} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{row.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {row.orders} × · {formatGbp(row.revenuePence)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">Revenue by month</h3>
          {data.byMonth.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No revenue recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.byMonth.map((row) => (
                <li key={row.month} className="flex items-center justify-between gap-3 text-sm">
                  <span>{row.month}</span>
                  <span className="text-muted-foreground">
                    {row.orders} orders · {formatGbp(row.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewsTab() {
  const { data: reviews = [], isLoading } = useAdminReviews();
  const moderate = useModerateReview();
  const remove = useDeleteReview();

  if (isLoading) return <Skeleton className="h-40" />;
  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No customer reviews submitted yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{review.author_name}</span>
            <span className="text-xs text-muted-foreground">/{review.product_slug}</span>
            <Badge variant="secondary">{review.rating}/5</Badge>
            {review.is_verified && <Badge className="bg-accent/15 text-accent hover:bg-accent/15">Verified</Badge>}
            <Badge variant={review.is_published ? "default" : "outline"}>
              {review.is_published ? "Published" : "Pending"}
            </Badge>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  moderate.mutate({ id: review.id, patch: { is_published: !review.is_published } })
                }
              >
                {review.is_published ? "Unpublish" : "Publish"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => moderate.mutate({ id: review.id, patch: { is_verified: !review.is_verified } })}
              >
                {review.is_verified ? "Unverify" : "Verify"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (window.confirm("Delete this review?")) remove.mutate(review.id);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
          {review.title && <p className="mt-2 font-semibold">{review.title}</p>}
          {review.body && <p className="mt-1 text-sm text-muted-foreground">{review.body}</p>}
        </div>
      ))}
    </div>
  );
}

export default function AdminStoreOrders() {
  const { data: orders = [], isLoading } = useAdminStoreOrders();
  const { data: projects = [], isLoading: loadingProjects } = useAdminStoreProjects();

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Automation Store fulfilment</h1>
          <p className="text-sm text-muted-foreground">
            Track paid orders, revenue and reviews, and move each delivery project through build, testing and go-live.
          </p>
        </div>

        <Tabs defaultValue="projects">
          <TabsList className="flex-wrap">
            <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-4">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="reviews" className="mt-4">
            <ReviewsTab />
          </TabsContent>


          <TabsContent value="projects" className="mt-4 space-y-4">
            {loadingProjects ? (
              <Skeleton className="h-40" />
            ) : projects.length === 0 ? (
              <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
                No delivery projects yet.
              </p>
            ) : (
              projects.map((p) => <ProjectRow key={p.id} project={p} />)
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            {isLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Order</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Setup</th>
                      <th className="p-3">Monthly</th>
                      <th className="p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="p-3 font-mono text-xs">{o.id.slice(0, 8).toUpperCase()}</td>
                        <td className="p-3">
                          <div className="font-medium">{o.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{o.email}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant={o.status === "pending" ? "secondary" : "default"}>{orderStatusLabel(o.status)}</Badge>
                        </td>
                        <td className="p-3">{formatGbp(o.total_pence)}</td>
                        <td className="p-3">
                          {o.monthly_total_pence ? `${formatGbp(o.monthly_total_pence)}/mo` : "—"}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
