CREATE TABLE public.academy_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_slug text NOT NULL,
  lesson_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_slug, lesson_key)
);
GRANT SELECT, INSERT, DELETE ON public.academy_progress TO authenticated;
GRANT ALL ON public.academy_progress TO service_role;
ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own progress read" ON public.academy_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own progress insert" ON public.academy_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own progress delete" ON public.academy_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);