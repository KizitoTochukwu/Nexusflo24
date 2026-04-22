

## Redesign Workflow Builder — HubSpot-style UX

Restyle the Workflow Editor so it visually and functionally mirrors the HubSpot screenshot: a dark navy top bar with centered editable title and a "Review & turn on" CTA, a secondary File/Edit/Settings/View/Help menu strip, a left-side step picker with grouped trigger categories (instead of a flat sidebar list), and a vertically-flowing canvas with rounded "Trigger → … → End" cards centered along a single guide line.

### What changes (UI only — engine, hooks, DB unchanged)

**1. Top bar — dark "command bar"**
- Replace the white top bar with a dark navy (`bg-primary text-primary-foreground`) bar.
- Left: compact `Back` button (outlined, light on dark).
- Center: editable workflow title with pencil icon (click to edit inline).
- Right: status chip + `Review and turn on` primary button (replaces today's "Publish"). Disabled state when validation errors exist, with tooltip listing the first error. Keeps the existing publish/unpublish/pause logic — only the label and styling change. A small dirty-state dot + "Saved Xm ago" appears next to the title.

**2. Menu strip (new)**
- Light strip directly under the top bar with `File ▾  Edit ▾  Settings  View ▾  Help ▾`.
- Hooks into existing actions (no new backend):
  - **File**: Save draft, Duplicate, Delete, Back to list.
  - **Edit**: Undo/Redo (uses React Flow history), Clear canvas.
  - **Settings**: Opens the right inspector in "Workflow settings" mode (re-enrollment, suppression tags — already built).
  - **View**: Toggle minimap, toggle grid, fit view, zoom in/out.
  - **Help**: Link to docs / opens a tips popover.

**3. Left panel — "Choose a trigger / step" picker**
- Replace the flat scrollable palette with a HubSpot-style picker:
  - Header: `Triggers` with a `Next ›` button (jumps to the next unconfigured node).
  - Search input: "Search triggers, actions, properties…" (filters across TRIGGERS + ACTIONS + CONDITIONS).
  - Three quick chips: `Trigger manually`, `Met filter criteria`, `On a schedule`.
  - Collapsible categorized rows with colored circular icons matching the screenshot:
    - 🟢 Data values — Lead/score/property triggers
    - 🟠 Emails, calls & communication — email/SMS/WhatsApp send + reply triggers
    - 🟣 Websites & media — link clicked, form submitted, funnel step
    - 🔵 Automations triggered — campaign completed, automations chained
    - 🟡 Custom events & external events — webhook, custom triggers
  - "Skip trigger and choose eligible records" link at the bottom (keeps current "blank canvas" behavior).
- The same panel switches contextually:
  - Empty selection → trigger picker (above).
  - Node selected → moves to the right inspector (already present).
  - "Add step" button on canvas → opens this same panel pre-filtered to actions/conditions.

**4. Canvas — vertical flow with rounded cards**
- Default layout is **vertical, top-to-bottom**, centered along an auto-routed guide line (current canvas is free-form).
- Node restyle (still React Flow under the hood):
  - Trigger card: white rounded-xl card, soft shadow, flag icon + "Trigger" header, body shows `When this happens` + a small "Configuring…" pill if unconfigured. `Re-enroll on/off` toggle and `Details` link in the footer (mirrors screenshot).
  - Action / Condition cards: same card shell with category-colored icon chip and clear title/subtitle.
  - End node: small pill labeled `End`, automatically appended after the last node.
  - Between every pair of nodes: vertical connector with a hover-revealed `+` button to insert a step (opens the left picker filtered to actions/conditions).
- Background: very light slate (`bg-muted/30`) with subtle dot grid; minimap hidden by default (toggle from View menu); zoom controls bottom-right.

**5. Right inspector — unchanged behavior, lighter chrome**
- Keep the existing 480px inspector and AutomationEmailEditor integration.
- Open it via `Details` on a card or by clicking a node. Add an `X` close button and a sticky header with the node title for parity with HubSpot.

### Files touched

- `src/pages/dashboard/WorkflowEditor.tsx` — top bar, menu strip, layout, vertical auto-layout helper, custom node renderers, "+" inserter between nodes.
- `src/pages/dashboard/WorkflowEditor.tsx` (inline) or new `src/components/workflows/StepPickerPanel.tsx` — the new categorized trigger/action picker with search and colored category icons.
- `src/components/workflows/WorkflowNodeCard.tsx` (new) — the HubSpot-style React Flow custom node (trigger / action / condition / end variants).
- `src/lib/workflows/nodeLibrary.ts` — add a `category` field (`data` / `comms` / `web` / `automation` / `custom`) and a category color so the picker can group items without breaking existing `subType`s.
- `src/lib/workflows/autoLayout.ts` (new, tiny) — pure helper that arranges nodes vertically (x = canvas center, y = 120px steps) when the user adds via the picker or the "+" inserter; manual drag still works.

### What stays the same

- Database schema, edge functions (`enroll-workflow-leads`, `execute-workflow`, `process-scheduled-jobs`), hooks (`useWorkflows`, `useUpdateWorkflow`), validation, publishing flow, AutomationEmailEditor integration, and existing canvas_json shape — only the rendering layer changes so existing workflows open unchanged.

### Out of scope (call out, don't build)

- Real undo/redo history (we'll wire React Flow's built-in node/edge stack only).
- HubSpot's full property/filter criteria builder — we'll keep the existing per-subType inspector controls for now and only restyle them.

