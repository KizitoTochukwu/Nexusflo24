

## Fix Content Cut-Off on Public Funnel Pages

The public funnel page (`PublicFunnel.tsx`) wraps all content in `max-w-4xl px-4 py-12`, which clips section blocks that are designed to be full-width (e.g., sections with background colors/images, columns with wide content, images).

### Changes

**File: `src/pages/PublicFunnel.tsx`** (lines 186-191)

Remove the constraining `max-w-4xl px-4 py-12` wrapper. Let each section block manage its own max-width internally (sections already have a `maxWidth` prop with `mx-auto`). Keep `min-h-screen bg-white` on the outer div.

Change:
```tsx
<div className="min-h-screen bg-white">
  <div className="mx-auto max-w-4xl px-4 py-12">
    <PublicBlockRenderer ... />
  </div>
</div>
```

To:
```tsx
<div className="min-h-screen bg-white">
  <PublicBlockRenderer ... />
</div>
```

**File: `src/components/funnels/PublicBlockRenderer.tsx`**

In the main `PublicBlockRenderer` component, wrap the block list in a container that provides sensible defaults for non-section blocks (headings, text, buttons, images etc. that are not inside a section). Section blocks will break out to full width.

Update the root render to:
- Wrap each block: if it's a `section`, render it full-width (no extra container). For all other top-level blocks, wrap in `max-w-4xl mx-auto px-4` so they don't stretch edge-to-edge but also don't get clipped.

This ensures:
- Sections with backgrounds span full width as designed
- Text, headings, buttons, images at root level stay centered and readable
- Nothing gets clipped on the left or right

