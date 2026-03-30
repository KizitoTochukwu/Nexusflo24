

## Fix Automation Step Reorder Buttons

The `GripVertical` button in `AutomationStepEditor.tsx` only moves steps up (`moveStep(i, i - 1)`). There's no button to move steps down. The grip icon also misleadingly uses `cursor-grab` despite being a click handler.

### Changes — `src/components/automations/AutomationStepEditor.tsx`

Replace the single `GripVertical` drag button (line ~86) with two proper buttons using `ChevronUp` and `ChevronDown` icons (already imported pattern from `EmailBlockCanvas`):

- Add `ChevronUp` and `ChevronDown` to the lucide imports
- Replace the grip button with two icon buttons:
  - **Up**: `onClick={() => moveStep(i, i - 1)}`, disabled when `i === 0`
  - **Down**: `onClick={() => moveStep(i, i + 1)}`, disabled when `i === steps.length - 1`
- Style them similarly to the block canvas pattern (small ghost buttons, visible on hover)

Single file change, no backend work needed.

