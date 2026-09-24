CREATE OR REPLACE FUNCTION public.is_academy_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_staff(_user_id) OR public.has_role(_user_id, 'admin'::app_role)
$$;

CREATE TABLE public.academy_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  duration text NOT NULL DEFAULT '',
  premium boolean NOT NULL DEFAULT false,
  price_minor integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  image text NOT NULL DEFAULT '',
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructor_name text NOT NULL DEFAULT '',
  instructor_title text NOT NULL DEFAULT '',
  modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academy_courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_courses TO authenticated;
GRANT ALL ON public.academy_courses TO service_role;
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published courses are public" ON public.academy_courses FOR SELECT TO anon, authenticated USING (published OR public.is_academy_manager(auth.uid()));
CREATE POLICY "Managers insert courses" ON public.academy_courses FOR INSERT TO authenticated WITH CHECK (public.is_academy_manager(auth.uid()));
CREATE POLICY "Managers update courses" ON public.academy_courses FOR UPDATE TO authenticated USING (public.is_academy_manager(auth.uid())) WITH CHECK (public.is_academy_manager(auth.uid()));
CREATE POLICY "Managers delete courses" ON public.academy_courses FOR DELETE TO authenticated USING (public.is_academy_manager(auth.uid()));
CREATE TRIGGER academy_courses_updated_at BEFORE UPDATE ON public.academy_courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.academy_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  quote text NOT NULL,
  published boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academy_testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_testimonials TO authenticated;
GRANT ALL ON public.academy_testimonials TO service_role;
ALTER TABLE public.academy_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published testimonials are public" ON public.academy_testimonials FOR SELECT TO anon, authenticated USING (published OR public.is_academy_manager(auth.uid()));
CREATE POLICY "Managers insert testimonials" ON public.academy_testimonials FOR INSERT TO authenticated WITH CHECK (public.is_academy_manager(auth.uid()));
CREATE POLICY "Managers update testimonials" ON public.academy_testimonials FOR UPDATE TO authenticated USING (public.is_academy_manager(auth.uid())) WITH CHECK (public.is_academy_manager(auth.uid()));
CREATE POLICY "Managers delete testimonials" ON public.academy_testimonials FOR DELETE TO authenticated USING (public.is_academy_manager(auth.uid()));
CREATE TRIGGER academy_testimonials_updated_at BEFORE UPDATE ON public.academy_testimonials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.academy_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_slug text NOT NULL,
  course_title text NOT NULL DEFAULT '',
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  business_type text,
  goals text,
  amount_minor integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  status text NOT NULL DEFAULT 'pending_payment',
  stripe_session_id text,
  paid_at timestamptz,
  agreed_date timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academy_enrolments_status_check CHECK (status IN ('pending_payment','awaiting_date','scheduled','completed','cancelled'))
);
CREATE INDEX academy_enrolments_user_idx ON public.academy_enrolments(user_id);
CREATE INDEX academy_enrolments_email_idx ON public.academy_enrolments(lower(email));
GRANT SELECT, UPDATE ON public.academy_enrolments TO authenticated;
GRANT ALL ON public.academy_enrolments TO service_role;
ALTER TABLE public.academy_enrolments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own enrolments read" ON public.academy_enrolments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_academy_manager(auth.uid()));
CREATE POLICY "Managers update enrolments" ON public.academy_enrolments FOR UPDATE TO authenticated USING (public.is_academy_manager(auth.uid())) WITH CHECK (public.is_academy_manager(auth.uid()));
CREATE TRIGGER academy_enrolments_updated_at BEFORE UPDATE ON public.academy_enrolments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();