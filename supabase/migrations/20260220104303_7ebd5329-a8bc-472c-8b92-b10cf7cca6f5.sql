
-- Unique partial index: one lead per email per owner
CREATE UNIQUE INDEX IF NOT EXISTS leads_user_email_unique
  ON public.leads (user_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';

-- Unique partial index: one lead per phone per owner
CREATE UNIQUE INDEX IF NOT EXISTS leads_user_phone_unique
  ON public.leads (user_id, phone)
  WHERE phone IS NOT NULL AND phone <> '';
