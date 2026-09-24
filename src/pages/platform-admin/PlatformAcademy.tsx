import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { usePlatformAction, usePlatformCommunityModeration } from "@/hooks/usePlatformAdmin";
import {
  PageHeader, StatCard, LoadingBlock, ErrorBlock, EmptyBlock, HighRiskActionDialog,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AcademyCoursesAdmin, AcademyEnrolmentsAdmin, AcademyTestimonialsAdmin } from "@/components/platform-admin/AcademyAdmin";

export default function PlatformAcademy() {
  const moderation = usePlatformCommunityModeration(50);
  const action = usePlatformAction();
  const [decision, setDecision] = useState<{ kind: "post" | "comment"; id: string; action: "remove" | "restore" } | null>(null);

  const m = moderation.data as any;

  return (
    <div>
      <PageHeader
        title="Academy & Community"
        description="Manage Academy courses, enrolments and testimonials, and moderate posts and comments across storefront communities."
      />

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="enrolments">Enrolments</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
        </TabsList>
        <TabsContent value="courses"><AcademyCoursesAdmin /></TabsContent>
        <TabsContent value="enrolments"><AcademyEnrolmentsAdmin /></TabsContent>
        <TabsContent value="testimonials"><AcademyTestimonialsAdmin /></TabsContent>
      </Tabs>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard label="Communities" value={m?.total_communities ?? 0} hint={`${m?.total_members ?? 0} members total`} />
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Moderation queue</CardTitle>
          <CardDescription>Most recent posts and comments. Removals are soft-deletes and can be restored.</CardDescription>
        </CardHeader>
        <CardContent>
          {moderation.isLoading ? (
            <LoadingBlock rows={3} />
          ) : moderation.error ? (
            <ErrorBlock error={moderation.error} onRetry={() => moderation.refetch()} />
          ) : (
            <Tabs defaultValue="posts">
              <TabsList>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
              </TabsList>

              <TabsContent value="posts">
                {!(m?.recent_posts ?? []).length ? (
                  <EmptyBlock title="No community posts yet" />
                ) : (
                  <ul className="divide-y text-sm">
                    {(m.recent_posts as any[]).map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {p.title || "Untitled post"}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {p.community_name ?? "Community"}{p.space_name ? ` / ${p.space_name}` : ""}
                            </span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(p.created_at), "MMM d, HH:mm")} · {p.like_count} likes · {p.comment_count} comments
                            {p.removed_at ? ` · removed: ${p.removal_reason ?? "no reason recorded"}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.removed_at ? (
                            <>
                              <Badge variant="destructive">Removed</Badge>
                              <Button size="sm" variant="outline" onClick={() => setDecision({ kind: "post", id: p.id, action: "restore" })}>Restore</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="destructive" onClick={() => setDecision({ kind: "post", id: p.id, action: "remove" })}>Remove</Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="comments">
                {!(m?.recent_comments ?? []).length ? (
                  <EmptyBlock title="No community comments yet" />
                ) : (
                  <ul className="divide-y text-sm">
                    {(m.recent_comments as any[]).map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{String(c.body ?? "").slice(0, 120)}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(c.created_at), "MMM d, HH:mm")} · {c.community_name ?? "Community"}
                            {c.removed_at ? ` · removed: ${c.removal_reason ?? "no reason recorded"}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.removed_at ? (
                            <>
                              <Badge variant="destructive">Removed</Badge>
                              <Button size="sm" variant="outline" onClick={() => setDecision({ kind: "comment", id: c.id, action: "restore" })}>Restore</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="destructive" onClick={() => setDecision({ kind: "comment", id: c.id, action: "remove" })}>Remove</Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <HighRiskActionDialog
        open={!!decision}
        onOpenChange={(v) => !v && setDecision(null)}
        title={`${decision?.action === "remove" ? "Remove" : "Restore"} community ${decision?.kind}`}
        description={
          decision?.action === "remove"
            ? "This hides the content from the community immediately. It can be restored later."
            : "This makes the content visible in the community again."
        }
        confirmLabel={decision?.action === "remove" ? "Remove content" : "Restore content"}
        pending={action.isPending}
        onConfirm={(reason) =>
          action.mutate(
            {
              action: "moderate_community_content",
              reason,
              payload: { kind: decision!.kind, id: decision!.id, action: decision!.action, removal_reason: reason },
            },
            {
              onSuccess: () => {
                toast.success(decision!.action === "remove" ? "Content removed" : "Content restored");
                setDecision(null);
              },
              onError: (e: any) => toast.error(e.message),
            },
          )
        }
      />
    </div>
  );
}
