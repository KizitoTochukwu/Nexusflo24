REVOKE EXECUTE ON FUNCTION public.workspace_role(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_commerce(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_fulfil_orders(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.workspace_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_commerce(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_fulfil_orders(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_public_store(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_public_store_products(text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_public_store_product(text, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_public_store_collections(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_store(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_store_products(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_store_product(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_store_collections(text) TO anon, authenticated;

CREATE POLICY "no client access to webhook log" ON public.processed_webhook_events
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);