UPDATE public.booking_pages
SET availability = '{
  "mon": [{"start":"00:00","end":"23:59"}],
  "tue": [{"start":"00:00","end":"23:59"}],
  "wed": [{"start":"00:00","end":"23:59"}],
  "thu": [{"start":"00:00","end":"23:59"}],
  "fri": [{"start":"00:00","end":"23:59"}],
  "sat": [{"start":"00:00","end":"23:59"}],
  "sun": [{"start":"00:00","end":"23:59"}]
}'::jsonb,
updated_at = now()
WHERE id = '425f3045-cc6a-4871-b2c6-88fbb7756ce8';