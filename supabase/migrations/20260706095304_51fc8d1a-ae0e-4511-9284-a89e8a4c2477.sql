DROP POLICY IF EXISTS "Public can insert ROI calculator submissions" ON public.roi_calculator_submissions;

CREATE POLICY "Public can insert unscoped ROI calculator submissions"
ON public.roi_calculator_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (workspace_id IS NULL AND contact_id IS NULL);