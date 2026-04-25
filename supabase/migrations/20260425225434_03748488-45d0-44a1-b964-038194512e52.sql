-- forms table
CREATE TABLE public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  slug text UNIQUE,
  description text DEFAULT ''::text,
  status text NOT NULL DEFAULT 'draft',
  schema jsonb NOT NULL DEFAULT '{"steps":[{"id":"step-1","title":"","fields":[]}]}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{"submit_text":"Submit","success_message":"Thanks! We received your submission.","redirect_url":"","source":"Form","tags":[],"folder_name":"","pipeline_stage":"new_lead"}'::jsonb,
  theme jsonb NOT NULL DEFAULT '{"bg_color":"#FFFFFF","accent_color":"#0B1F3B","text_color":"#0B1F3B","font":"Inter","border_radius":12,"logo_url":""}'::jsonb,
  submission_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace forms" ON public.forms
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can insert workspace forms" ON public.forms
FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can update workspace forms" ON public.forms
FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace forms" ON public.forms
FOR DELETE TO authenticated
USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Public can view active forms" ON public.forms
FOR SELECT TO public
USING (status = 'active');

-- slug trigger (mirrors funnels)
CREATE OR REPLACE FUNCTION public.generate_form_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := regexp_replace(NEW.slug, '(^-|-$)', '', 'g');
    NEW.slug := NEW.slug || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER forms_generate_slug
BEFORE INSERT ON public.forms
FOR EACH ROW EXECUTE FUNCTION public.generate_form_slug();

CREATE TRIGGER forms_set_updated_at
BEFORE UPDATE ON public.forms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_forms_workspace_id ON public.forms(workspace_id);
CREATE INDEX idx_forms_slug ON public.forms(slug);

-- form_submissions table
CREATE TABLE public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  lead_id uuid,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace form_submissions" ON public.form_submissions
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace form_submissions" ON public.form_submissions
FOR DELETE TO authenticated
USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Public can insert form_submissions" ON public.form_submissions
FOR INSERT TO public
WITH CHECK (form_id IN (SELECT id FROM public.forms WHERE status = 'active'));

CREATE POLICY "Service can manage form_submissions" ON public.form_submissions
FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX idx_form_submissions_workspace_id ON public.form_submissions(workspace_id);