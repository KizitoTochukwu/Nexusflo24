CREATE POLICY "Members read crm files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'crm-files'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Members upload crm files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'crm-files'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Members update crm files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'crm-files'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Members delete crm files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'crm-files'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );