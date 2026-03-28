

## Fix Embed Code Dialog Layout

The dialog is too wide at `sm:max-w-3xl`, causing content to float with excessive whitespace. The fix is to constrain the width and stack all config fields vertically for a clean single-column layout.

### Changes

**File: `src/components/funnels/EmbedCodeDialog.tsx`**

1. Change dialog width from `sm:max-w-3xl` to `sm:max-w-lg` (max 512px) — fits the content naturally without wasted space.

2. Replace the 2-column config grid with a single-column stack (`space-y-2`) so Lead Source, Tags, Button Text, and Accent Color each get a full-width row — no cramped inputs, no horizontal scroll.

3. Make field checkboxes more compact: reduce padding from `px-3 py-2.5` to `px-3 py-2` and use `rounded-md` instead of `rounded-lg`.

