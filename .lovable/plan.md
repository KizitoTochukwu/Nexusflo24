# Wire the Instant Response trigger accurately

The Send Email action and 0–5 min timing already work. The three trigger paths have gaps. Fix them so any of the three (`new lead created` OR `form submitted` OR `tag added = new-lead`) reliably fires the Instant Response automation exactly once per real event.

## 1. `new_lead` — only fire for genuinely new leads

**File:** `supabase/functions/capture-lead/index.ts` (lines 526–566)

- Wrap the `new_lead` automation dispatch block in `if (!existing) { ... }`. Returning leads (matched by email or phone) must not retrigger "New lead created".
- Update the misleading comment on line 526 from *"for both new and returning leads"* to *"only for brand-new leads"*.
- The triggered-campaigns block right below (lines 568–596) gets the same `if (!existing)` guard for the same reason.

## 2. `form_submitted` — make it a real automation trigger

**File:** `src/hooks/useAutomations.ts` (TRIGGER_OPTIONS, lines 43–59)

Add a new entry:
```ts
{ value: "form_submitted", label: "Form submitted (any form / specific form)" }
```

**File:** `src/components/automations/CreateAutomationDialog.tsx` (and `AutomationStepEditor.tsx` if it renders trigger config)

When `trigger_type === "form_submitted"`, expose an optional `form_id` selector (loaded from `forms` table for the workspace) plus an optional `funnel_id`. Empty = match any form.

**File:** `supabase/functions/capture-lead/index.ts`

After the existing `new_lead` block, add a parallel block that:
- Queries active automations with `trigger_type='form_submitted'`.
- Filters by `trigger_config.form_id` (matching `meta.formId`) and `trigger_config.funnel_id` (matching `meta.funnel_id`) — empty config = match any.
- POSTs to `execute-automation` per matched automation.
- Runs for both new and returning leads (a form submit is a form submit).

Also dispatch through the Workflows engine for parity:
```ts
fetch(`${supabaseUrl}/functions/v1/enroll-workflow-leads`, { ... event_type: "form_submitted", event_config: { form_id, funnel_id } })
```

## 3. `lead_tagged` — fire from capture-lead too

**File:** `supabase/functions/capture-lead/index.ts`

After the lead is inserted/updated and tags are merged, for every tag in `newTags` that was actually newly applied (i.e. not already present on `existing.tags`), fire:
- `trigger_type='lead_tagged'` with `trigger_config.tag === <tag>` (specific match)
- `trigger_type='tag_added'` (any tag)

Reuse the same dispatch pattern as the `new_lead` block (query active automations, match `trigger_config.tag` if set, POST to `execute-automation`). Also enroll into Workflows with `event_type: "lead_tagged"`.

This means the user's `lead_tagged = new-lead` trigger will fire whenever any capture path (form, funnel, CSV import, API) applies the `new-lead` tag.

## 4. Default-tag note (no code change, just confirm with user)

Today new leads from `capture-lead` default to `tags: ["website-signup"]` when no tags are sent. The user's plan assumes the trigger `tag added = new-lead`. Two options — the default-tag behavior is unchanged unless the user picks (b):

- (a) Recommended: keep `website-signup` as default, and have the user configure their forms / funnel destinations to apply the `new-lead` tag explicitly (already supported via `destination.tags`).
- (b) Alternative: change the default fallback tag in `capture-lead` from `["website-signup"]` to `["new-lead"]`.

I'll ship (a) by default. If you want (b), say so and I'll flip the default in the same change.

## 5. Deploy

Deploy `capture-lead` after the edits. `execute-automation` and `enroll-workflow-leads` are unchanged. Front-end edits to `useAutomations.ts` and the dialog are picked up automatically.

## Outcome

After this ships, all three trigger setups for the same automation reliably fire the Instant Response (Send Email at step 0, runs in seconds):

- `Trigger: New lead created` → fires once when a brand-new lead is captured.
- `Trigger: Form submitted` (optionally scoped to a form/funnel) → fires every time that form is submitted, new or returning lead.
- `Trigger: Tag added = new-lead` → fires whenever the `new-lead` tag is applied, whether from capture, CSV import, or manual CRM edit.

If the user attaches the same automation to all three, dedup is already handled by `execute-automation` (it skips if a pending/running `scheduled_jobs` row already exists for the same automation+lead).
