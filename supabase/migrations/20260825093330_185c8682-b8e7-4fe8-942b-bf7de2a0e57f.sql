-- ============ Communities ============
CREATE TABLE public.shop_communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.shop_products(id) ON DELETE SET NULL,
  slug text NOT NULL,
  name text NOT NULL,
  tagline text,
  description text,
  cover_url text,
  access_type text NOT NULL DEFAULT 'free',
  visibility text NOT NULL DEFAULT 'public',
  status text NOT NULL DEFAULT 'active',
  member_count integer NOT NULL DEFAULT 0,
  guidelines text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);

CREATE TABLE public.shop_community_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.shop_communities(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, slug)
);

CREATE TABLE public.shop_community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.shop_communities(id) ON DELETE CASCADE,
  user_id uuid,
  email text,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  order_id uuid REFERENCES public.shop_orders(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  UNIQUE (community_id, user_id)
);
CREATE INDEX idx_shop_community_members_user ON public.shop_community_members(user_id);
CREATE INDEX idx_shop_community_members_email ON public.shop_community_members(lower(email));

CREATE TABLE public.shop_community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.shop_communities(id) ON DELETE CASCADE,
  space_id uuid REFERENCES public.shop_community_spaces(id) ON DELETE SET NULL,
  author_user_id uuid,
  author_name text,
  title text,
  body text NOT NULL,
  media_url text,
  is_pinned boolean NOT NULL DEFAULT false,
  comment_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_community_posts_community ON public.shop_community_posts(community_id, created_at DESC);

CREATE TABLE public.shop_community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.shop_communities(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.shop_community_posts(id) ON DELETE CASCADE,
  author_user_id uuid,
  author_name text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_community_comments_post ON public.shop_community_comments(post_id, created_at);

CREATE TABLE public.shop_community_post_likes (
  post_id uuid NOT NULL REFERENCES public.shop_community_posts(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.shop_communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- ============ Grants ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_communities TO authenticated;
GRANT SELECT ON public.shop_communities TO anon;
GRANT ALL ON public.shop_communities TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_community_spaces TO authenticated;
GRANT SELECT ON public.shop_community_spaces TO anon;
GRANT ALL ON public.shop_community_spaces TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_community_members TO authenticated;
GRANT ALL ON public.shop_community_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_community_posts TO authenticated;
GRANT ALL ON public.shop_community_posts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_community_comments TO authenticated;
GRANT ALL ON public.shop_community_comments TO service_role;

GRANT SELECT, INSERT, DELETE ON public.shop_community_post_likes TO authenticated;
GRANT ALL ON public.shop_community_post_likes TO service_role;

-- ============ Helpers ============
CREATE OR REPLACE FUNCTION public.is_community_member(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_community_members m
    WHERE m.community_id = _community_id
      AND m.user_id = _user_id
      AND m.status = 'active'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.can_moderate_community(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_communities c
    WHERE c.id = _community_id
      AND public.can_manage_commerce(_user_id, c.workspace_id)
  ) OR EXISTS (
    SELECT 1 FROM public.shop_community_members m
    WHERE m.community_id = _community_id
      AND m.user_id = _user_id
      AND m.status = 'active'
      AND m.role IN ('owner','moderator')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_moderate_community(uuid, uuid) FROM anon;

-- ============ RLS ============
ALTER TABLE public.shop_communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads listed communities" ON public.shop_communities
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND visibility = 'public');
CREATE POLICY "members read their communities" ON public.shop_communities
  FOR SELECT TO authenticated
  USING (public.is_community_member(auth.uid(), id) OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write communities" ON public.shop_communities
  FOR ALL TO authenticated
  USING (public.can_manage_commerce(auth.uid(), workspace_id))
  WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

ALTER TABLE public.shop_community_spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads public community spaces" ON public.shop_community_spaces
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.shop_communities c WHERE c.id = community_id AND c.visibility = 'public' AND c.status = 'active'));
CREATE POLICY "members read spaces" ON public.shop_community_spaces
  FOR SELECT TO authenticated
  USING (public.is_community_member(auth.uid(), community_id) OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write spaces" ON public.shop_community_spaces
  FOR ALL TO authenticated
  USING (public.can_manage_commerce(auth.uid(), workspace_id))
  WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

ALTER TABLE public.shop_community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member reads own membership" ON public.shop_community_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "members read the roster" ON public.shop_community_members
  FOR SELECT TO authenticated
  USING (public.is_community_member(auth.uid(), community_id) OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "self joins free communities" ON public.shop_community_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'member'
    AND EXISTS (
      SELECT 1 FROM public.shop_communities c
      WHERE c.id = community_id AND c.status = 'active'
        AND c.access_type = 'free' AND c.visibility = 'public'
        AND c.workspace_id = shop_community_members.workspace_id
    )
  );
CREATE POLICY "member leaves community" ON public.shop_community_members
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "managers write members" ON public.shop_community_members
  FOR ALL TO authenticated
  USING (public.can_manage_commerce(auth.uid(), workspace_id))
  WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

ALTER TABLE public.shop_community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read posts" ON public.shop_community_posts
  FOR SELECT TO authenticated
  USING (public.is_community_member(auth.uid(), community_id) OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members create posts" ON public.shop_community_posts
  FOR INSERT TO authenticated
  WITH CHECK (author_user_id = auth.uid() AND public.is_community_member(auth.uid(), community_id));
CREATE POLICY "author or moderator updates posts" ON public.shop_community_posts
  FOR UPDATE TO authenticated
  USING (author_user_id = auth.uid() OR public.can_moderate_community(auth.uid(), community_id))
  WITH CHECK (author_user_id = auth.uid() OR public.can_moderate_community(auth.uid(), community_id));
CREATE POLICY "author or moderator deletes posts" ON public.shop_community_posts
  FOR DELETE TO authenticated
  USING (author_user_id = auth.uid() OR public.can_moderate_community(auth.uid(), community_id));

ALTER TABLE public.shop_community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read comments" ON public.shop_community_comments
  FOR SELECT TO authenticated
  USING (public.is_community_member(auth.uid(), community_id) OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "members create comments" ON public.shop_community_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_user_id = auth.uid() AND public.is_community_member(auth.uid(), community_id));
CREATE POLICY "author or moderator deletes comments" ON public.shop_community_comments
  FOR DELETE TO authenticated
  USING (author_user_id = auth.uid() OR public.can_moderate_community(auth.uid(), community_id));

ALTER TABLE public.shop_community_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read likes" ON public.shop_community_post_likes
  FOR SELECT TO authenticated
  USING (public.is_community_member(auth.uid(), community_id));
CREATE POLICY "member likes a post" ON public.shop_community_post_likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_community_member(auth.uid(), community_id));
CREATE POLICY "member unlikes a post" ON public.shop_community_post_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ Counters and entitlement ============
CREATE TRIGGER trg_shop_communities_updated_at BEFORE UPDATE ON public.shop_communities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_shop_community_posts_updated_at BEFORE UPDATE ON public.shop_community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.shop_community_counters()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_TABLE_NAME = 'shop_community_members' THEN
    UPDATE public.shop_communities c
    SET member_count = (SELECT count(*) FROM public.shop_community_members m
                        WHERE m.community_id = c.id AND m.status = 'active')
    WHERE c.id = COALESCE(NEW.community_id, OLD.community_id);
  ELSIF TG_TABLE_NAME = 'shop_community_comments' THEN
    UPDATE public.shop_community_posts p
    SET comment_count = (SELECT count(*) FROM public.shop_community_comments cm WHERE cm.post_id = p.id)
    WHERE p.id = COALESCE(NEW.post_id, OLD.post_id);
  ELSE
    UPDATE public.shop_community_posts p
    SET like_count = (SELECT count(*) FROM public.shop_community_post_likes l WHERE l.post_id = p.id)
    WHERE p.id = COALESCE(NEW.post_id, OLD.post_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_community_member_count AFTER INSERT OR UPDATE OR DELETE ON public.shop_community_members
  FOR EACH ROW EXECUTE FUNCTION public.shop_community_counters();
CREATE TRIGGER trg_community_comment_count AFTER INSERT OR DELETE ON public.shop_community_comments
  FOR EACH ROW EXECUTE FUNCTION public.shop_community_counters();
CREATE TRIGGER trg_community_like_count AFTER INSERT OR DELETE ON public.shop_community_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.shop_community_counters();

-- Grant community access when an order containing a linked product is paid
CREATE OR REPLACE FUNCTION public.grant_community_access_on_paid_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status <> 'paid' OR (TG_OP = 'UPDATE' AND OLD.status = 'paid') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.shop_community_members (workspace_id, community_id, user_id, email, display_name, role, status, order_id)
  SELECT c.workspace_id, c.id, NEW.user_id, lower(NEW.email), NEW.full_name, 'member', 'active', NEW.id
  FROM public.shop_order_items i
  JOIN public.shop_communities c ON c.product_id = i.product_id AND c.status = 'active'
  WHERE i.order_id = NEW.id
  ON CONFLICT (community_id, user_id) DO UPDATE
    SET status = 'active', order_id = EXCLUDED.order_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grant_community_access
  AFTER INSERT OR UPDATE OF status ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.grant_community_access_on_paid_order();

-- Link a paid buyer's community access to their account after they sign in
CREATE OR REPLACE FUNCTION public.claim_community_memberships()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _count integer := 0;
BEGIN
  IF _uid IS NULL THEN RETURN 0; END IF;
  SELECT lower(email) INTO _email FROM public.profiles WHERE id = _uid;
  IF _email IS NULL OR _email = '' THEN RETURN 0; END IF;

  WITH claimed AS (
    UPDATE public.shop_community_members m
    SET user_id = _uid
    WHERE m.user_id IS NULL AND lower(m.email) = _email
      AND NOT EXISTS (
        SELECT 1 FROM public.shop_community_members x
        WHERE x.community_id = m.community_id AND x.user_id = _uid
      )
    RETURNING m.id
  )
  SELECT count(*) INTO _count FROM claimed;
  RETURN _count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_community_memberships() TO authenticated;

-- Public community directory / preview for a storefront
CREATE OR REPLACE FUNCTION public.get_public_communities(p_store_slug text)
RETURNS TABLE(
  id uuid, slug text, name text, tagline text, description text, cover_url text,
  access_type text, member_count integer, product_id uuid, product_slug text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.id, c.slug, c.name, c.tagline, c.description, c.cover_url,
         c.access_type, c.member_count, c.product_id, p.slug
  FROM public.shop_communities c
  JOIN public.shop_stores s ON s.id = c.store_id
  LEFT JOIN public.shop_products p ON p.id = c.product_id
  WHERE s.slug = p_store_slug AND c.status = 'active' AND c.visibility = 'public'
  ORDER BY c.created_at;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_communities(text) TO anon, authenticated;