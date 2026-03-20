

## Fix: Confirmation Emails Not Being Sent

### Root Cause

The email domain (`support.nexusflo24.com`) is verified and the `auth-email-hook` Edge Function code exists, but the email infrastructure was never fully set up:

1. **No email queue infrastructure** — the `email_send_log` table doesn't exist, and there's no `process-email-queue` cron job. This means `setup_email_infra` was never called.
2. **auth-email-hook has zero logs** — the function is either not deployed or not activated as the auth email hook. Without activation, the auth system uses default (built-in) email delivery, which may not be configured or working.
3. **Old direct-send pattern** — the current `auth-email-hook` uses `sendLovableEmail` directly instead of the queue-based approach. This should be upgraded for retry safety.

### Fix Steps

**1. Set up email infrastructure**
- Call `setup_email_infra` to create the email queue tables (`email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens`), pgmq queues, RPC wrappers, and the `process-email-queue` cron job.

**2. Re-scaffold auth email templates**
- Call `scaffold_auth_email_templates` to upgrade the `auth-email-hook` to the queue-based pattern and properly activate it with the auth system.
- Re-apply the existing NexusFlo24 brand styling (Navy #0B1F3B, Gold #C9A227, Inter font, profile logo) to the templates.

**3. Deploy the updated Edge Functions**
- Deploy `auth-email-hook` (and `process-email-queue` if created by infra setup) so the auth system can route signup confirmation emails through the hook.

### What This Fixes
- Signup confirmation emails will be enqueued and delivered via the verified `support.nexusflo24.com` domain
- Retry safety via the pgmq queue (rate-limit handling, dead-letter queue)
- All 6 auth email types (signup, recovery, magic link, invite, email change, reauthentication) will work

### No Database Migration Needed
The `setup_email_infra` tool handles all table creation internally.

