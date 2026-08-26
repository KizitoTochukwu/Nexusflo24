DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'claim_community_memberships','claim_shop_entitlements','claim_shop_orders',
    'convert_lead_to_contact','ensure_default_pipeline',
    'get_my_shop_entitlements','get_my_shop_purchases','get_booking_calendar_status'
  ]
  LOOP
    EXECUTE (
      SELECT coalesce(string_agg(
        format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role;',
               p.proname, pg_get_function_identity_arguments(p.oid),
               p.proname, pg_get_function_identity_arguments(p.oid)), ' '), 'SELECT 1')
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    );
  END LOOP;
END $$;