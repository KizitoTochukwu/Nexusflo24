INSERT INTO storage.buckets (id, name, public)
VALUES ('funnel-assets', 'funnel-assets', true);

CREATE POLICY "Authenticated users can upload funnel assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'funnel-assets');

CREATE POLICY "Anyone can view funnel assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'funnel-assets');

CREATE POLICY "Users can delete own funnel assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'funnel-assets' AND (auth.uid())::text = (storage.foldername(name))[1]);