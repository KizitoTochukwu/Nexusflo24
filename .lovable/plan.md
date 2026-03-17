

## Diagnosis

The automation logs confirm all WhatsApp sends returned `status: success` with valid `waMessageId` values. However, the `execute-automation` function sends WhatsApp messages **directly via the Meta Graph API** (lines 79-89, 206-214) using hardcoded platform ENV credentials (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`), completely bypassing the `whatsapp-send` edge function.

This causes two problems:

1. **Wrong credentials**: The function uses platform-level ENV variables instead of the workspace's own WhatsApp credentials (stored encrypted in `workspace_channel_settings`). If the workspace has configured custom WhatsApp credentials pointing to a different Business Account, messages are sent from the wrong number — Meta accepts them but the recipient never sees them because the sending number isn't the one they interacted with.

2. **No message logging**: Messages sent this way are not recorded in the `whatsapp_messages` table, so they don't appear in the Messages inbox.

By contrast, `execute-campaign` correctly delegates to `whatsapp-send` via an internal fetch call, which handles credential resolution, phone normalization, and message logging.

## Plan

**Modify `supabase/functions/execute-automation/index.ts`**:

- Replace the direct Meta API call in the `send_whatsapp` action block (lines 206-214) with an internal fetch to the `whatsapp-send` edge function, matching the pattern already used by `execute-campaign`.
- Use the service role key for authorization so it bypasses user auth checks.
- Pass `workspaceId`, `to`, `body`, and `leadId` to ensure proper credential resolution and message logging.
- Remove the now-unused `sendWhatsApp` helper function (lines 79-89).

```text
Before (direct Meta call):
  token from ENV → sendWhatsApp(token, phoneId, lead.phone, body)

After (delegating to whatsapp-send):
  fetch(SUPABASE_URL/functions/v1/whatsapp-send, {
    workspaceId, to: lead.phone, body, leadId: lead_id
  })
```

This single change ensures automations use the same credential resolution, phone normalization, and message logging as campaigns and the inbox.

