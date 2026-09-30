import { useState } from "react";
import { Heart, MessageSquare, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CommunityPost, useAddComment, useDeletePost, usePostComments, useToggleLike,
} from "@/hooks/useCommunity";
import { cn } from "@/lib/utils";

/** A single discussion post with its likes and replies. Shared by the storefront and the dashboard. */
export default function CommunityPostCard({
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
