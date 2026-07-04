## Goal
Convert the automation "Tag" field (for the `lead_tagged` trigger) from a restrictive dropdown into a free-text input so users can type any exact tag that matches their leads (e.g. `qualified`, `facebook-ads`, `meta-lead-ad`, custom values from Make.com, CSV imports, etc.).

## Files to change
1. **`src/components/automations/AutomationDetailsDrawer.tsx`** (used by the drawer in the screenshot)
   - Replace the `Select` + `AUTOMATION_TAG_OPTIONS.map(...)` block (~lines 211–220) with a plain `<Input>` bound to `tagValue`.
   - Placeholder: `e.g. facebook-ads, qualified, meta-lead-ad`.
   - Keep the helper text: "Fires whenever this exact tag is added. Leave blank to match any tag."
   - Remove the now-unused `AUTOMATION_TAG_OPTIONS` import (and `Select*` imports if no longer used elsewhere in the file — verify before removing).

2. **`src/components/automations/CreateAutomationDialog.tsx`** (same field in the create-new dialog, for consistency)
   - Same swap: `Select` → `<Input>` with the same placeholder and helper text.
   - Clean up unused imports.

## Behaviour preserved
- `tagValue.trim()` is still written into `triggerConfig.tag` on save — no change to persistence, backend, or trigger matching logic.
- Leaving the field blank still means "match any tag".
- Existing automations with a preset tag still load their value into the input.

## Out of scope
- `tagOptions.ts` stays in place (still used by `add_tag` / `remove_tag` action editors and other places). No taxonomy changes.
- No changes to trigger matching, edge functions, or DB.