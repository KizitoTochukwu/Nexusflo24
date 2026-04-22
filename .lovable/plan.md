
## Convert workflow palette to dropdown selects

The left palette currently lists every Trigger / Action / Logic / Flow item in a long scrollable column (the screenshot you shared). I'll replace each list with a single compact **dropdown select** per category, so the sidebar stays short and clean.

### What changes

In `src/pages/dashboard/WorkflowEditor.tsx`:

- Replace the four scrolling lists (Triggers, Actions, Logic, Flow) with four **Select dropdowns** — one per category — each labeled with the section name.
- Each dropdown's options are grouped internally by the existing `group` field on each palette item (e.g. Triggers → "Lead", "Engagement", "Campaigns", "Capture", "Sales", "Lifecycle"; Actions → "Messaging", "Timing", "CRM", "Scoring", "Internal", "Integration", "Flow"). This keeps the same hierarchy you have today, just collapsed behind a click.
- Each option shows the same lucide icon + label as today.
- Selecting an option calls the existing `addNodeFromPalette(item)` — the canvas-add behavior is unchanged. The dropdown then resets so you can add another step from the same category without reopening it.
- The placeholder text reads "Add trigger…", "Add action…", "Add logic…", "Add flow step…".
- A short helper line below the four dropdowns explains: "Pick a step type to add it to the canvas. Drag to reposition; connect handles to wire flow."
- Sidebar width slightly tightened (60 → 64) to fit the dropdown comfortably; the surrounding `ScrollArea` stays so the sidebar still scrolls on small viewports.

### What stays the same

- Node library (`src/lib/workflows/nodeLibrary.ts`) — unchanged.
- Canvas, inspector pane, validation, save/publish, top bar, and every other panel — unchanged.
- All existing workflows and the canvas JSON shape — unchanged.

### Files touched

- `src/pages/dashboard/WorkflowEditor.tsx` only — adds a new `PaletteDropdown` component (replacing the inline `PaletteSection` usage in the left aside) and imports `Select` from `@/components/ui/select`.
