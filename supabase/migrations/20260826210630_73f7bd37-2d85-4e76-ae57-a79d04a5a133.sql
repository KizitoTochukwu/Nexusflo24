-- 1. Deal stage history + status sync
CREATE OR REPLACE FUNCTION public.crm_track_deal_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.stage_id IS NOT NULL THEN
      INSERT INTO public.crm_deal_stage_history (workspace_id, deal_id, from_stage_id, to_stage_id, entered_at, changed_by, change_source)
      VALUES (NEW.workspace_id, NEW.id, NULL, NEW.stage_id, now(), auth.uid(), 'create');
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    UPDATE public.crm_deal_stage_history
      SET exited_at = now()
      WHERE deal_id = NEW.id AND exited_at IS NULL;
    INSERT INTO public.crm_deal_stage_history (workspace_id, deal_id, from_stage_id, to_stage_id, entered_at, changed_by, change_source)
    VALUES (NEW.workspace_id, NEW.id, OLD.stage_id, NEW.stage_id, now(), auth.uid(), 'stage_change');

    SELECT stage_type INTO v_type FROM public.crm_pipeline_stages WHERE id = NEW.stage_id;
    IF v_type = 'won' THEN
      NEW.status := 'won';
      NEW.closed_at := coalesce(NEW.closed_at, now());
    ELSIF v_type = 'lost' THEN
      NEW.status := 'lost';
      NEW.closed_at := coalesce(NEW.closed_at, now());
    ELSIF v_type = 'open' AND OLD.status IN ('won','lost') THEN
      NEW.status := 'open';
      NEW.closed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_track_deal_stage() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_crm_track_deal_stage_ins ON public.crm_deals;
CREATE TRIGGER trg_crm_track_deal_stage_ins
AFTER INSERT ON public.crm_deals
FOR EACH ROW EXECUTE FUNCTION public.crm_track_deal_stage();

DROP TRIGGER IF EXISTS trg_crm_track_deal_stage_upd ON public.crm_deals;
CREATE TRIGGER trg_crm_track_deal_stage_upd
BEFORE UPDATE ON public.crm_deals
FOR EACH ROW EXECUTE FUNCTION public.crm_track_deal_stage();

-- 2. Default stages for pipelines that have none
CREATE OR REPLACE FUNCTION public.crm_ensure_pipeline_stages(_pipeline_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ws uuid; v_count int; v_created int := 0;
BEGIN
  SELECT workspace_id INTO v_ws FROM public.crm_pipelines WHERE id = _pipeline_id;
  IF v_ws IS NULL THEN RETURN 0; END IF;
  IF NOT public.is_workspace_member(auth.uid(), v_ws) AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  SELECT count(*) INTO v_count FROM public.crm_pipeline_stages WHERE pipeline_id = _pipeline_id;
  IF v_count > 0 THEN RETURN 0; END IF;

  INSERT INTO public.crm_pipeline_stages (workspace_id, pipeline_id, name, position, probability, stage_type, color)
  VALUES
    (v_ws, _pipeline_id, 'New',         0, 10,  'open', '#94A3B8'),
    (v_ws, _pipeline_id, 'Qualified',   1, 25,  'open', '#38BDF8'),
    (v_ws, _pipeline_id, 'Proposal',    2, 50,  'open', '#A78BFA'),
    (v_ws, _pipeline_id, 'Negotiation', 3, 75,  'open', '#F59E0B'),
    (v_ws, _pipeline_id, 'Won',         4, 100, 'won',  '#22C55E'),
    (v_ws, _pipeline_id, 'Lost',        5, 0,   'lost', '#EF4444');
  GET DIAGNOSTICS v_created = ROW_COUNT;
  RETURN v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_ensure_pipeline_stages(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_ensure_pipeline_stages(uuid) TO authenticated, service_role;

-- 3. Prevent duplicate workflow-generated tasks
CREATE UNIQUE INDEX IF NOT EXISTS crm_tasks_dedupe_key_uidx
  ON public.crm_tasks (workspace_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- 4. Useful lookups
CREATE INDEX IF NOT EXISTS crm_deal_stage_history_deal_idx ON public.crm_deal_stage_history (deal_id, entered_at DESC);
CREATE INDEX IF NOT EXISTS crm_deals_contact_idx ON public.crm_deals (contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_tasks_contact_idx ON public.crm_tasks (contact_id) WHERE contact_id IS NOT NULL;