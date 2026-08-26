DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    -- trigger functions
    'bump_form_submission_count','dispatch_blog_linkedin_share',
    'grant_community_access_on_paid_order','grant_entitlements_on_paid_order',
    'handle_new_user','handle_workspace_creation','revoke_entitlements_on_order_change',
    'shop_community_counters','sync_admin_role','update_lead_last_activity',
    'update_lead_score_on_activity','crm_sync_contact_name','enforce_single_wa_provider_meta',
    'enforce_single_wa_provider_twilio','guard_platform_staff_changes','update_updated_at_column',
    'generate_booking_page_slug','generate_form_slug','generate_funnel_slug',
    -- background / server-only routines
    'decay_inactive_leads','email_queue_dispatch','email_queue_wake','enqueue_folder_automations',
    'assign_next_round_robin','increment_automation_run','pick_booking_host',
    'verify_workspace_api_key','active_funnel_workspace_id','is_email_in_admin_allowlist',
    'enqueue_email','read_email_batch','delete_email','move_to_dlq'
  ]
  LOOP
    EXECUTE (
      SELECT coalesce(string_agg(
        format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated;',
               p.proname, pg_get_function_identity_arguments(p.oid)), ' '), 'SELECT 1')
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    );
  END LOOP;
END $$;