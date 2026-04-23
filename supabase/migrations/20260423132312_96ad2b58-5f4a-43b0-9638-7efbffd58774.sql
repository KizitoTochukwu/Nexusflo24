-- Server-side safety net: when a lead is added to a folder, enqueue
-- automation execution jobs so the existing process-scheduled-jobs cron
-- picks them up within 60 seconds. This decouples automation firing from
-- the browser, preventing silent drops on tab close / network blips.

CREATE OR REPLACE FUNCTION public.enqueue_folder_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auto_rec RECORD;
  cfg_folder TEXT;
BEGIN
  FOR auto_rec IN
    SELECT id, trigger_config, workspace_id
    FROM public.automations
    WHERE workspace_id = NEW.workspace_id
      AND status = 'active'
      AND trigger_type = 'lead_added_to_folder'
  LOOP
    cfg_folder := auto_rec.trigger_config->>'folder_id';
    -- Match: empty/null folder config means "any folder", else must equal NEW.folder_id
    IF cfg_folder IS NULL OR cfg_folder = '' OR cfg_folder = NEW.folder_id::text THEN
      -- Skip if a pending/running job already exists for this automation+lead
      -- (mirrors the dedup guard in execute-automation)
      IF NOT EXISTS (
        SELECT 1 FROM public.scheduled_jobs
        WHERE automation_id = auto_rec.id
          AND lead_id = NEW.lead_id
          AND status IN ('pending','running')
      ) THEN
        INSERT INTO public.scheduled_jobs (
          workspace_id, automation_id, lead_id, step_index, run_at, payload, status
        ) VALUES (
          NEW.workspace_id,
          auto_rec.id,
          NEW.lead_id,
          0,
          now(),
          jsonb_build_object(
            'automation_id', auto_rec.id,
            'lead_id', NEW.lead_id,
            'workspace_id', NEW.workspace_id,
            'source', 'folder_trigger'
          ),
          'pending'
        );
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_folder_automations ON public.lead_folder_leads;

CREATE TRIGGER trg_enqueue_folder_automations
AFTER INSERT ON public.lead_folder_leads
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_folder_automations();