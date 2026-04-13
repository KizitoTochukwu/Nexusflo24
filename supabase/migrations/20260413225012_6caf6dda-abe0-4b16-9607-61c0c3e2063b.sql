
-- ============================================================
-- 1. FIX: bookings table - remove overly permissive public SELECT
-- ============================================================

-- Drop the two problematic policies
DROP POLICY IF EXISTS "Anyone can view bookings for availability" ON public.bookings;
DROP POLICY IF EXISTS "Public can view booking by reschedule_token" ON public.bookings;

-- Add a restricted availability check policy (only exposes time slots, not PII)
-- Public needs to see booked time slots to prevent double-booking
CREATE POLICY "Public can check booking availability"
  ON public.bookings
  FOR SELECT
  TO public
  USING (
    status = 'confirmed'
  );

-- Note: The public availability check above still exposes rows, but the booking-availability
-- edge function should be the primary method. For reschedule, use the edge function with service role.
-- Actually, let's be more restrictive - only expose via service role for availability checks too.

-- Drop the policy we just created and use a more restrictive approach
DROP POLICY IF EXISTS "Public can check booking availability" ON public.bookings;

-- Service role can read all bookings (for edge functions like booking-availability, reschedule-booking)
CREATE POLICY "Service can read all bookings"
  ON public.bookings
  FOR SELECT
  TO service_role
  USING (true);

-- Service role can update bookings (for reschedule-booking edge function)
CREATE POLICY "Service can update bookings"
  ON public.bookings
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. FIX: scheduled_jobs - restrict to service_role
-- ============================================================

DROP POLICY IF EXISTS "Service can insert scheduled_jobs" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "Service can update scheduled_jobs" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "Service can delete scheduled_jobs" ON public.scheduled_jobs;

CREATE POLICY "Service can insert scheduled_jobs"
  ON public.scheduled_jobs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service can update scheduled_jobs"
  ON public.scheduled_jobs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can delete scheduled_jobs"
  ON public.scheduled_jobs
  FOR DELETE
  TO service_role
  USING (true);

-- ============================================================
-- 3. FIX: sales_conversations - restrict to service_role
-- ============================================================

DROP POLICY IF EXISTS "Service can insert sales_conversations" ON public.sales_conversations;
DROP POLICY IF EXISTS "Service can select sales_conversations" ON public.sales_conversations;
DROP POLICY IF EXISTS "Service can update sales_conversations" ON public.sales_conversations;

CREATE POLICY "Service can insert sales_conversations"
  ON public.sales_conversations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service can select sales_conversations"
  ON public.sales_conversations
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service can update sales_conversations"
  ON public.sales_conversations
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
