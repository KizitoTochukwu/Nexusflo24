CREATE OR REPLACE FUNCTION public.notify_admin_new_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/notify-new-signup',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dWFpa2Z5dXdjam1jaGN2ZmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDMxNTIsImV4cCI6MjA4NjMxOTE1Mn0.6klVTh_SkcPmBUggnT6CvYI-uZJ1-1GusC5pMk8xUUE"}'::jsonb,
      body := jsonb_build_object('user_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admin_new_signup failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_notify_admin ON public.profiles;
CREATE TRIGGER on_profile_created_notify_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_signup();