DROP POLICY IF EXISTS "Workspace members read form uploads" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members delete form uploads" ON storage.objects;

CREATE POLICY "Workspace members read form uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'form-uploads'
  AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Workspace members delete form uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'form-uploads'
  AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
