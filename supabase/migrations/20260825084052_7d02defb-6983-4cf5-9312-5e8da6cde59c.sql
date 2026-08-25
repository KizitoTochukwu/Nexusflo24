CREATE POLICY "store assets readable" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'store-assets');
CREATE POLICY "store assets insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'store-assets' AND public.can_manage_commerce(auth.uid(), (storage.foldername(name))[1]::uuid));
CREATE POLICY "store assets update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'store-assets' AND public.can_manage_commerce(auth.uid(), (storage.foldername(name))[1]::uuid));
CREATE POLICY "store assets delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'store-assets' AND public.can_manage_commerce(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "store downloads staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'store-downloads' AND public.can_manage_commerce(auth.uid(), (storage.foldername(name))[1]::uuid));
CREATE POLICY "store downloads staff insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'store-downloads' AND public.can_manage_commerce(auth.uid(), (storage.foldername(name))[1]::uuid));
CREATE POLICY "store downloads staff update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'store-downloads' AND public.can_manage_commerce(auth.uid(), (storage.foldername(name))[1]::uuid));
CREATE POLICY "store downloads staff delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'store-downloads' AND public.can_manage_commerce(auth.uid(), (storage.foldername(name))[1]::uuid));