

## Plan: Overhaul Funnel Page Builder — Full Block Editing & Video Block

This is a large feature touching 5 files (modify) + 2 new files. The work breaks into these phases:

---

### 1. Add `video` block type + expand block defaults

**File: `src/components/funnels/builder/blockTypes.ts`**

- Add `"video"` to `BlockType` union
- Add `video` defaults: `{ src: "", provider: "youtube", autoplay: false, mute: false, loop: false, controls: true, aspectRatio: "16:9" }`
- Expand existing block defaults with richer properties:
  - **Section**: add `backgroundImage`, `backgroundOverlay`, `gradientFrom`, `gradientTo`, `backgroundType` ("solid"|"gradient"|"image"), `paddingTop/Right/Bottom/Left`, `marginTop`, `marginBottom`, `alignment`, `borderRadius`, `borderWidth`, `borderColor`, `shadow`, `hideOnMobile/Tablet/Desktop`
  - **Columns**: add `columnWidths`, `verticalAlign`, `stackOnMobile`
  - **Heading**: add `fontSize`, `fontWeight`, `lineHeight`, `maxWidth`
  - **Text**: add `fontSize`, `lineHeight`
  - **Button**: add `openNewTab`, `paddingX`, `paddingY`
  - **Image**: add `objectFit`, `shadow`, `alignment`, `linkUrl`
  - **Divider**: add `style` ("solid"|"dashed"|"dotted"), `width`
  - **Spacer**: (keep as-is)
  - **Embed**: add `aspectRatio`, `useAspectRatio` boolean
- Add `"video"` to `BLOCK_LABELS`

### 2. Rebuild `PropertiesPanel` with per-block property editors

**File: `src/components/funnels/builder/PropertiesPanel.tsx`**

Extract block-specific property panels into sections. Every block gets a "Reset Styles" button. Key additions:

- **Section**: background type selector (solid/gradient/image), individual padding inputs (linkable), margin, max-width preset selector, alignment, border controls, shadow toggle, visibility toggles per device
- **Columns**: gap, width presets (50/50, 60/40, etc. + custom), vertical alignment, stack-on-mobile toggle
- **Heading**: font size, weight, line-height, max-width fields
- **Text**: font size, line-height
- **Button**: open-in-new-tab switch, padding controls
- **Image**: alignment, object-fit, shadow toggle, link URL
- **Divider**: style select, width
- **Embed**: aspect ratio toggle + selector
- **Video**: URL input, provider auto-detect, autoplay/mute/loop/controls toggles, aspect ratio selector

### 3. Update `BlockCanvas` to render all blocks with live prop styling

**File: `src/components/funnels/builder/BlockCanvas.tsx`**

- Section preview renders with actual background color/gradient/image, padding, border, shadow
- Columns renders with actual gap and column width ratios
- Image renders with objectFit and shadow
- Embed renders with aspect ratio wrapper
- Video renders with embedded player (YouTube/Vimeo iframe or HTML5 video for MP4)
- Add block type label badge on each block for clarity

### 4. Update `PublicBlockRenderer` with video + enhanced rendering

**File: `src/components/funnels/PublicBlockRenderer.tsx`**

- Add `video` case: parse YouTube/Vimeo URLs into embed URLs, support MP4 with `<video>` tag, apply autoplay/mute/loop/controls props
- Embed: wrap in aspect-ratio container when `useAspectRatio` is true
- Section: apply gradient/image backgrounds
- Image: apply objectFit, shadow, link wrapping
- Button: apply `target="_blank"` when `openNewTab`

### 5. Update `BlockLibrary` to include Video block

**File: `src/components/funnels/builder/BlockLibrary.tsx`**

- Add `"video"` to the "Advanced" group
- Import `Video` icon from lucide

### 6. Create helper for YouTube/Vimeo URL parsing

**New file: `src/components/funnels/builder/videoUtils.ts`**

- `parseVideoUrl(url)` → returns `{ provider, embedUrl }` or null
- Handles youtube.com, youtu.be, vimeo.com patterns
- Falls back to direct URL for MP4

---

### What stays the same
- `StepPageBuilder.tsx` — no changes needed, it already passes blocks/props correctly
- `FunnelDetailPage.tsx` — no changes needed
- `useFunnels.ts` — no changes needed, JSON schema is flexible
- Database schema — `page_content` is already JSONB, no migration needed

### Technical notes
- All new props have defaults in `BLOCK_DEFAULTS` so existing saved funnels load without errors
- No nesting/children support changes in this iteration (columns/sections already support children in PublicBlockRenderer; builder treats them as flat for simplicity)
- "Reset Styles" resets to `BLOCK_DEFAULTS[type]()` for the selected block

