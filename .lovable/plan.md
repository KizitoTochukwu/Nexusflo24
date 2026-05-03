## Goal

Add true YES/NO branching to the automation engine so conditions act as forks (not gates), then re-seed the "New Subscriber Nurture" template using the new branch structure so it matches the diagram exactly.

## Approach

Keep the current flat `automation_steps` list (no schema migration). Introduce a lightweight "branch group" pattern using two new step types that the engine already iterates over:

- `branch_yes_start` / `branch_yes_end`
- `branch_no_start` / `branch_no_end`

A `condition` step's `passed` result decides which group runs; the other group is skipped. After both groups end, the main flow resumes. This is fully backwards compatible — existing automations (no branch markers) behave exactly as today.

```text
[condition: link_clicked]
  ├─ branch_yes_start
  │    score +30, status=Hot, notify sales
  │  branch_yes_end
  └─ branch_no_start
       send_sms fallback, delay 2d, send_email tips
     branch_no_end
[continue main flow…]
```

## Engine changes (`supabase/functions/execute-automation/index.ts`)

1. Add a runtime `branchSkip` stack alongside the existing `skipRemaining` flag.
2. When a `condition` step runs, record its `passed` result on a stack frame for the next branch markers.
3. On `branch_yes_start` → push frame; if last condition passed, execute inside; else skip until matching `branch_yes_end`.
4. On `branch_no_start` → mirror logic (execute when condition failed).
5. `branch_*_end` pops the frame and clears the local skip.
6. Delays inside a branch must remember which branch they're in: extend `scheduled_jobs.payload` with `branch_context` (the active branch frame) so resumes from a delay continue inside the right group. On resume, the engine rebuilds the frame from `payload.branch_context`.
7. Conditions remain non-halting by default (existing behavior preserved); branching only activates when the next step is a `branch_*_start` marker.

## Template seeder changes (`src/lib/automations/seedNurtureTemplate.ts`)

Re-author `SUBSCRIBER_NURTURE_STEPS` to use the new markers so the diagram is reproduced 1:1:

- After "email_opened" condition → YES: score+10, add tag `engaged`. NO: send SMS "did our welcome email land?".
- After "link_clicked" condition → YES: score+30, status=Hot, tag `ai-closer-handoff`, notify_sales. NO: continue to educational email path.
- After final "score_gt 40" condition → YES: notify_sales "warm lead worth a call". NO: send break-up email, score-10, add tag `cold`.

Update `SeedStep` type to allow the new `step_type` values and add brief `branch_label` config for log clarity.

## Editor surface (`src/components/automations/AutomationStepEditor.tsx`)

Minimal UI update so seeded branches are readable (not yet drag/drop authoring):

- Render `branch_yes_start` / `branch_no_start` as a labeled separator ("If YES" / "If NO") with indentation on contained steps until the matching `_end` marker.
- Hide raw `_end` markers (render as a thin closing line).
- No new authoring controls in this pass — users review/activate the seeded template; manual branch creation can come later.

## Re-seed flow (`src/pages/dashboard/DashboardAutomations.tsx`)

- Keep the "Seed: Subscriber Nurture" button.
- Detect old (pre-branch) seeded template by name; offer a one-click "Replace with branched version" that archives the old draft and inserts the new branched one.

## Out of scope (this pass)

- No drag-and-drop branch authoring in the editor (read-only render only).
- No changes to `workflows` / React Flow canvas (that's a separate richer system).
- No DB schema migration.

## Acceptance

- Seeded template reproduces the diagram exactly: YES path runs only when the condition is met, NO path runs only when it isn't.
- Existing non-branched automations continue to behave identically.
- Delays inside a branch resume into the correct branch.
- Logs show `branch:yes` / `branch:no` for clarity.
