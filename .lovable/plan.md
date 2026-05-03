Remove the `max-w-5xl` width cap on the automation details content wrapper so it fills the viewport edge-to-edge.

## Change
File: `src/components/automations/AutomationDetailsDrawer.tsx` (line 153)

Before:
```tsx
<div className="max-w-5xl px-4 py-[24px] sm:px-[24px] my-0 mx-0">
```

After:
```tsx
<div className="w-full px-4 py-[24px] sm:px-[24px] my-0 mx-0">
```

This removes the 64rem max-width constraint so the workflow/logs content stretches to the full width of the parent container, matching the sticky top bar above it.