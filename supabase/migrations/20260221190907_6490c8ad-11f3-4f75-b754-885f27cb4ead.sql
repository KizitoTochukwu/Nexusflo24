
-- Lead Folders table
CREATE TABLE public.lead_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_folders_workspace ON public.lead_folders(workspace_id);

ALTER TABLE public.lead_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace folders"
  ON public.lead_folders FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can create workspace folders"
  ON public.lead_folders FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can update workspace folders"
  ON public.lead_folders FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace folders"
  ON public.lead_folders FOR DELETE
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Lead Folder Leads join table
CREATE TABLE public.lead_folder_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.lead_folders(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (folder_id, lead_id)
);

CREATE INDEX idx_lead_folder_leads_workspace ON public.lead_folder_leads(workspace_id);
CREATE INDEX idx_lead_folder_leads_folder ON public.lead_folder_leads(folder_id);
CREATE INDEX idx_lead_folder_leads_lead ON public.lead_folder_leads(lead_id);

ALTER TABLE public.lead_folder_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace folder leads"
  ON public.lead_folder_leads FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can create workspace folder leads"
  ON public.lead_folder_leads FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace folder leads"
  ON public.lead_folder_leads FOR DELETE
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
