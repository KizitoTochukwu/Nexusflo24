

## Plan: Flexible Logo Sizing (Independent Width & Height)

Currently the header logo uses a single `size` value applied equally to both width and height, forcing a square shape. This change splits it into independent `width` and `height` controls so logos of any aspect ratio display correctly.

### Changes

**1. Update `TemplateSettings` interface** (`EmailTemplateSettings.tsx`)
- Replace `size: number` with `width: number` and `height: number` in the `logo` type
- Update `DEFAULT_TEMPLATE_SETTINGS` to use `width: 120, height: 56` (a sensible horizontal default)

**2. Update the settings UI** (`EmailTemplateSettings.tsx`)
- Replace the single "Size" slider with two sliders: "Width" (32–300px) and "Height" (32–200px)
- Add an "Auto height" toggle that, when enabled, renders the image with `height: auto` so it scales proportionally based on width alone

**3. Update the email preview renderer** (`emailPreviewRenderer.ts`)
- Change the `<img>` tag from `width="${ts.logo.size}" height="${ts.logo.size}"` to use the new `width` and `height` values
- When auto-height is on, omit the `height` attribute and use `height:auto` in the inline style

**4. Backward compatibility**
- If an older `size` field is found (no `width`/`height`), fall back gracefully: `width = size`, `height = size`

### Files Modified
- `src/components/automations/email-editor/EmailTemplateSettings.tsx` — interface, defaults, UI controls
- `src/components/automations/email-editor/emailPreviewRenderer.ts` — rendered logo dimensions

