# Add the AI Workflow Generator to the Automations page

Today the "Generate with AI" entry point only exists on the Workflows page (`DashboardWorkflows`). The Automations page has no way to reach it, which is why you can't find it at `/dashboard/:id/automations`.

## What will change

Add a **Generate with AI** button to the Automations page header, next to "Create Automation" and the template buttons. It opens the same generator dialog: you describe the automation in plain English, review the generated steps (with "needs setup" flags), regenerate if needed, then save it as a draft and open it in the visual builder.

Access stays the same as today: Pro, Enterprise, and admins can use it; Starter/Plus see the upgrade prompt.

On mobile the button will sit full-width above the list so it's reachable on small screens.

## Note on where the result lands

The generator produces a **visual workflow** (the drag-and-drop builder), not a legacy automation row. So after saving, you'll be taken into the workflow editor. The Automations page just gains the entry point so you can start from there. If you'd rather it create a classic Automation record instead, say so and I'll adjust the plan.

## Technical details

- `src/pages/dashboard/DashboardAutomations.tsx`
  - import `AiWorkflowGeneratorDialog`, `LockedFeature`, `usePlanGating`, `Sparkles`
  - add `aiOpen` state; render the button wrapped in `<LockedFeature locked={!canAccess("aiWorkflowGenerator")} featureName="AI Workflow Generator" requiredPlan="pro">`
  - render `<AiWorkflowGeneratorDialog open={aiOpen} onOpenChange={setAiOpen} />` at page bottom
  - make the header action row wrap (`flex-wrap`) so buttons don't overflow on mobile

No backend, schema, or edge-function changes — the existing `generate-workflow` function and its plan gate are reused as-is.
