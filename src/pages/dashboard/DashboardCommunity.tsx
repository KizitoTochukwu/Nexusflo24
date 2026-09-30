import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import CommunityPostCard from "@/components/community/CommunityPostCard";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCommunityPosts, useCommunitySpaces, useCreatePost, useJoinCommunity,
  useMyLikes, useMyMembership, usePlatformCommunity,
} from "@/hooks/useCommunity";
import { cn } from "@/lib/utils";

export default function DashboardCommunity() {
  const { user } = useAuth();
  const { data: community, isLoading } = usePlatformCommunity();

  const { data: membership, isFetched: membershipChecked } = useMyMembership(community?.id, !!user);
  const isMember = membership?.status === "active";
  const canModerate = membership?.role === "owner" || membership?.role === "moderator";

  const join = useJoinCommunity();
  const { data: spaces = [] } = useCommunitySpaces(community?.id, isMember);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const { data: posts = [], isLoading: loadingPosts } = useCommunityPosts(community?.id, spaceId, isMember);
  const { data: likedIds = [] } = useMyLikes(community?.id, isMember);

  const createPost = useCreatePost();
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState("");

  // Every signed-in NexusFlo24 user belongs here, so join happens automatically on first visit.
  useEffect(() => {
    if (community && user && membershipChecked && !membership && !join.isPending && !join.isSuccess) {
      join.mutate({ id: community.id, workspace_id: community.workspace_id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community?.id, user?.id, membershipChecked, membership]);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  if (!community) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <h1 className="text-xl font-semibold">Community</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The member community is not available right now. Please try again shortly.
        </p>
      </div>
    );
  }

  const workspaceId = (membership as any)?.workspace_id ?? community.workspace_id;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{community.name}</h1>
          <Badge variant="secondary">Members</Badge>
        </div>
        {community.tagline && <p className="mt-1 text-sm text-muted-foreground">{community.tagline}</p>}
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> {community.member_count} member{community.member_count === 1 ? "" : "s"}
        </p>
        {community.description && <p className="mt-4 text-sm">{community.description}</p>}
        {community.guidelines && (
          <p className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            {community.guidelines}
          </p>
        )}

        {!isMember && (
          <div className="mt-5">
            <Button disabled={join.isPending} onClick={() => join.mutate({ id: community.id, workspace_id: community.workspace_id })}>
              {join.isPending ? "Joining…" : "Join the community"}
            </Button>
          </div>
        )}
      </header>

      {isMember && (
        <>
          {spaces.length > 1 && (
            <nav className="mt-6 flex flex-wrap gap-1 rounded-xl border bg-card p-1">
              <button
                type="button"
                onClick={() => setSpaceId(null)}
                className={cn("rounded-lg px-3 py-1.5 text-sm", !spaceId ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                All
              </button>
              {spaces.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSpaceId(s.id)}
                  className={cn("rounded-lg px-3 py-1.5 text-sm", spaceId === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  {s.name}
                </button>
              ))}
            </nav>
          )}

          <div className="mt-6 rounded-2xl border bg-card p-5">
            <Input
              value={title}
              placeholder="Title (optional)"
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              className="mt-2"
              rows={3}
              value={draft}
              placeholder="Share a win, ask a question or start a discussion…"
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="mt-3 flex justify-end">
              <Button
                disabled={!draft.trim() || createPost.isPending}
                onClick={async () => {
                  await createPost.mutateAsync({
                    communityId: community.id,
                    workspaceId,
                    spaceId: spaceId ?? spaces.find((s) => s.is_default)?.id ?? spaces[0]?.id ?? null,
                    title: title.trim(),
                    body: draft.trim(),
                  });
                  setDraft("");
                  setTitle("");
                }}
              >
                Post
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loadingPosts && <Skeleton className="h-32 rounded-2xl" />}
            {!loadingPosts && posts.length === 0 && (
              <p className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
                No posts yet — start the conversation.
              </p>
            )}
            {posts.map((p) => (
              <CommunityPostCard
                key={p.id}
                post={p}
                communityId={community.id}
                workspaceId={workspaceId}
                liked={likedIds.includes(p.id)}
                canModerate={!!canModerate}
                userId={user?.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
