
ALTER TABLE public.booking_pages
  ADD COLUMN IF NOT EXISTS location_type text NOT NULL DEFAULT 'custom_link',
  ADD COLUMN IF NOT EXISTS location_value text;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS meeting_url text,
  ADD COLUMN IF NOT EXISTS meeting_location text;
