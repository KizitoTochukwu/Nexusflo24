## Goal

Make the Condition step clearly show **what happens next** for both YES and NO outcomes — matching the reference screenshot ("Proceed to Step 3.", "Send WhatsApp…", "Wait 1 day.") — and add a one-click **"Proceed to next step"** option for the YES path so users don't always have to build a full branch.

Scope: UI/UX changes inside `src/components/automations/AutomationStepEditor.tsx`. No backend changes — the engine already falls through to the next step when a YES branch is absent, so "Proceed to next step" is just making that default explicit.

## What changes

### 1. New "Outcome summary" block inside every Condition card

Rendered just under the condition rule row (Email opened / has happened / in last 1 days), before Smart Actions. Two stacked rows:

```text
✅  If YES   →  Proceed to Step 3      [Change ▾]
❌  If NO    →  Send WhatsApp · Wait 1 day   [Change ▾]
```

Logic for the right-hand summary text:
- If a YES/NO branch exists for this condition → summarize the steps inside that branch in human language (e.g. "Send WhatsApp · Wait 1 day · Tag: engaged"), built from the existing `branchInfoForCondition` walker plus a small `summarizeStep(step)` helper.
- If no branch exists → show **"Proceed to Step N"** where N is the 1-based index of the next non-branch step after this condition (or "End automation" if none follows).

### 2. "Change ▾" dropdown per outcome

Each row gets a small popover/menu with these options:
- **Proceed to next step** — removes that branch (keeps inner steps if any were inside) so default fall-through applies. For a condition that already has no branch, this is the no-op current state and the option is shown as selected.
- **Build a custom branch** — calls the existing `addBranch(i, 'yes' | 'no')` so the user can drop actions/delays inside.
- **Stop automation** — inserts a tiny branch containing a single `end_automation` action.
- **Jump to step…** — inserts a branch with a `jump_to_step` action and a numeric step picker (uses existing action type already in `ACTION_OPTIONS`).

This replaces the current "+ If YES branch / + If NO branch" buttons (which become one of the menu options). The Fork row is removed; the new summary block is the single source of truth.

### 3. Inline step numbering

Compute a 1-based "Step N" label for every non-branch, non-trigger step and show it as a small badge in the card header (next to the existing type badge). This lets the "Proceed to Step 3" text actually reference a visible step number — matching the reference screenshot.

### 4. Visual polish

- YES row uses the existing emerald token (`bg-emerald-50 text-emerald-700 border-emerald-200`).
- NO row uses the existing rose token.
- Summary text truncates with `line-clamp-1` and shows a tooltip with the full list on hover.
- Keeps the existing Smart Actions strip below — unchanged.

## Files touched

- `src/components/automations/AutomationStepEditor.tsx` — add `summarizeStep()` helper, `nextStepNumberAfter(i)` helper, new `OutcomeRow` sub-render inside the Condition block, step-number badge in the card header, remove the standalone Fork buttons row.

No new files, no schema changes, no edge-function changes.

## Out of scope

- Reworking the underlying `branch_yes_start`/`branch_yes_end` data model.
- Engine changes to `execute-automation` — current fall-through already implements "Proceed to next step".
- Touching workflow canvas (`WorkflowEditor` / React Flow) — this is the legacy step-list editor only.