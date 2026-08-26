# CRM properties: current state and wiring into Automations

## What I checked

| Property | Working in CRM? | Used by Automations? |
|---|---|---|
| Tags (`crm_tags`, 23 tags) | Yes — create/edit/delete works | No. The Add Tag / Remove Tag step and the exit criteria use a hardcoded list of 8 tag names (`src/lib/automations/tagOptions.ts`), not your tag library |
| Pipelines & stages (`crm_pipeline_stages`, 12 stages) | Yes — deals and stages are DB-backed | No. The "Update Pipeline Stage" step uses a hardcoded array of 9 stage names in `AutomationStepEditor.tsx` and writes to `leads.pipeline_stage` (text), never to a deal |
| Custom fields (11 definitions) | Definitions save; per-record values panel works, but 0 values are stored so far | No. Custom fields appear nowhere in automations — no condition operand, no merge variable in the email/WhatsApp/SMS editors |

Two other real bugs the screenshots show:

1. The empty tag dropdown on Step 2 happens when a step has a tag saved that is not one of the 8 hardcoded options (e.g. a tag created in CRM Settings) — the Select has no matching item so it renders blank, and re-saving can wipe it.
2. Tag usage counts on the CRM Settings Tags page count `contacts` only. Tags applied by automations land on `leads` (659 leads carry tags vs 6 contacts), which is why almost every tag reads "0 contacts".

So: yes, these properties are meant to be usable in automations, and today they are not.

## Proposed fix

### 1. Tags become workspace-driven everywhere
- Replace the hardcoded `AUTOMATION_TAG_OPTIONS` with a lookup of `crm_tags` for the current workspace (keep the 8 defaults as a fallback only when the library is empty).
- Use it in the Add Tag / Remove Tag action, the "lead tagged" trigger, exit criteria and campaign audience tag filters.
- Allow free-typing a new tag; creating it from the step writes it into `crm_tags` so the library stays the single source of truth.
- Preserve any tag already saved on a step even if it is not in the library, so existing automations stop showing blank selects.

### 2. Pipeline stages come from the workspace pipeline
- Load stages from `crm_pipelines` / `crm_pipeline_stages` for the "Update Pipeline Stage" action and the stage-based conditions/triggers.
- Keep writing `leads.pipeline_stage` as today (no behaviour change for existing runs), and keep the legacy hardcoded names as a fallback for workspaces with no pipeline configured.

### 3. Custom fields usable in automations
- Conditions: add a "Custom field" operand so a step can branch on any active custom field for contacts/companies/deals.
- Messaging: expose active custom fields as merge variables (`{{custom.field_key}}`) in the email/WhatsApp/SMS variable picker, resolved at send time from `crm_custom_field_values`.
- Add a "Set custom field" action so automations can write values back.

### 4. Tag usage counts fixed
- Count tag usage across both `contacts` and `leads` and label it "records" instead of "contacts".

## Technical notes

- New hook `useAutomationTagOptions` (wraps `useCrmTags`) and `useAutomationStageOptions` (wraps the pipeline hooks) so the editor stays presentational.
- `execute-automation` gains a `set_custom_field` action and custom-field resolution for conditions and merge variables; all lookups stay workspace-scoped and go through existing RLS.
- No schema changes needed for tags/pipelines. Custom-field merge resolution reads existing `crm_custom_field_defs` / `crm_custom_field_values` tables.

## Suggested order

Phase A: tags (dropdowns + counts) — fixes the visible bug.
Phase B: pipeline stages from the real pipeline.
Phase C: custom fields in conditions, variables and a new action.
