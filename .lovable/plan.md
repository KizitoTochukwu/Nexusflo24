## Goal

Make the automation Condition step read and behave like the reference samples — multiple conditions stacked, joined by **AND** / **OR**, with friction-free authoring and natural-language summaries in YES/NO branches (e.g. `Email Opened AND Link Clicked`, `Visited Pricing Page OR Visited Demo Page OR Visited Course Page`, `Appointment Booked?`).

Only the Condition step UI + its evaluation are touched. No changes to triggers, actions, or unrelated panes.

## UI changes — `src/components/automations/AutomationStepEditor.tsx`

Replace the single-row condition editor (lines ~475–652) with a stacked group editor:

- Each condition step now stores `config.conditions: ConditionRow[]` and `config.logic: "AND" | "OR"` (default `AND`).
  - `ConditionRow = { condition, operator, value, value_to, time_window_days, reply_check }`
- Render rows vertically inside the existing blue Condition card:
  - Row 1: condition selector + operator + value + optional time-window (same controls as today, just in a row component).
  - Between rows: a small inline pill toggle `AND / OR` (single global join — switching it updates `config.logic`). Matches the samples (`AND`, `OR`).
  - `+ Add condition` ghost button under the last row.
  - Trash icon per row (hidden when only one row remains).
- Keep the existing **Smart actions** chip strip; derive them from the *first* row's selected condition (unchanged behavior for single-row case).
- Reply-status special case stays as-is but is only allowed as a single-row condition (hide "Add condition" when row 1 is `reply_status`).

### Natural-language summary

Add a small helper `phraseCondition(row)` that returns friendly text:
- `email_opened / happened` → `Email Opened`
- `email_opened / not_happened` → `Email Not Opened`
- `link_clicked / happened` → `Link Clicked`
- `pricing_visited / happened` → `Visited Pricing Page`
- `checkout_visited / happened` → `Visited Checkout`
- `appointment_booked / happened` → `Appointment Booked?` (question mark for boolean checks shown standalone)
- `purchase_happened / happened` → `Purchase Made`
- `score_gt / greater_than 50` → `Lead Score > 50`
- `tag_contains / contains vip` → `Has tag "vip"`
- `email_known / is_known` → `Email Known`
- etc. (fallback: `<label> <operator> <value>`)

The condition card gets a subtle gray summary line under the rows reading e.g. `Email Opened AND Link Clicked` — read-only mirror so the user sees exactly what will appear in branches.

### YES/NO branch summary

In `renderOutcome` (lines ~654–763), update the "If YES → …" / "If NO → …" lines so that when the outcome is `proceed` and there is no custom branch, the text uses the joined natural phrasing for context:
- `If YES → Proceed (Email Opened AND Link Clicked met)`
- `If NO → End of automation`

For custom branches, keep current `summarizeStep` chain but ensure newlines render (already `whitespace-pre-line`).

## Backend evaluation — `supabase/functions/execute-automation/index.ts`

Extend the `case "condition"` block (~line 937) to support the new shape while staying backward-compatible:

1. If `config.conditions` is a non-empty array, evaluate each row using the existing per-type logic (refactor today's inline branches into a small `evaluateRow(row, lead, ctx)` helper inside the same case).
2. Combine with `config.logic`:
   - `AND` → `passed = rows.every(...)`
   - `OR` → `passed = rows.some(...)`
3. Otherwise fall through to existing single-row logic (legacy steps keep working).
4. `details` payload becomes `{ logic, rows: [...perRow], passed }` so the execution timeline shows each sub-check.

## Data migration

No DB migration required — `config` is JSONB. New steps write the array shape; old steps are read via the legacy fallback. When the editor loads a legacy step it virtually wraps it into a one-row array in local state on first edit (no auto-write).

## Out of scope

- Nested groups (AND of ORs). Single join operator only, matching all reference samples.
- Changing trigger/action panes, smart-actions overrides, exit criteria, or styling tokens.
- Changing the published `summarizeStep` for non-condition actions.

## Files touched

- `src/components/automations/AutomationStepEditor.tsx` — condition editor + branch summary phrasing.
- `src/hooks/useAutomations.ts` — export `phraseCondition` helper + `ConditionRow` type (kept here so the same phrasing can be reused in timeline/details drawer later).
- `supabase/functions/execute-automation/index.ts` — multi-row evaluator with AND/OR.
