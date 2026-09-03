# CRM Pipelines — Remove duplicate empty pipelines

## Finding
Your current workspace has 4 pipelines, all empty (0 deals):
- **Sales Pipeline** — created 5 Aug, marked as the default. This is the one to keep.
- **New pipeline** x3 — created 5 Aug (x2) and 2 Sep. These are unused duplicates, likely created by clicking "New pipeline" without renaming. Two other workspaces each have exactly 1 pipeline (no action needed there).

## Recommendation
Delete the 3 "New pipeline" copies. They hold no deals, so deletion loses nothing. Keep "Sales Pipeline" as the default — deals, automations, and CRM defaults point at it.

## Changes

### 1. Delete the duplicate pipelines (database)
- Delete the 3 `New pipeline` rows (ids `21caa785…`, `9e78c366…`, `a07876a8…`) and their `crm_pipeline_stages` rows, scoped to workspace `95bc7e99-…`.
- Verify afterwards: exactly 1 pipeline remains in this workspace, still the default, with its 6 stages.

### 2. Verify in the UI
- Reload CRM → Pipelines and confirm only "Sales Pipeline" remains and Deals/Kanban still work.

## Notes
- No code changes needed — this is data cleanup only.
- If you ever want multiple pipelines on purpose (e.g. "Sales" vs "Partnerships"), rename the pipeline instead of creating unnamed copies.
