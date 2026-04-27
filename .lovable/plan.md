The inconsistency is coming from the funnel builder using two different display paths for the same headline:

1. The right-side headline field is a generic rich-text editor. It shows the stored text in a small editor style, not the actual funnel headline style.
2. The canvas renders the same saved text as a heading block, applying the block’s font size, weight, alignment, line height, and color.
3. The selected canvas element also contains an injected `<style>` tag for color scoping, which is why the design inspector sees CSS text mixed with the headline text.
4. Inline rich-text spans inside the headline can still carry their own font/formatting, so part of the headline can render differently from the rest even when the block-level headline settings look correct.

Plan to fix it:

1. Normalize heading rendering
   - Update the heading renderer so all child inline elements inherit the heading’s font size, font weight, line height, and default color unless the user intentionally set an inline text color/highlight.
   - Keep rich text color spans working, but prevent accidental inline sizing from making part of the headline smaller.

2. Move scoped style injection out of visible text flow
   - Replace the inline `<style>` element inside each heading/text block with a safer rendering approach that does not appear in the element’s `textContent`.
   - This will stop the inspector/selection text from showing CSS like `[data-bc-scope=...] { color: ... }` as part of the headline content.

3. Make the headline field better match the canvas
   - Pass heading-specific styling into `FunnelTextEditor` when editing a heading block.
   - The right-side headline field will preview the same font size, weight, line height, alignment, and color defaults used by the canvas, so editing feels consistent.

4. Preserve intended inline formatting
   - Keep text color and highlight tools functional.
   - Strip or neutralize unintended inline font-size/line-height differences in heading content so selected words do not unexpectedly shrink or behave differently.

5. Validate the funnel editor flow
   - Check that editing the headline updates the canvas consistently.
   - Check that block-level color still works.
   - Check that selected text color/highlight still applies and persists.
   - Check that public funnel rendering matches the editor canvas.