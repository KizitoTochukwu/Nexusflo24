CREATE POLICY "Authenticated users can upload email assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'email-assets');

CREATE POLICY "Authenticated users can update email assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'email-assets');

CREATE POLICY "Authenticated users can delete email assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'email-assets');