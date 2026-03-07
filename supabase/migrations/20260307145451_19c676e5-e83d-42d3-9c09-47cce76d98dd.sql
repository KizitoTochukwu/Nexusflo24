
-- Add reschedule token to bookings
ALTER TABLE public.bookings
  ADD COLUMN reschedule_token text UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex');

-- Allow public SELECT on bookings by reschedule_token (for the reschedule page)
CREATE POLICY "Public can view booking by reschedule_token"
  ON public.bookings FOR SELECT
  USING (reschedule_token IS NOT NULL);
