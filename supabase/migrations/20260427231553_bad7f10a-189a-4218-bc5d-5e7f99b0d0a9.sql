CREATE TABLE public.workspace_tracking_pixels (
  workspace_id UUID NOT NULL PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meta_pixel_id TEXT,
  meta_enabled BOOLEAN NOT NULL DEFAULT true,
  ga4_measurement_id TEXT,
  ga4_enabled BOOLEAN NOT NULL DEFAULT true,
  gtm_id TEXT,
  gtm_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_tracking_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read tracking pixels"
  ON public.workspace_tracking_pixels
  FOR SELECT
  USING (true);

CREATE POLICY "Workspace admins can insert tracking pixels"
  ON public.workspace_tracking_pixels
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update tracking pixels"
  ON public.workspace_tracking_pixels
  FOR UPDATE
  TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete tracking pixels"
  ON public.workspace_tracking_pixels
  FOR DELETE
  TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TRIGGER update_workspace_tracking_pixels_updated_at
  BEFORE UPDATE ON public.workspace_tracking_pixels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();