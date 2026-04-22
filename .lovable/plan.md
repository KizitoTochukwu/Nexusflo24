

## Add collapse button to the left Steps panel

The left palette (Triggers / Actions / Logic / Flow) shown in your screenshot will get a small **collapse button** at its top-right edge. Clicking it slides the whole panel out to the left, leaving only a thin 36px rail with an **expand button** so you can bring it back. This gives the canvas more room — same pattern as HubSpot's workflow editor.

### What changes

- A new header strip at the top of the left panel labeled **STEPS** with a `PanelLeftClose` icon button on the right.
- Clicking it sets `paletteOpen = false` → the 240px `aside` is replaced by a 36px rail containing a `PanelLeftOpen` icon button.
- Clicking the rail's button restores the full panel.
- State is local (`useState`) so it resets per page visit; the canvas (React Flow) and right inspector are untouched.

### File touched

- `src/pages/dashboard/WorkflowEditor.tsx` — adds `paletteOpen` state, the header with close button inside the existing `<aside className="w-60 …">`, and a collapsed-rail fallback rendered when `paletteOpen` is false.

### Out of scope

- Persisting collapsed state across reloads (can be added with `localStorage` later if you want it sticky).
- Animating the collapse — it will snap open/closed for now.

