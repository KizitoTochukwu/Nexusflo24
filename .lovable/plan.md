# Fix funnel-scoped automation triggering

When an automation is scoped to a specific funnel, it should fire whenever a new lead is associated with that funnel — not only when the lead arrives directly through the funnel's public form.

## Changes

1. **`src/lib/automations/fireTriggers.ts`** — Extend matching logic. When `trigger_config.funnel_id` is set but the event has no `funnel_id`, look up association via `funnel_visits` (lead_id + funnel_id) or `form_submissions` joined to `forms.funnel_id`. Only skip the automation if no association exists.

2. **`supabase/functions/capture-lead/index.ts`** — Mirror the same association lookup before skipping a funnel-scoped automation for `new_lead` and `form_submitted` triggers.

3. **`src/hooks/useLeads.ts`** — In `useCreateLead`, after a successful insert call `fireAutomationsForLeads({ workspaceId, leadIds: [data.id], triggerType: "new_lead" })` so manually added leads also trigger automations.

4. **UI copy** — In `CreateAutomationDialog.tsx` and `AutomationDetailsDrawer.tsx`, update the funnel-scope helper text to: "Fires when a new lead is associated with this funnel (via visit, form submission, or direct capture)."

## Notes
- No DB schema changes.
- Existing wildcard "Testing" automation (`trigger_config = {}`) continues to fire for every lead.
- Tag/folder/status scoping behavior is unchanged.
