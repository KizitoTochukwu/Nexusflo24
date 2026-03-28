

## Plan: WhatsApp/SMS Alert to Admin on Human Handoff

### Overview
When a visitor requests a human agent in the chatbot, send an SMS or WhatsApp message to the workspace owner's phone number (from their profile) with a link to the dashboard messages page. This extends the existing handoff flow in the `nexus-ai-chat` edge function.

### How It Works

1. Visitor asks to speak to a human in the chatbot
2. The existing `[HUMAN_HANDOFF]` tag is detected
3. The edge function already creates an in-app notification
4. **New**: After creating the notification, the function will:
   - Look up the workspace owner's phone number from `profiles.phone`
   - If a phone number exists, attempt to send a WhatsApp message first (via internal call to `whatsapp-send`), falling back to SMS (via `sms-send`) if WhatsApp is not configured
   - The message includes the visitor's name/email and a link to the dashboard messages page

### Changes

**File: `supabase/functions/nexus-ai-chat/index.ts`**

After the existing notification insert block (line ~88), add:

- Query the owner's profile for their `phone` number
- Build a message like: `"🙋 Human agent requested! [Visitor Name] ([email]) wants to chat. Continue the conversation: {published_url}/dashboard/messages"`
- Call `whatsapp-send` edge function internally (using service role key). If it fails or WhatsApp is not configured, fall back to `sms-send`
- Wrap in try/catch so failures don't break the main chat flow

### Message Content
```
🙋 Human Agent Requested
{Name} ({email}) wants to speak with a team member.
Continue here: https://nexusflo24.lovable.app/dashboard/messages
```

### Technical Details
- Uses internal `fetch()` to call the existing `whatsapp-send` and `sms-send` edge functions with the service role key (same pattern used by `execute-automation`)
- No new secrets needed — reuses existing channel credentials resolved per workspace
- No database changes required — `profiles.phone` already exists
- Graceful degradation: if no phone number is set, only the in-app notification fires (current behavior)

