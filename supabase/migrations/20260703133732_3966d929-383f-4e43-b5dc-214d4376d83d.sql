
CREATE TABLE public.roi_calculator_settings (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
  booking_url TEXT NOT NULL DEFAULT '/book/30-minute-discovery-call-9f5d5f',
  high_opportunity_thresholds JSONB NOT NULL DEFAULT '{"GBP":1000,"USD":1000,"EUR":1000,"NGN":1900000}'::jsonb,
  high_admin_thresholds JSONB NOT NULL DEFAULT '{"GBP":500,"USD":500,"EUR":500,"NGN":950000}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT roi_calc_settings_singleton CHECK (id = 'global')
);

GRANT SELECT ON public.roi_calculator_settings TO anon, authenticated;
GRANT ALL ON public.roi_calculator_settings TO service_role;

ALTER TABLE public.roi_calculator_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ROI calculator settings"
  ON public.roi_calculator_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert ROI calculator settings"
  ON public.roi_calculator_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ROI calculator settings"
  ON public.roi_calculator_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ROI calculator settings"
  ON public.roi_calculator_settings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_roi_calculator_settings_updated_at
  BEFORE UPDATE ON public.roi_calculator_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.roi_calculator_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_roi_calculator_settings()
RETURNS TABLE(booking_url TEXT, high_opportunity_thresholds JSONB, high_admin_thresholds JSONB)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT booking_url, high_opportunity_thresholds, high_admin_thresholds
  FROM public.roi_calculator_settings WHERE id = 'global' LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_roi_calculator_settings() TO anon, authenticated;
