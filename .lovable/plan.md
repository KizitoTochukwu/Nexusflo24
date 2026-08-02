# AI Automation Generator — build the automation on the Automations page

Today the "Generate with AI" button on the Automations page opens the workflow generator: it creates a visual workflow record and navigates you away to the Workflow Builder. You want it to stay on the Automations page and produce a real Automation instead.

## What will change

- The Automations page gets its own **Generate with AI** dialog that produces an **Automation** (name, description, enrollment trigger, and ordered steps) — no redirect to Workflows.
- You describe the automation in plain English, then see a preview: the trigger line plus a numbered list of steps (email, WhatsApp, SMS, tag, status, score, notify, assign, wait, condition), with "needs setup" flags for anything missing details (template, owner, tag, folder).
- Actions: **Regenerate**, **Create automation**. On create, the automation is saved as a draft/paused row and its details drawer opens on the same page so you can edit steps immediately.
- Access is unchanged: Pro, Enterprise and admins; Starter/Plus see the upgrade prompt. The server enforces the same gate.

## Technical details

- New edge function `generate-automation` (modelled on `generate-workflow`, same auth + plan gate, `google/gemini-2.5-pro` via Lovable AI):
  - System prompt constrained to the automation vocabulary: `ACTION_OPTIONS` values from `useAutomations.ts` (`send_email`, `send_whatsapp`, `send_sms`, `add_tag`, `remove_tag`, `update_status`, `update_pipeline_stage`, `adjust_score`, `notify_sales`, `assign_owner`, `enroll_in_automation`, `delay`, `end_automation`), `TRIGGER_OPTIONS` for the trigger, and `CONDITION_GROUPS` condition keys.
  - Returns `{ name, description, trigger: { enrollment_object_type, enrollment_method, trigger_source, trigger_event, trigger_config, filter_groups, reenrollment_config, trigger_summary }, steps: [{ step_type, config }] }`.
  - Normalisation server-side: drop unknown actions/conditions, coerce delays to `{ step_type: "delay", config: { duration, unit } }`, balance `branch_yes_start/end` + `branch_no_start/end` markers if a condition is emitted, flag `needsSetup` for configs missing required keys.
- New `src/components/automations/AiAutomationGeneratorDialog.tsx`: prompt textarea + examples, preview list reusing the badge/step summary style of the existing generator dialog, then `useCreateAutomation()` (from `src/hooks/useAutomations.ts`) to insert the automation and its `automation_steps` in one call. `trigger_type` is kept in sync with `trigger_event` exactly as `CreateAutomationDialog` does today.
- `src/pages/dashboard/DashboardAutomations.tsx`: swap `AiWorkflowGeneratorDialog` for the new dialog; keep the `LockedFeature` wrapper with `canAccess("aiWorkflowGenerator")`. After creation, invalidate the automations query and open `AutomationDetailsDrawer` for the new row.
- The Workflows page keeps its existing workflow generator untouched.

No schema changes — `automations` and `automation_steps` already carry every field needed.
