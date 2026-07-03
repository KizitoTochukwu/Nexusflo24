## Add collapse/expand toggle to step editor cards

Add an arrow button in the header of each step card (Action, Condition, Delay) in the automation builder so users can collapse the editor body — including the Send Email / WhatsApp / SMS editors — to reduce vertical space, and expand it again to edit.

### Where
`src/components/automations/AutomationStepEditor.tsx` — the step card rendered around line 441 (the `<div>` that contains the header row with the drag handle, step badge, and trash button, followed by the type-specific bodies for `condition`, `action`, and `delay`).

### Changes

1. **Local state:** add `const [collapsedSteps, setCollapsedSteps] = useState<Record<number, boolean>>({})` in the `AutomationStepEditor` component, plus a `toggleCollapsed(i)` helper.

2. **Header toggle button:** in the header row (currently `flex items-center justify-between mb-2`), insert a `ChevronDown` / `ChevronRight` icon button (already-imported `ChevronDown` from lucide; add `ChevronRight`) immediately before the trash button:
   - Collapsed → right-chevron, tooltip "Expand"
   - Expanded → down-chevron, tooltip "Collapse"
   - Same `variant="ghost" size="icon" h-7 w-7` styling as the trash button.

3. **Compact summary when collapsed:** when the step is collapsed, show a small one-line summary next to the badges (e.g. for `send_email` show "Send Email — <subject>", for `send_whatsapp`/`send_sms` show the first ~60 chars of the message, for `delay` show "Wait X minutes", for `condition` show the existing condition summary). Reuse the existing `stepSummary`/`phraseConditionGroup` helper already in the file.

4. **Hide bodies when collapsed:** wrap the three body blocks (`step.step_type === "condition"` around line 478, `step.step_type === "action"` around line 878, `step.step_type === "delay"` around line 1297) so they only render when `!collapsedSteps[i]`. The header, drag handle, delete button, and summary stay visible.

5. **Default state:** steps default to expanded (existing behaviour). Toggling is per-step and lives in component state — no persistence needed.

### Out of scope
- No changes to trigger card, branch markers, or the outer automation drawer.
- No changes to step data, saving, execution, or the email block editor internals.
- No global "collapse all" button (can be added later if requested).
