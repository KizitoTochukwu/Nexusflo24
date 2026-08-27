import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdminBlogManager from "@/pages/admin/AdminBlogManager";
import { PageHeader } from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock } from "lucide-react";

function ScheduledQueue() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-scheduled-posts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("blog_posts")
        .select("id, title, scheduled_for")
        .eq("status", "scheduled")
        .not("scheduled_for", "is", null)
        .order("scheduled_for", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; title: string; scheduled_for: string }[];
    },
  });

  const publishNow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("blog_posts")
        .update({ status: "published", published_at: new Date().toISOString(), scheduled_for: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-scheduled-posts"] });
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Post published");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !(data ?? []).length) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-accent" /> Scheduled queue
        </CardTitle>
        <CardDescription>
          Posts publish automatically within the hour after their scheduled time. {data!.length} post{data!.length === 1 ? "" : "s"} waiting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {data!.map((p) => {
            const due = new Date(p.scheduled_for) <= new Date();
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {due ? "Due now — publishes on the next scheduler tick" : `Publishes ${formatDistanceToNow(new Date(p.scheduled_for), { addSuffix: true })}`}
                    {" · "}
                    {format(new Date(p.scheduled_for), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled={publishNow.isPending} onClick={() => publishNow.mutate(p.id)}>
                  Publish now
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function PlatformContent() {
  return (
    <div>
      <PageHeader
        title="Blog & Pages"
        description="Platform-owned marketing content. Changes here affect the public NexusFlo24 site, not any customer workspace."
      />
      <ScheduledQueue />
      <AdminBlogManager bare />
    </div>
  );
}
