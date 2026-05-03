## Problem

YES/NO branching exists in the engine and renders visually when present, but the **Workflow editor has no buttons to add branches manually**. Today the only way to get YES/NO branches is to click "Seed: Subscriber Nurture" — there's no way to add them to your own automations or to a condition you just created.

That's why you "can't see / use" YES/NO branching in the UI: the controls don't exist yet.

## Solution

Add first-class branching controls to `AutomationStepEditor.tsx` so any condition step can fork into YES / NO paths.

### 1. "Add YES branch" / "Add NO branch" buttons on every condition step

Inside each `condition` block, render two small buttons next to the condition row:

- **+ If YES** (emerald) — inserts `branch_yes_start` immediately after the condition and a matching `branch_yes_end` after it (empty body, ready for steps).
- **+ If NO** (rose) — same for `branch_no_start` / `branch_no_end`.

Buttons are hidden if a YES/NO branch already exists for that condition (detected by scanning forward until the next condition or end of list).

### 2. "Add step inside branch" affordance

When the cursor is inside an open branch (between `branch_*_start` and `branch_*_end`), the existing bottom "Add Action / Delay / Condition" row stays — but we also render a smaller inline **+ Add step here** button just above each `branch_*_end` marker that inserts the new step *inside* the branch instead of after it.

### 3. Make branch markers removable

Today `branch_yes_start` etc. render as read-only badges. Add a small × button on each start marker that removes both the matching start and end markers (keeping any steps between them, just un-nested). This lets users undo a branch without losing work.

### 4. Improve the visual container

Wrap steps that fall between `branch_*_start` and `branch_*_end` in a subtly tinted, left-bordered container (emerald for YES, rose for NO) so the fork is obvious at a glance — matching the Timeline tab's styling.

### 5. Update the empty-state hint

On the bottom action row, when the last step is a `condition` with no branches yet, surface a subtle hint: *"Tip: Add an If YES or If NO branch to fork on this condition."*

## Where to find / use it after

Open any automation drawer → **Workflow** tab → add (or click into) a Condition step → use the new **+ If YES** / **+ If NO** buttons on that condition. Steps added afterwards while inside a branch will be visually nested into that branch and only run on that path.

## Technical notes

- File: `src/components/automations/AutomationStepEditor.tsx` only. No engine, hook, or DB changes — the executor already understands these markers.
- Branch detection helper: walk `steps` forward from condition index `i`, tracking whether `branch_yes_start`/`branch_no_start` appears before the next `condition` step — gives `hasYes` / `hasNo` flags per condition.
- Insertion helper: when adding a YES branch, splice `[{branch_yes_start}, {branch_yes_end}]` at `i+1`; opening pos for nested-step inserts is `endIndex` (before the `_end` marker).
- Removal helper: find matching start/end pair by scanning forward for the same `kind`, splice both out.
- Keep the existing seeder-driven flows working — markers without an immediately-preceding condition (legacy/manually edited) still render as today.
- Types in `useAutomations.ts` already include the four branch step types, so no type changes needed.