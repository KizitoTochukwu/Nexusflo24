

# Campaign Firing Audit & Fix Plan

## Current State Analysis

After tracing the full campaign pipeline, here's what's working and what's broken:

### Working
- **Manual send**: The "Send Campaign Now" button in the campaign details drawer correctly invokes `execute-campaign` — this works.
- **Scheduled campaigns**: `process-scheduled-jobs` picks up campaigns with status `scheduled` where `scheduled_at` has passed, and fires `execute-campaign` — this works.
- **Triggered campaigns (new_lead only)**: `capture-lead` queries for active triggered campaigns with `trigger_config.type = "new_lead"` and fires them — this works.
- **Edge function config**: `execute-campaign` has `verify_jwt = false` in `config.toml` — correct.
- **Fallback scheduling**: Failed sends schedule fallback jobs via `scheduled_jobs` — this works.

### Broken / Not Wired

1. **Broadcast "Send Now" does NOT auto-fire**: When a user creates a broadcast campaign and clicks "Launch Campaign" with "Send Now" selected, the campaign is saved with status `active` but `execute-campaign` is **never called**. The user must then open the drawer and manually click "Send Campaign Now" — this is confusing and defeats the purpose of "Launch Campaign."

2. **Most triggered campaign types are dead**: Only `new_lead` triggers are wired (in `capture-lead`). The remaining 7 trigger types (`tag_added`, `tag_removed`, `score_threshold`, `email_opened`, `link_clicked`, `whatsapp_reply`, `purchase_event`) are offered in the UI but have **no backend wiring** — campaigns created with these triggers will never fire.

## Fix Plan

### Fix 1: Auto-execute broadcast "Send Now" campaigns on creation

In `CreateCampaignDialog.tsx`, after `createCampaign.mutateAsync(...)` succeeds, if the campaign is broadcast mode with "Send Now", immediately call `supabase.functions.invoke("execute-campaign", { body: { campaign_id } })` and show a toast with results.

**File**: `src/components/campaigns/CreateCampaignDialog.tsx` — update `handleCreate`

### Fix 2: Wire trigger events for tag/score/email/click/whatsapp triggers

Add trigger-checking logic to the relevant backend functions so triggered campaigns actually fire:

- **`tag_added` / `tag_removed`**: In the leads update flow. Since leads are updated via the Supabase client directly (not an edge function), the most practical approach is to add a database trigger on the `leads` table that detects tag changes and inserts a `scheduled_job` to fire matching campaigns. Alternatively, add a lightweight edge function `check-campaign-triggers` that the frontend calls after tag updates.

- **`score_threshold`**: The `update_lead_score_on_activity` DB function already updates scores. Add logic there (or a separate trigger) to check for campaigns with `score_threshold` triggers.

- **`email_opened` / `link_clicked`**: Already tracked by `track-open` and `track-click` edge functions. Add campaign trigger checks there.

- **`whatsapp_reply`**: Already handled in `whatsapp-webhook`. Add campaign trigger check there.

- **`purchase_event`**: Placeholder — leave as-is with a UI indicator that it's coming soon.

Given the complexity, I recommend a two-phase approach:

**Phase 1 (this change):**
- Fix the broadcast "Send Now" auto-fire (high impact, simple fix)
- Wire `email_opened` and `link_clicked` triggers in their existing edge functions
- Wire `whatsapp_reply` trigger in `whatsapp-webhook`

**Phase 2 (follow-up):**
- Wire tag and score triggers via a reusable `check-campaign-triggers` edge function called from relevant update paths

## Files Modified

| Action | File | Change |
|--------|------|--------|
| Modify | `src/components/campaigns/CreateCampaignDialog.tsx` | Auto-invoke `execute-campaign` after broadcast "Send Now" creation |
| Modify | `supabase/functions/track-open/index.ts` | Check for `email_opened` triggered campaigns |
| Modify | `supabase/functions/track-click/index.ts` | Check for `link_clicked` triggered campaigns |
| Modify | `supabase/functions/whatsapp-webhook/index.ts` | Check for `whatsapp_reply` triggered campaigns |

