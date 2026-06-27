## Findings

- Your latest WhatsApp message did reach NexusFlo24: the backend stored it at `18:42 UTC` as an inbound WhatsApp message from your number.
- The webhook also triggered the AI Sales Closer for that lead.
- The failure is after AI generation, at the outbound sender step:
  - `ai-sales-closer` called `whatsapp-send`
  - `whatsapp-send` returned: `WhatsApp not configured. Contact platform admin or set up your own in Settings → Channels.`
- The workspace has an active Meta WhatsApp connection in `whatsapp_settings` with WABA `2185231005596249` and phone number ID `1216811704842616`, but the older `workspace_channel_settings` mirror used by `whatsapp-send` appears stale/incomplete. That is why inbound works but outbound auto-reply does not.

## Plan

1. **Fix outbound credential resolution**
   - Update the WhatsApp sender path so `whatsapp-send` can use the active Meta connection stored in `whatsapp_settings` directly when the legacy `workspace_channel_settings` mirror is missing, stale, or incomplete.
   - Decrypt `access_token_encrypted` using the WhatsApp settings encryption helper already used elsewhere.
   - Prefer workspace-specific Meta credentials over platform fallback.

2. **Repair the stale mirror automatically**
   - When valid credentials are found in `whatsapp_settings`, refresh `workspace_channel_settings` with the same phone number ID and access token.
   - This keeps existing functions that depend on `workspace_channel_settings` working without requiring you to reconnect WhatsApp.

3. **Make AI Sales Closer status honest**
   - Update `ai-sales-closer` so an auto-reply is only marked `sent` after `whatsapp-send` returns success.
   - If sending fails, store the AI reply as `failed` with the returned error instead of reporting `status: sent` while no WhatsApp message was delivered.

4. **Set the approved default template**
   - Set the existing approved template `reengagement_followup_v1` as the workspace default re-engagement template.
   - This allows outbound replies outside the 24-hour WhatsApp window to use an approved template instead of failing.

5. **Deploy and verify with one more live test**
   - Deploy the changed backend functions.
   - Ask you to send one final WhatsApp message.
   - Confirm the full chain:
     - inbound stored
     - AI Sales Closer processed
     - outbound WhatsApp row created
     - Meta message ID returned
     - status is `sent` or later updated to delivered/read