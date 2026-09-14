DROP INDEX IF EXISTS public.idx_user_onboarding_user_ws;

ALTER TABLE public.user_onboarding
  ADD CONSTRAINT user_onboarding_user_workspace_key
  UNIQUE NULLS NOT DISTINCT (user_id, workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_onboarding TO authenticated;
GRANT ALL ON public.user_onboarding TO service_role;