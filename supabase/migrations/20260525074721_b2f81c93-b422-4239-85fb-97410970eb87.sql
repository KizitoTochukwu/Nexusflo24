
DROP POLICY IF EXISTS "Public can view active forms" ON public.forms;

CREATE OR REPLACE FUNCTION public.get_public_form(p_slug text)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  slug text,
  name text,
  description text,
  status text,
  schema jsonb,
  theme jsonb,
  settings jsonb,
  submission_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, workspace_id, slug, name, description, status, schema, theme,
         (settings - 'notify_emails') AS settings,
         submission_count, created_at, updated_at
  FROM public.forms
  WHERE slug = p_slug AND status = 'active'
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_form(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can insert funnel visits" ON public.funnel_visits;
CREATE POLICY "Anyone can insert funnel visits for active funnels"
ON public.funnel_visits FOR INSERT TO public
WITH CHECK (funnel_id IN (SELECT id FROM public.funnels WHERE status = 'active'));

-- booking_pages
DROP POLICY IF EXISTS "Members can delete workspace booking_pages" ON public.booking_pages;
DROP POLICY IF EXISTS "Members can insert workspace booking_pages" ON public.booking_pages;
DROP POLICY IF EXISTS "Members can update workspace booking_pages" ON public.booking_pages;
DROP POLICY IF EXISTS "Members can view workspace booking_pages" ON public.booking_pages;
CREATE POLICY "Members can view workspace booking_pages" ON public.booking_pages FOR SELECT TO authenticated USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace booking_pages" ON public.booking_pages FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace booking_pages" ON public.booking_pages FOR UPDATE TO authenticated USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))) WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace booking_pages" ON public.booking_pages FOR DELETE TO authenticated USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

-- email_settings
DROP POLICY IF EXISTS "Workspace admins can delete email_settings" ON public.email_settings;
DROP POLICY IF EXISTS "Workspace admins can insert email_settings" ON public.email_settings;
DROP POLICY IF EXISTS "Workspace admins can update email_settings" ON public.email_settings;
DROP POLICY IF EXISTS "Workspace admins can view email_settings" ON public.email_settings;
CREATE POLICY "Workspace admins can view email_settings" ON public.email_settings FOR SELECT TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can insert email_settings" ON public.email_settings FOR INSERT TO authenticated WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can update email_settings" ON public.email_settings FOR UPDATE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can delete email_settings" ON public.email_settings FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- whatsapp_settings
DROP POLICY IF EXISTS "Workspace admins can delete whatsapp_settings" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Workspace admins can insert whatsapp_settings" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Workspace admins can update whatsapp_settings" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Workspace admins can view whatsapp_settings" ON public.whatsapp_settings;
CREATE POLICY "Workspace admins can view whatsapp_settings" ON public.whatsapp_settings FOR SELECT TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can insert whatsapp_settings" ON public.whatsapp_settings FOR INSERT TO authenticated WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can update whatsapp_settings" ON public.whatsapp_settings FOR UPDATE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Workspace admins can delete whatsapp_settings" ON public.whatsapp_settings FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- sales_closer_settings
DROP POLICY IF EXISTS "Admins can insert sales_closer_settings" ON public.sales_closer_settings;
DROP POLICY IF EXISTS "Admins can update sales_closer_settings" ON public.sales_closer_settings;
DROP POLICY IF EXISTS "Admins can view sales_closer_settings" ON public.sales_closer_settings;
DROP POLICY IF EXISTS "Members can view sales_closer_settings" ON public.sales_closer_settings;
CREATE POLICY "Members can view sales_closer_settings" ON public.sales_closer_settings FOR SELECT TO authenticated USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "Admins can insert sales_closer_settings" ON public.sales_closer_settings FOR INSERT TO authenticated WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));
CREATE POLICY "Admins can update sales_closer_settings" ON public.sales_closer_settings FOR UPDATE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

-- sales_conversations
DROP POLICY IF EXISTS "Members can delete workspace sales_conversations" ON public.sales_conversations;
DROP POLICY IF EXISTS "Members can insert workspace sales_conversations" ON public.sales_conversations;
DROP POLICY IF EXISTS "Members can update workspace sales_conversations" ON public.sales_conversations;
DROP POLICY IF EXISTS "Members can view workspace sales_conversations" ON public.sales_conversations;
CREATE POLICY "Members can view workspace sales_conversations" ON public.sales_conversations FOR SELECT TO authenticated USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace sales_conversations" ON public.sales_conversations FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace sales_conversations" ON public.sales_conversations FOR UPDATE TO authenticated USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))) WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace sales_conversations" ON public.sales_conversations FOR DELETE TO authenticated USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS "Members can view workspace whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Members can view workspace whatsapp_messages" ON public.whatsapp_messages FOR SELECT TO authenticated USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- email-assets storage hardening
DROP POLICY IF EXISTS "Authenticated users can upload email assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update email assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete email assets" ON storage.objects;
CREATE POLICY "Workspace members can upload email assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'email-assets' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Workspace members can update email assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'email-assets' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Workspace members can delete email assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'email-assets' AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
