

## Give the text editing field more horizontal room

Right now the email block editor squeezes the middle canvas (where you type your text) between a 180px palette on the left and a 220px properties panel on the right, plus a `max-w-[600px]` cap on the canvas itself. With the inspector pane at 640px, the typing area ends up very narrow.

### What changes

- **Left palette (Content Blocks)**: shrink from `180px` → `140px`. Block tiles (Text/Image/Button/etc.) stay readable, just tighter.
- **Middle canvas (where you type)**: remove the `max-w-[600px]` cap so it fills all remaining space in the column. This is the field that grows.
- **Right properties panel**: unchanged at `220px`.

Net result: the typing field gains roughly 80–100px of width, matching HubSpot's proportions where the canvas is the dominant column.

### Files touched

- `src/components/automations/email-editor/email-blocks/EmailBlockLibrary.tsx` — width `w-[180px]` → `w-[140px]`
- `src/components/automations/email-editor/email-blocks/EmailBlockCanvas.tsx` — drop `max-w-[600px] mx-auto` from the inner wrapper, keep `min-h-[400px] text-xs`

### Out of scope

- Changing the inspector pane width (already 640px).
- Restyling the palette tiles or properties controls.

