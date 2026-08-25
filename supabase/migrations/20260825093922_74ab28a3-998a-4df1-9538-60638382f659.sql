CREATE TABLE public.shop_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  store_id uuid NOT NULL REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.shop_products(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.shop_orders(id) ON DELETE SET NULL,
  user_id uuid,
  email text NOT NULL,
  kind text NOT NULL DEFAULT 'digital',
  resource_ref text NOT NULL,
  resource_label text,
  status text NOT NULL DEFAULT 'active',
  source text NOT NULL DEFAULT 'purchase',
  stripe_subscription_id text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX shop_entitlements_unique_grant
  ON public.shop_entitlements (store_id, kind, resource_ref, lower(email));
CREATE INDEX shop_entitlements_user_idx ON public.shop_entitlements (user_id);
CREATE INDEX shop_entitlements_email_idx ON public.shop_entitlements (lower(email));
CREATE INDEX shop_entitlements_sub_idx ON public.shop_entitlements (stripe_subscription_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_entitlements TO authenticated;
GRANT ALL ON public.shop_entitlements TO service_role;

ALTER TABLE public.shop_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage entitlements" ON public.shop_entitlements
  FOR ALL TO authenticated
  USING (public.can_manage_commerce(auth.uid(), workspace_id))
  WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

CREATE POLICY "buyer reads own entitlements" ON public.shop_entitlements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_shop_entitlements_updated_at
  BEFORE UPDATE ON public.shop_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant access when an order is paid
CREATE OR REPLACE FUNCTION public.grant_entitlements_on_paid_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status <> 'paid' OR (TG_OP = 'UPDATE' AND OLD.status = 'paid') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.shop_entitlements (
    workspace_id, store_id, product_id, order_id, user_id, email,
    kind, resource_ref, resource_label, status, source, stripe_subscription_id
  )
  SELECT DISTINCT ON (kind_calc.kind, kind_calc.ref)
    NEW.workspace_id, NEW.store_id, p.id, NEW.id, NEW.user_id, lower(NEW.email),
    kind_calc.kind, kind_calc.ref, p.name, 'active', 'purchase', NEW.stripe_subscription_id
  FROM public.shop_order_items i
  JOIN public.shop_products p ON p.id = i.product_id
  CROSS JOIN LATERAL (
    SELECT
      CASE WHEN p.product_type = 'course' THEN 'course'
           WHEN p.product_type = 'membership' THEN 'membership'
           WHEN p.product_type = 'digital' THEN 'digital'
           ELSE 'service' END AS kind,
      CASE WHEN p.product_type = 'course' AND p.academy_course_slug IS NOT NULL
           THEN p.academy_course_slug ELSE p.id::text END AS ref
  ) kind_calc
  WHERE i.order_id = NEW.id
    AND p.product_type IN ('course', 'membership', 'digital')
  ON CONFLICT (store_id, kind, resource_ref, lower(email)) DO UPDATE
    SET status = 'active',
        revoked_at = NULL,
        revoke_reason = NULL,
        order_id = EXCLUDED.order_id,
        user_id = COALESCE(EXCLUDED.user_id, public.shop_entitlements.user_id),
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        granted_at = now(),
        updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grant_entitlements
  AFTER INSERT OR UPDATE OF status ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.grant_entitlements_on_paid_order();

-- Revoke access when an order is refunded or cancelled
CREATE OR REPLACE FUNCTION public.revoke_entitlements_on_order_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('refunded', 'cancelled') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  UPDATE public.shop_entitlements
  SET status = 'revoked', revoked_at = now(), revoke_reason = NEW.status, updated_at = now()
  WHERE order_id = NEW.id AND status = 'active';

  UPDATE public.shop_community_members
  SET status = 'suspended'
  WHERE order_id = NEW.id AND status = 'active';

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_revoke_entitlements
  AFTER UPDATE OF status ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.revoke_entitlements_on_order_change();

-- Does the signed-in user hold an active grant?
CREATE OR REPLACE FUNCTION public.has_shop_entitlement(_kind text, _resource_ref text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_entitlements e
    WHERE e.kind = _kind
      AND e.resource_ref = _resource_ref
      AND e.status = 'active'
      AND (e.expires_at IS NULL OR e.expires_at > now())
      AND (
        e.user_id = auth.uid()
        OR lower(e.email) = (SELECT lower(email) FROM public.profiles WHERE id = auth.uid())
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_shop_entitlement(text, text) TO authenticated;

-- Everything the signed-in buyer has access to
CREATE OR REPLACE FUNCTION public.get_my_shop_entitlements()
RETURNS TABLE(
  id uuid, kind text, resource_ref text, resource_label text, status text,
  granted_at timestamptz, expires_at timestamptz, product_id uuid,
  store_slug text, store_name text, order_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT e.id, e.kind, e.resource_ref, e.resource_label, e.status,
         e.granted_at, e.expires_at, e.product_id,
         s.slug, s.name, e.order_id
  FROM public.shop_entitlements e
  JOIN public.shop_stores s ON s.id = e.store_id
  WHERE e.user_id = auth.uid()
     OR lower(e.email) = (SELECT lower(email) FROM public.profiles WHERE id = auth.uid())
  ORDER BY e.granted_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_shop_entitlements() TO authenticated;

-- Link guest purchases to the account after sign-in
CREATE OR REPLACE FUNCTION public.claim_shop_entitlements()
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
    UPDATE public.shop_entitlements e
    SET user_id = _uid, updated_at = now()
    WHERE e.user_id IS NULL AND lower(e.email) = _email
    RETURNING e.id
  )
  SELECT count(*) INTO _count FROM claimed;
  RETURN _count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_shop_entitlements() TO authenticated;