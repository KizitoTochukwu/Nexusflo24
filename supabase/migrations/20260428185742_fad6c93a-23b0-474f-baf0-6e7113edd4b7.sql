
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  category text NOT NULL DEFAULT 'MARKETING',
  body_preview text NOT NULL DEFAULT '',
  variable_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'approved',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name, language)
);

CREATE INDEX IF NOT EXISTS whatsapp_templates_workspace_idx
  ON public.whatsapp_templates (workspace_id);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace whatsapp_templates"
  ON public.whatsapp_templates FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can insert workspace whatsapp_templates"
  ON public.whatsapp_templates FOR INSERT TO authenticated
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update workspace whatsapp_templates"
  ON public.whatsapp_templates FOR UPDATE TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete workspace whatsapp_templates"
  ON public.whatsapp_templates FOR DELETE TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE TRIGGER whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
