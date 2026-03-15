

# Fix Unsubscribe Button — End-to-End

## Problems Found

1. **Campaigns don't skip unsubscribed leads** — The `execute-automation` function correctly skips leads with the "unsubscribed" tag, but `execute-campaign` does not. Unsubscribed leads still receive campaign emails.

2. **Campaigns don't pass `templateSettings` to `email-send`** — Campaign emails are sent without the user's template settings (including custom unsubscribe text), so they get default/missing unsubscribe formatting.

3. **No unsubscribe activity logging in campaigns** — When a lead clicks unsubscribe from a campaign email, no `campaign_id` is tracked.

## Changes

### 1. `supabase/functions/execute-campaign/index.ts`
- Add unsubscribed lead filtering: skip leads whose `tags` array contains `"unsubscribed"` before sending (after the tag-based audience filter, around line 104).
- Pass `templateSettings` from `campaign.message_content` to the `email-send` call body so the unsubscribe text and footer settings are applied.

### 2. `supabase/functions/email-send/index.ts`
- Already handles `templateSettings` and `unsubUrl` correctly. No changes needed.

### 3. `supabase/functions/unsubscribe/index.ts`
- Already works correctly: adds "unsubscribed" tag and logs activity. No changes needed.

### 4. `supabase/functions/_shared/email-layout.ts`
- Already supports `unsubUrl` option and renders a real unsubscribe link. No changes needed.

### Summary of Actual Code Changes
- **`execute-campaign/index.ts`**: Add 2 changes:
  1. Filter out unsubscribed leads (~3 lines after line 104)
  2. Include `templateSettings` in the `email-send` request body (line 135-139)

Both edge functions will be redeployed after changes.

