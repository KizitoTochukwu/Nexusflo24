import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Community tables are new; generated types may lag behind the migration. */
const db = supabase as any;

export type Community = {
  id: string;
  workspace_id: string;
  store_id: string;
  product_id: string | null;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  cover_url: string | null;
  access_type: "free" | "paid";
  visibility: "public" | "private";
  status: "active" | "archived";
  member_count: number;
  guidelines: string | null;
  created_at: string;
};

export type CommunitySpace = {
  id: string;
  community_id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  is_default: boolean;
};

export type CommunityPost = {
  id: string;
  community_id: string;
  space_id: string | null;
  author_user_id: string | null;
  author_name: string | null;
  title: string | null;
  body: string;
  is_pinned: boolean;
  comment_count: number;
  like_count: number;
  created_at: string;
};

export type CommunityMember = {
  id: string;
  community_id: string;
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  role: "owner" | "moderator" | "member";
  status: "active" | "pending" | "removed";
  joined_at: string;
};

/* ------------------------------- Dashboard ------------------------------- */

export function useCommunities(storeId?: string) {
  return useQuery({
    queryKey: ["shop-communities", storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<Community[]> => {
      const { data, error } = await db
        .from("shop_communities")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Community> & { workspace_id: string; store_id: string; name: string; slug: string }) => {
      const { data, error } = await db
        .from("shop_communities")
        .upsert(payload, { onConflict: "id" })
        .select()
        .maybeSingle();
      if (error) throw error;

      // Every community needs at least one space to post in.
      if (data?.id) {
        const { count } = await db
          .from("shop_community_spaces")
          .select("id", { count: "exact", head: true })
          .eq("community_id", data.id);
        if (!count) {
          await db.from("shop_community_spaces").insert({
            workspace_id: data.workspace_id,
            community_id: data.id,
            name: "General",
            slug: "general",
            is_default: true,
          });
        }
      }
      return data as Community;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-communities"] });
      toast.success("Community saved.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the community."),
  });
}

export function useDeleteCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("shop_communities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-communities"] });
      toast.success("Community deleted.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not delete the community."),
  });
}

export function useCommunityMembers(communityId?: string) {
  return useQuery({
    queryKey: ["community-members", communityId],
    enabled: !!communityId,
    queryFn: async (): Promise<CommunityMember[]> => {
      const { data, error } = await db
        .from("shop_community_members")
        .select("*")
        .eq("community_id", communityId)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* -------------------------------- Public --------------------------------- */

export type PublicCommunity = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  cover_url: string | null;
  access_type: "free" | "paid";
  member_count: number;
  product_id: string | null;
  product_slug: string | null;
};

export function usePublicCommunities(storeSlug?: string) {
  return useQuery({
    queryKey: ["public-communities", storeSlug],
    enabled: !!storeSlug,
    queryFn: async (): Promise<PublicCommunity[]> => {
      const { data, error } = await db.rpc("get_public_communities", { p_store_slug: storeSlug });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePublicCommunity(storeSlug?: string, communitySlug?: string) {
  const list = usePublicCommunities(storeSlug);
  return {
    ...list,
    data: list.data?.find((c) => c.slug === communitySlug) ?? null,
  };
}

/** Membership state for the signed-in shopper (claims paid access by email first). */
export function useMyMembership(communityId?: string, enabled = true) {
  return useQuery({
    queryKey: ["my-community-membership", communityId],
    enabled: !!communityId && enabled,
    queryFn: async (): Promise<CommunityMember | null> => {
      await db.rpc("claim_community_memberships");
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return null;
      const { data, error } = await db
        .from("shop_community_members")
        .select("*")
        .eq("community_id", communityId)
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useJoinCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (community: { id: string; workspace_id?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error("Please sign in to join this community.");

      let workspaceId = community.workspace_id;
      if (!workspaceId) {
        const { data: row } = await db
          .from("shop_communities")
          .select("workspace_id")
          .eq("id", community.id)
          .maybeSingle();
        workspaceId = row?.workspace_id;
      }

      const { error } = await db.from("shop_community_members").insert({
        community_id: community.id,
        workspace_id: workspaceId,
        user_id: user.id,
        email: user.email,
        display_name: (user.user_metadata as any)?.full_name ?? user.email,
        role: "member",
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-community-membership"] });
      toast.success("Welcome to the community!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not join this community."),
  });
}

export function useCommunitySpaces(communityId?: string, enabled = true) {
  return useQuery({
    queryKey: ["community-spaces", communityId],
    enabled: !!communityId && enabled,
    queryFn: async (): Promise<CommunitySpace[]> => {
      const { data, error } = await db
        .from("shop_community_spaces")
        .select("*")
        .eq("community_id", communityId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCommunityPosts(communityId?: string, spaceId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["community-posts", communityId, spaceId ?? "all"],
    enabled: !!communityId && enabled,
    queryFn: async (): Promise<CommunityPost[]> => {
      let q = db
        .from("shop_community_posts")
        .select("*")
        .eq("community_id", communityId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (spaceId) q = q.eq("space_id", spaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      communityId: string;
      workspaceId: string;
      spaceId?: string | null;
      title?: string;
      body: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error("Please sign in to post.");
      const { error } = await db.from("shop_community_posts").insert({
        community_id: input.communityId,
        workspace_id: input.workspaceId,
        space_id: input.spaceId ?? null,
        author_user_id: user.id,
        author_name: (user.user_metadata as any)?.full_name ?? user.email,
        title: input.title || null,
        body: input.body,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-posts"] }),
    onError: (e: any) => toast.error(e?.message ?? "Could not publish your post."),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("shop_community_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-posts"] }),
    onError: (e: any) => toast.error(e?.message ?? "Could not delete the post."),
  });
}

export function usePostComments(postId?: string) {
  return useQuery({
    queryKey: ["community-comments", postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await db
        .from("shop_community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; communityId: string; workspaceId: string; body: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) throw new Error("Please sign in to comment.");
      const { error } = await db.from("shop_community_comments").insert({
        post_id: input.postId,
        community_id: input.communityId,
        workspace_id: input.workspaceId,
        author_user_id: user.id,
        author_name: (user.user_metadata as any)?.full_name ?? user.email,
        body: input.body,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["community-comments", v.postId] });
      qc.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not add your comment."),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; communityId: string; liked: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error("Please sign in first.");
      if (input.liked) {
        const { error } = await db
          .from("shop_community_post_likes")
          .delete()
          .eq("post_id", input.postId)
          .eq("user_id", uid);
        if (error) throw error;
      } else {
        const { error } = await db.from("shop_community_post_likes").insert({
          post_id: input.postId,
          community_id: input.communityId,
          user_id: uid,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-posts"] });
      qc.invalidateQueries({ queryKey: ["community-likes"] });
    },
  });
}

export function useMyLikes(communityId?: string, enabled = true) {
  return useQuery({
    queryKey: ["community-likes", communityId],
    enabled: !!communityId && enabled,
    queryFn: async (): Promise<string[]> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return [];
      const { data, error } = await db
        .from("shop_community_post_likes")
        .select("post_id")
        .eq("community_id", communityId)
        .eq("user_id", uid);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.post_id);
    },
  });
}
