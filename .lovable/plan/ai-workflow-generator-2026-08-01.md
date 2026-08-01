# AI Workflow Generator

Let users describe an automation in plain English and get a ready-to-edit visual workflow on the canvas — reviewable, editable, and only published when they choose.

## What the user sees

1. On **Dashboard → Workflows**, a new "Generate with AI" card/button sits next to "Create workflow" and the template gallery.
2. Clicking it opens a dialog:
   - A large prompt box with the placeholder example ("When a new insurance lead submits the assessment form, assign the lead to the insurance sales team, send a confirmation email, wait one day, create a follow-up task, and notify the sales manager if the lead has not been contacted.")
   - A few one-click starter prompts (lead follow-up, booking reminder, re-engagement, hot-lead alert).
   - Generate button with a loading state.
3. After generation, a **review step** inside the dialog shows the proposed workflow: name, description, detected enrollment trigger, and a readable step-by-step list (with delays, branches and any fields the AI could not fill flagged as "Needs setup").
4. User can regenerate with edits to the prompt, or "Open in builder" — this creates the workflow as a **draft** and navigates to the existing Workflow Editor, where every node can be edited normally. Nothing is ever auto-activated; publishing stays the existing Activate action.

## Access control

- Visible and usable only for **Pro and Enterprise** plans and **admins** (admin already bypasses all gating via `usePlanGating`).
- Starter/Plus users see the entry point wrapped in the existing `LockedFeature` treatment with an upgrade prompt, matching how other gated features look.
- The backend enforces the same rule, so the feature cannot be used by calling the function directly.

## Technical notes

**Plan flag**
- Add `aiWorkflowGenerator: boolean` to `PlanLimits` in `src/lib/billing/planLimits.ts`: false for starter/plus, true for pro/enterprise (admin override already grants everything).

**Edge function `generate-workflow`**
- New function modelled on `generate-funnel`: takes `{ prompt, workspace_id }`, verifies the bearer token with `supabase.auth.getClaims(bearer)`, checks workspace membership, then checks admin role or an active pro/enterprise subscription; returns 403 otherwise.
- Calls Lovable AI Gateway (`google/gemini-3.5-flash`) with a system prompt that embeds the **exact allowed vocabulary** from `src/lib/workflows/types.ts` and `nodeLibrary.ts` (trigger/action/condition subTypes) plus the enrollment-trigger catalog fields, and instructs JSON-only output matching `WorkflowCanvasJSON` plus `name`, `description`, `enrollment` (object type, method, source, event, config, filter_groups).
- Response is normalised server-side: strip code fences, drop unknown subTypes, ensure exactly one trigger node, auto-lay out node positions on a vertical grid (branch offsets for condition yes/no), rebuild edge ids, and guarantee every edge references existing nodes. Any node missing required config keeps a `needsSetup: true` marker in its data so the review list and canvas can flag it.

**Frontend**
- `src/components/workflows/AiWorkflowGeneratorDialog.tsx` — prompt step + review step, calls the function via `supabase.functions.invoke`, surfaces real JSON error messages in the toast.
- `src/lib/workflows/aiWorkflowNormalize.ts` — shared client-side type guard/normaliser reused for the review summary, validated against `src/lib/workflows/validation.ts`.
- On confirm, use the existing `useCreateWorkflow` mutation with `status: "draft"` and the generated `canvas_json`, persist the enrollment trigger columns, then navigate to `/dashboard/:workspaceId/workflows/:id`.
- Wire the entry point in `src/pages/dashboard/DashboardWorkflows.tsx` behind the plan check.

**Out of scope**: no changes to the execution engine, no new node types, no auto-activation.
