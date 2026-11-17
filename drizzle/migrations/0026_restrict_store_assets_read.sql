DROP POLICY IF EXISTS "store assets readable" ON storage.objects;
CREATE POLICY "store assets readable" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'store-assets' AND public.can_manage_commerce(auth.uid(), ((storage.foldername(name))[1])::uuid));