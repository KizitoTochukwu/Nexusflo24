## Hide Exit Rules from Automation Create/Edit UI

### Goal
Remove the Exit Criteria editor from the automation creation dialog and the automation details drawer, while keeping all underlying exit-criteria logic fully intact (evaluation, default generation, backfill banner, log filtering, exited counts).

### Changes

1. **CreateAutomationDialog.tsx**
   - Remove the `<ExitCriteriaEditor>` JSX block (lines 303–307).
   - Remove the unused `ExitCriteriaEditor` import.
   - Keep `exitCriteria` state, `getDefaultExitCriteria` calls, and `handleCreate` save logic unchanged — defaults will still be saved silently.

2. **AutomationStepEditor.tsx**
   - Remove the "Exit criteria" popover button + its `<ExitCriteriaEditor>` child (lines 707–730).
   - Remove unused `Popover`, `PopoverContent`, `PopoverTrigger` imports.
   - Keep `exitCriteria` / `onExitCriteriaChange` props intact — they are still passed and saved by the parent drawer.

### What stays untouched
- `DashboardAutomations.tsx` backfill banner and exited counts column.
- `exitCriteria` evaluation in `execute-automation` edge function.
- Default exit criteria generation (`getDefaultExitCriteria`).
- Log filter for "Exit criteria" events.
- All database fields (`exit_criteria` column) and API hooks.