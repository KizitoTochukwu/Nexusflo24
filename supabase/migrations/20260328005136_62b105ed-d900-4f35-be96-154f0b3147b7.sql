
-- Create blog-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-assets', 'blog-assets', true);

-- Allow anyone to view blog assets
CREATE POLICY "Public can view blog assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'blog-assets');

-- Only admins can upload/update/delete blog assets
CREATE POLICY "Admins can manage blog assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'blog-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blog assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'blog-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blog assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'blog-assets' AND public.has_role(auth.uid(), 'admin'));
