

# Funnel-Specific Automation Triggering

## Problem
All active `new_lead` automations fire for every captured lead, regardless of which funnel captured it. There's no way to link an automation to a specific funnel.

## Approach
Use the existing `trigger_config` JSONB column on the `automations` table to store an optional `funnel_id`. No database migration needed.

### Changes

**1. `capture-lead` Edge Function** — Pass `funnel_id` from meta to the automation trigger, and filter automations by matching `trigger_config.funnel_id`:
- Extract `funnel_id` from `meta.funnel_id`
- Query automations where `trigger_config->funnel_id` equals the funnel ID **OR** `trigger_config->funnel_id` is null/empty (global automations still fire for all leads)
- Pass `funnel_id` along in the execute-automation payload

**2. `PublicFunnel.tsx`** — Already sends `meta.funnel_id` — also pass `funnel_name` so the lead record gets the funnel name stored:
- Add `funnel_name: funnel.name` to the capture-lead body

**3. `CreateAutomationDialog.tsx`** — Add an optional funnel selector when trigger is `new_lead`:
- Fetch funnels list for the workspace
- Show a "Trigger from funnel" dropdown (with "All funnels" as default)
- Store selected funnel_id in `trigger_config.funnel_id`

**4. `AutomationDetailsDrawer.tsx`** — Same funnel selector in the edit view:
- Initialize from `automation.trigger_config.funnel_id`
- Save back to `trigger_config` on update

**5. `useAutomations.ts`** — Ensure `trigger_config` is passed through in create/update mutations (already supported via the existing code, just needs the UI to populate it).

### Matching Logic (Edge Function)
```text
For each automation where trigger_type = 'new_lead' AND status = 'active':
  - If trigger_config.funnel_id is set → only fire if it matches the lead's funnel_id
  - If trigger_config.funnel_id is null/empty → fire for ALL leads (backward compatible)
```

This keeps existing automations working as-is (global), while new ones can be scoped to specific funnels.

