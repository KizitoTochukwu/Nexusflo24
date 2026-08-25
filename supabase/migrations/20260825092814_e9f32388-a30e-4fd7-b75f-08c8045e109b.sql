-- 1) Guest/authenticated order lookup for the storefront portal
CREATE OR REPLACE FUNCTION public.get_public_shop_order(p_order_id uuid, p_email text DEFAULT NULL)
RETURNS TABLE(
  id uuid, order_number text, status text, fulfilment_status text, currency text,
  subtotal_amount integer, discount_amount integer, shipping_amount integer,
  tax_amount integer, total_amount integer, refunded_amount integer,
  email text, full_name text, shipping_address jsonb, store_slug text, store_name text,
  stripe_subscription_id text, created_at timestamptz,
  items jsonb, files jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.id, o.order_number, o.status, o.fulfilment_status, o.currency,
         o.subtotal_amount, o.discount_amount, o.shipping_amount,
         o.tax_amount, o.total_amount, o.refunded_amount,
         o.email, o.full_name, o.shipping_address, s.slug, s.name,
         o.stripe_subscription_id, o.created_at,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'id', i.id, 'name', i.name, 'quantity', i.quantity,
             'unit_amount', i.unit_amount, 'total_amount', i.total_amount,
             'product_id', i.product_id
           ) ORDER BY i.created_at)
           FROM public.shop_order_items i WHERE i.order_id = o.id
         ), '[]'::jsonb),
         CASE WHEN o.status IN ('paid','partially_refunded') THEN COALESCE((
           SELECT jsonb_agg(DISTINCT jsonb_build_object(
             'id', f.id, 'file_name', f.file_name, 'product_id', f.product_id
           ))
           FROM public.shop_product_files f
           JOIN public.shop_order_items i2 ON i2.product_id = f.product_id AND i2.order_id = o.id
         ), '[]'::jsonb) ELSE '[]'::jsonb END
  FROM public.shop_orders o
  JOIN public.shop_stores s ON s.id = o.store_id
  WHERE o.id = p_order_id
    AND (
      (auth.uid() IS NOT NULL AND o.user_id = auth.uid())
      OR (p_email IS NOT NULL AND lower(btrim(p_email)) = lower(o.email))
      OR public.is_workspace_member(auth.uid(), o.workspace_id)
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_shop_order(uuid, text) TO anon, authenticated;

-- 2) Link guest orders to an account once the buyer signs in
CREATE OR REPLACE FUNCTION public.claim_shop_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _count integer := 0;
BEGIN
  IF _uid IS NULL THEN RETURN 0; END IF;

  SELECT lower(email) INTO _email FROM public.profiles WHERE id = _uid;
  IF _email IS NULL OR _email = '' THEN RETURN 0; END IF;

  WITH claimed AS (
    UPDATE public.shop_orders
    SET user_id = _uid, updated_at = now()
    WHERE user_id IS NULL AND lower(email) = _email
    RETURNING id
  )
  SELECT count(*) INTO _count FROM claimed;

  UPDATE public.shop_customers
  SET user_id = _uid, updated_at = now()
  WHERE user_id IS NULL AND lower(email) = _email;

  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_shop_orders() TO authenticated;

-- 3) Purchase history for a signed-in shopper across every store
CREATE OR REPLACE FUNCTION public.get_my_shop_purchases()
RETURNS TABLE(
  id uuid, order_number text, status text, fulfilment_status text,
  currency text, total_amount integer, created_at timestamptz,
  store_slug text, store_name text, store_logo_url text,
  stripe_subscription_id text, item_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.id, o.order_number, o.status, o.fulfilment_status,
         o.currency, o.total_amount, o.created_at,
         s.slug, s.name, b.logo_url, o.stripe_subscription_id,
         (SELECT count(*) FROM public.shop_order_items i WHERE i.order_id = o.id)
  FROM public.shop_orders o
  JOIN public.shop_stores s ON s.id = o.store_id
  LEFT JOIN public.shop_store_branding b ON b.store_id = s.id
  WHERE auth.uid() IS NOT NULL AND o.user_id = auth.uid()
  ORDER BY o.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_shop_purchases() TO authenticated;