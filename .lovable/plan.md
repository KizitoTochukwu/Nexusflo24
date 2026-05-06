I checked the live SMS function logs and the database state. The SMS sender is still failing with Twilio HTTP 401 `Authenticate`, and the currently active workspace SMS credential record was updated at `20:09 UTC` but still has the shorter encrypted length (`212`) that indicates the workspace override is still being used and may not contain the correct full credential set.

New hypothesis: the app is continuing to use the saved per-workspace Twilio override, so even if the platform Twilio secrets were updated, `sms-send` resolves the stale/bad workspace credentials first and never reaches the updated platform credentials.

Plan to fix it:

1. Update the active workspace SMS configuration
   - Remove or disconnect the bad per-workspace SMS credential override for the affected workspace (`95bc7e99-798e-49ef-a5c3-ab68bbc08950`).
   - This will make SMS sends fall back to the updated platform Twilio credentials already stored securely in Lovable Cloud.
   - If you intended this workspace to use its own Twilio account instead of platform credentials, I’ll re-save the workspace override only after adding safer validation below.

2. Harden credential resolution in `sms-send`
   - Trim the resolved Account SID, Auth Token, and sender before calling Twilio.
   - Add non-secret diagnostic logging that reports credential source (`workspace` vs `platform`), Account SID prefix/suffix only, token length only, and sender type.
   - This confirms which credential source is actually being used without exposing secrets.

3. Improve the settings UI error handling
   - Replace the `supabase.functions.invoke("channel-settings-save")` save call with the same direct `fetch` response parser already used for SMS tests.
   - This ensures backend validation errors display clearly instead of the generic “Edge Function returned a non-2xx status code”.

4. Verify after applying
   - Query the database to confirm the workspace override is no longer active or has been replaced correctly.
   - Call the SMS test path again using the authenticated preview session.
   - Re-check `sms-send` logs to confirm it is using the expected credential source and no longer returns Twilio `Authenticate`.

What I will not do:
- I will not expose or print your Twilio secret values.
- I will not ask you to run SQL or update anything externally.
- I will not store Twilio credentials in frontend code.