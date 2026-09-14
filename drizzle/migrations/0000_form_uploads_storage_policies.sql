-- Workspace members can read and manage files submitted to their forms.
CREATE POLICY "Workspace members read form uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'form-uploads'
  AND public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Workspace members delete form uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'form-uploads'
  AND public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
);
