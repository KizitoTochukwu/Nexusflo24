-- Explicit deny policy so the internal lease table is locked (not just policy-less)
DROP POLICY IF EXISTS "No client access to send lease" ON public.prospecting_send_lease;
CREATE POLICY "No client access to send lease"
  ON public.prospecting_send_lease
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

SELECT cron.unschedule('client-finder-process-sends')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'client-finder-process-sends');

SELECT cron.schedule(
  'client-finder-process-sends',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/client-finder-process-sends',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dWFpa2Z5dXdjam1jaGN2ZmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDMxNTIsImV4cCI6MjA4NjMxOTE1Mn0.6klVTh_SkcPmBUggnT6CvYI-uZJ1-1GusC5pMk8xUUE"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);
