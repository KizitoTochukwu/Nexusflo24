I found the new failure.

What happened this time:
- The latest campaign `Webinar` was created as `multi-channel` with an empty email subject.
- The sender currently treats `multi-channel` as “send Email first”, so it called the email sender with an empty `subject`.
- The email sender rejected it with: `Missing required fields: workspaceId, to, subject, html`.
- The SMS fallback did get queued correctly this time, but it is scheduled for 30 minutes later: `Apr 28, 18:20 UTC`. That is why SMS/WhatsApp did not attempt immediately.
- The variable issue is partly fixed for `{{first_name}}`, but this campaign used `{{FirstName}}`. The current interpolator only lowercases tokens; it does not normalize camelCase/PascalCase aliases like `FirstName`, so it rendered as blank: `Hi ,`.

Plan to fix it properly:

1. Make email campaigns tolerate missing subjects
   - Update `execute-campaign` so if the email subject is blank, it automatically uses a safe fallback subject based on the campaign name, e.g. `Webinar`.
   - Update `email-send` so it does not fail on an empty subject; it will apply the same safe fallback before sending/logging.
   - This prevents multi-channel campaigns from failing just because the user did not fill the optional-looking subject field.

2. Fix all common variable aliases across Email, SMS, WhatsApp
   - Extend variable interpolation to support:
     - `{{first_name}}`
     - `{{FirstName}}`
     - `{{firstname}}`
     - `{{firstName}}`
     - `{{last_name}}`, `{{LastName}}`, `{{lastName}}`
     - `{{full_name}}`, `{{FullName}}`, `{{name}}`
   - Apply this in both backend sending and frontend test/preview helpers.
   - Result: the greeting will render as `Hi Kizito,` instead of `Hi ,`.

3. Make multi-channel fallback behavior clearer and more reliable
   - Keep the configured delay for “unread” fallbacks, but for primary-send failures caused by provider/input errors, schedule fallback immediately or near-immediately instead of waiting 30 minutes.
   - This means if email fails before it ever sends, SMS/WhatsApp can try right away.
   - Keep delayed fallback for actual “unread” cases once a primary message was successfully sent.

4. Improve the composer UI validation
   - For email and multi-channel campaigns, show/require a subject line before launch, or auto-fill it from the campaign name.
   - For multi-channel campaigns, pass `isEmail={true}` to the editor so the email subject field and email settings appear, since email is the primary channel.
   - Add helper copy explaining that multi-channel sends Email first, then fallback channel.

5. Improve delivery log visibility
   - Show pending fallback jobs in the campaign details drawer, e.g. “SMS fallback queued for 18:20”.
   - This avoids the current confusion where email shows failed but the drawer does not clearly show that SMS is waiting for its scheduled fallback time.

6. Recover the current failed campaign
   - Re-run the latest failed `Webinar` campaign after the fixes, or reset the queued fallback to run immediately.
   - Verify the new delivery log shows either a successful email or an attempted SMS fallback with a concrete provider result.

Technical files to update:
- `supabase/functions/_shared/interpolate-vars.ts`
- `src/lib/messaging/interpolate.ts`
- `supabase/functions/execute-campaign/index.ts`
- `supabase/functions/email-send/index.ts`
- `supabase/functions/process-scheduled-jobs/index.ts`
- `src/components/campaigns/CreateCampaignDialog.tsx`
- `src/components/campaigns/CampaignDetailsDrawer.tsx`
- Possibly `src/hooks/useCampaigns.ts` if the drawer needs to query scheduled fallback jobs

After implementation, I will deploy the updated backend functions and verify against the latest campaign records.