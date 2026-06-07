WITH ranked AS (
  SELECT id, workspace_id,
         row_number() OVER (
           PARTITION BY workspace_id
           ORDER BY is_active DESC, updated_at DESC NULLS LAST, created_at DESC
         ) AS rn
  FROM public.whatsapp_settings
)
DELETE FROM public.whatsapp_settings ws
USING ranked r
WHERE ws.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_settings_workspace_id_unique
  ON public.whatsapp_settings (workspace_id);