import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, Lock, MessageSquare, Send, Trash2, Users } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import StorefrontShell from "@/components/commerce/StorefrontShell";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicStore } from "@/hooks/useStorefront";
import {
  CommunityPost,
  useAddComment, useCommunityPosts, useCommunitySpaces, useCreatePost, useDeletePost,
  useJoinCommunity, useMyLikes, useMyMembership, usePostComments, usePublicCommunity, useToggleLike,
} from "@/hooks/useCommunity";
import { cn } from "@/lib/utils";

function PostCard({
  post, communityId, workspaceId, liked, canModerate, userId,
}: {
  post: CommunityPost;
  communityId: string;
  workspaceId: string;
  liked: boolean;
  canModerate: boolean;
  userId?: string;
}) {
  const [openComments, setOpenComments] = useState(false);
  const [comment, setComment] = useState("");
  const { data: comments = [] } = usePostComments(openComments ? post.id : undefined);
  const addComment = useAddComment();
  const toggleLike = useToggleLike();
  const removePost = useDeletePost();

  return (
    <article className="rounded-2xl border bg-card p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          {post.is_pinned && <Badge variant="outline" className="mb-2">Pinned</Badge>}
          {post.title && <h3 className="font-semibold">{post.title}</h3>}
          <p className="text-xs text-muted-foreground">
            {post.author_name ?? "Member"} · {new Date(post.created_at).toLocaleString()}
          </p>
        </div>
        {(canModerate || post.author_user_id === userId) && (
          <Button variant="ghost" size="icon" aria-label="Delete post"
            onClick={() => removePost.mutate(post.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </header>

      <p className="mt-3 whitespace-pre-wrap text-sm">{post.body}</p>

      <footer className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <button
          type="button"
          className={cn("flex items-center gap-1.5 hover:text-foreground", liked && "text-primary")}
          onClick={() => toggleLike.mutate({ postId: post.id, communityId, liked })}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} /> {post.like_count}
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-foreground"
          onClick={() => setOpenComments((v) => !v)}
        >
          <MessageSquare className="h-4 w-4" /> {post.comment_count}
        </button>
      </footer>

      {openComments && (
        <div className="mt-4 space-y-3 border-t pt-4">
          {comments.map((c: any) => (
            <div key={c.id} className="text-sm">
              <p className="text-xs text-muted-foreground">
                {c.author_name ?? "Member"} · {new Date(c.created_at).toLocaleDateString()}
              </p>
              <p className="whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={comment}
              placeholder="Write a reply…"
              onChange={(e) => setComment(e.target.value)}
            />
            <Button
              size="icon"
              disabled={!comment.trim() || addComment.isPending}
              onClick={async () => {
                await addComment.mutateAsync({
                  postId: post.id, communityId, workspaceId, body: comment.trim(),
                });
                setComment("");
              }}
              aria-label="Send reply"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function StorefrontCommunity() {
  const { storeSlug, communitySlug } = useParams<{ storeSlug: string; communitySlug: string }>();
  const { user } = useAuth();
  const { data: store } = usePublicStore(storeSlug);
  const { data: community, isLoading } = usePublicCommunity(storeSlug, communitySlug);

  const { data: membership } = useMyMembership(community?.id, !!user);
  const isMember = membership?.status === "active";
  const canModerate = membership?.role === "owner" || membership?.role === "moderator";

  const { data: spaces = [] } = useCommunitySpaces(community?.id, isMember);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const { data: posts = [] } = useCommunityPosts(community?.id, spaceId, isMember);
  const { data: likedIds = [] } = useMyLikes(community?.id, isMember);

  const join = useJoinCommunity();
  const createPost = useCreatePost();
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");

  if (!store || isLoading) return <div className="p-10"><Skeleton className="h-64" /></div>;

  if (!community) {
    return (
      <StorefrontShell store={store}>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="text-2xl font-bold">Community not found</h1>
          <Button asChild className="mt-6" variant="outline">
            <Link to={`/s/${store.slug}/community`}>All communities</Link>
          </Button>
        </div>
      </StorefrontShell>
    );
  }

  const activeSpaceWorkspace = (membership as any)?.workspace_id;

  return (
    <StorefrontShell store={store}>
      <Seo title={`${community.name} | ${store.name}`} description={community.tagline ?? community.description ?? ""} />
      <div className="mx-auto max-w-3xl">
        <header className="rounded-2xl border bg-card p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{community.name}</h1>
            <Badge variant={community.access_type === "paid" ? "default" : "secondary"}>
              {community.access_type === "paid" ? "Members only" : "Free"}
            </Badge>
          </div>
          {community.tagline && <p className="mt-1 text-sm text-muted-foreground">{community.tagline}</p>}
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {community.member_count} member{community.member_count === 1 ? "" : "s"}
          </p>
          {community.description && <p className="mt-4 text-sm">{community.description}</p>}

          {!isMember && (
            <div className="mt-5">
              {!user ? (
                <Button asChild>
                  <Link to={`/login?redirect=/s/${store.slug}/community/${community.slug}`}>
                    Sign in to join
                  </Link>
                </Button>
              ) : community.access_type === "free" ? (
                <Button disabled={join.isPending} onClick={() => join.mutate({ id: community.id })}>
                  Join community
                </Button>
              ) : community.product_slug ? (
                <Button asChild>
                  <Link to={`/s/${store.slug}/p/${community.product_slug}`}>
                    <Lock className="mr-2 h-4 w-4" /> Get access
                  </Link>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Membership opens soon.</p>
              )}
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
                placeholder={`Share something with the ${community.name} community…`}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="mt-3 flex justify-end">
                <Button
                  disabled={!draft.trim() || createPost.isPending}
                  onClick={async () => {
                    await createPost.mutateAsync({
                      communityId: community.id,
                      workspaceId: activeSpaceWorkspace,
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
              {posts.length === 0 && (
                <p className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
                  No posts yet — start the conversation.
                </p>
              )}
              {posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  communityId={community.id}
                  workspaceId={activeSpaceWorkspace}
                  liked={likedIds.includes(p.id)}
                  canModerate={!!canModerate}
                  userId={user?.id}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </StorefrontShell>
  );
}
