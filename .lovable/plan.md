The previous patch improved selection preservation, but it still relies primarily on `document.execCommand`. That API can report success without actually producing the expected inline style in this contentEditable + popover setup. Also, the canvas/public renderer currently applies the block-level `p.color` as an `!important` override to every child, which can hide inline per-word colors even when the editor did save them.

Plan:

1. Replace the text color application path in `FunnelTextEditor.tsx`
   - Stop relying on `execCommand('foreColor')` as the main path for text color.
   - Apply text color by directly wrapping the selected range in a `<span style="color: ...">...</span>`.
   - Apply highlight similarly with `<span style="background-color: ...">...</span>`.
   - Keep selection restoration, but make it robust for both selected text and collapsed cursor cases.

2. Make the toolbar trigger fire reliably
   - Prevent the color button/popover from stealing focus before the range is saved.
   - Save the selected range on mouse, keyboard, and selection changes inside the editor.
   - Ensure custom color input changes use the same direct wrapping logic as palette swatches.

3. Fix renderer override conflicts
   - Update `BlockCanvas.tsx` and `PublicBlockRenderer.tsx` so block-level color still applies as the default, but does not overwrite inline rich-text colors.
   - Remove or narrow the current `* { color: ... !important; }` override that masks spans created by the rich text color tool.

4. Validate
   - Run TypeScript/build checks.
   - Confirm the intended behavior: selecting text in a funnel heading/text block, clicking Text color, and choosing a swatch visibly changes that selected text and persists into the canvas/public render.