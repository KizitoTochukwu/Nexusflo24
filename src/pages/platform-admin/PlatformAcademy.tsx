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
import { courses } from "@/data/academyCourses";

export default function PlatformAcademy() {
  const moderation = usePlatformCommunityModeration(50);
  const action = usePlatformAction();
  const [decision, setDecision] = useState<{ kind: "post" | "comment"; id: string; action: "remove" | "restore" } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const m = moderation.data as any;
  const lessonCount = courses.reduce((a, c) => a + c.modules.reduce((b, mod) => b + mod.lessons.length, 0), 0);

  return (
    <div>
      <PageHeader
        title="Academy & Community"
        description="Academy content catalogue and moderation of posts and comments across storefront communities."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Academy courses" value={courses.length} hint="Static catalogue — content managed in code" />
        <StatCard label="Lessons" value={lessonCount} hint="Across all courses" />
        <StatCard label="Communities" value={m?.total_communities ?? 0} hint={`${m?.total_members ?? 0} members total`} />
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Course catalogue</CardTitle>
          <CardDescription>
            Courses are file-defined — edit them in <code className="text-xs">src/data/academyCourses.ts</code> and redeploy. This is a read-only preview, not an editor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {courses.map((c) => (
              <li key={c.slug} className="py-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => setExpanded((cur) => (cur === c.slug ? null : c.slug))}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {c.title}
                      {c.premium && <Badge className="ml-2 bg-accent/10 text-accent border-accent/30">Premium</Badge>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.category} · {c.duration} · {c.modules.length} modules · {c.modules.reduce((a, mod) => a + mod.lessons.length, 0)} lessons · {c.instructor.name}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{expanded === c.slug ? "Hide" : "Show"} modules</span>
                </button>
                {expanded === c.slug && (
                  <div className="mt-2 space-y-2 rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{c.tagline}</p>
                    {c.modules.map((mod, i) => (
                      <div key={i}>
                        <p className="text-xs font-semibold">Module {i + 1}: {mod.title}</p>
                        <ul className="mt-1 space-y-0.5 pl-4 text-[11px] text-muted-foreground">
                          {mod.lessons.map((l, j) => (
                            <li key={j} className="list-disc">{l.title} <span className="opacity-70">({l.duration})</span></li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

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
