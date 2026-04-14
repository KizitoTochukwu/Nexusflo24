
CREATE TABLE public.social_share_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_share_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage social share log"
  ON public.social_share_log
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_social_share_log_post ON public.social_share_log(blog_post_id);
CREATE INDEX idx_social_share_log_platform ON public.social_share_log(blog_post_id, platform);
