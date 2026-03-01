
-- Create admin allowlist table
CREATE TABLE public.admin_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  notes text,
  added_by_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique index on lowercase email
CREATE UNIQUE INDEX admin_allowlist_email_unique ON public.admin_allowlist (lower(email));

-- Enable RLS
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "Admins can view allowlist"
  ON public.admin_allowlist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert
CREATE POLICY "Admins can insert allowlist"
  ON public.admin_allowlist FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update allowlist"
  ON public.admin_allowlist FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete allowlist"
  ON public.admin_allowlist FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed initial admin email
INSERT INTO public.admin_allowlist (email, notes)
VALUES ('kizzyadichie@gmail.com', 'Initial system admin');

-- Create a security definer function to check allowlist (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_email_in_admin_allowlist(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_allowlist
    WHERE lower(email) = lower(trim(_email))
  )
$$;

-- Create a function to sync admin role based on allowlist (called from client after auth)
CREATE OR REPLACE FUNCTION public.sync_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _email text;
  _is_allowed boolean;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get user email from profiles
  SELECT email INTO _email FROM public.profiles WHERE id = _user_id;
  IF _email IS NULL THEN
    RETURN;
  END IF;

  _is_allowed := public.is_email_in_admin_allowlist(_email);

  IF _is_allowed THEN
    -- Upsert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Remove admin role if not in allowlist
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;
END;
$$;
