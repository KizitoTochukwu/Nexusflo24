GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_pages TO authenticated;
GRANT ALL ON public.booking_pages TO service_role;
GRANT SELECT ON public.booking_pages TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT SELECT, INSERT ON public.bookings TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_tokens TO authenticated;
GRANT ALL ON public.google_calendar_tokens TO service_role;