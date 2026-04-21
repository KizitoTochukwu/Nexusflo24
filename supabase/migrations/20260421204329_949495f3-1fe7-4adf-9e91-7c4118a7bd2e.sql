
-- Create one "Uncategorized" folder per workspace if it doesn't already exist
INSERT INTO public.lead_folders (workspace_id, user_id, name, color)
SELECT w.id, w.owner_user_id, 'Uncategorized', '#94A3B8'
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_folders lf
  WHERE lf.workspace_id = w.id AND lower(lf.name) = 'uncategorized'
);

-- Backfill: assign every lead not already in any folder to its workspace's Uncategorized folder
INSERT INTO public.lead_folder_leads (folder_id, lead_id, workspace_id)
SELECT uf.id, l.id, l.workspace_id
FROM public.leads l
JOIN public.lead_folders uf
  ON uf.workspace_id = l.workspace_id
 AND lower(uf.name) = 'uncategorized'
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_folder_leads lfl WHERE lfl.lead_id = l.id
);
