

# Redesign Email Editor — Modern Drag-and-Drop Block Editor (HubSpot-style)

## Overview
Transform the current plain textarea email editor into a modern, visual block-based editor with drag-and-drop content blocks, inline editing, and a content sidebar — similar to HubSpot, Mailchimp, and other premium email builders.

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Subject Line Input                                      │
├──────────┬──────────────────────────────┬────────────────┤
│ Content  │         Canvas               │  Block Props   │
│ Blocks   │  ┌──────────────────────┐    │  Panel         │
│          │  │ [Text Block]  ≡ ✕    │    │                │
│ 📝 Text  │  │ Hi {{first_name}}... │    │  Font Size: 15 │
│ 🖼 Image │  ├──────────────────────┤    │  Color: #000   │
│ 🔘 Button│  │ [Image Block] ≡ ✕   │    │  Align: left   │
│ ── Divider│ │ [hero.jpg]          │    │                │
│ ↕ Spacer │  ├──────────────────────┤    │                │
│ 🔗 Social│  │ [Button Block] ≡ ✕  │    │                │
│ 📊 Columns│ │ [ Get Started ]     │    │                │
│          │  └──────────────────────┘    │                │
├──────────┴──────────────────────────────┴────────────────┤
│  Preview Toggle  |  Device Switcher  |  Presets          │
└─────────────────────────────────────────────────────────┘
```

## New Files

### 1. `src/components/automations/email-editor/email-blocks/emailBlockTypes.ts`
- Define email block types: `text`, `image`, `button`, `divider`, `spacer`, `social`, `columns`
- Each block has `id`, `type`, `props` (type-specific styling/content)
- Factory function `createEmailBlock(type)` with sensible defaults
- Block labels and icons mapping

### 2. `src/components/automations/email-editor/email-blocks/EmailBlockLibrary.tsx`
- Left sidebar with draggable block buttons (click-to-add)
- Grouped: Content (Text, Image, Button), Layout (Divider, Spacer, Columns), Engagement (Social Links)
- Clean, compact design matching the app's dark theme

### 3. `src/components/automations/email-editor/email-blocks/EmailBlockCanvas.tsx`
- Renders the block list as visual, selectable, reorderable cards
- Each block shows a WYSIWYG preview (text renders formatted, image shows thumbnail, button shows styled button)
- Drag handles for reordering (using simple up/down + drag state)
- Click to select → opens properties in right panel
- Hover shows move/duplicate/delete actions
- Drop zones between blocks for drag-and-drop insertion

### 4. `src/components/automations/email-editor/email-blocks/EmailBlockProperties.tsx`
- Right panel showing editable properties for the selected block
- **Text block**: Rich textarea with variable autocomplete, font size, color, alignment
- **Image block**: URL input + upload button, alt text, width, alignment, link URL
- **Button block**: Label, URL, background color, text color, border radius, alignment, full-width toggle
- **Divider block**: Color, thickness, style (solid/dashed/dotted), margin
- **Spacer block**: Height slider
- **Social block**: Toggle icons (Facebook, Twitter, LinkedIn, Instagram), icon style, alignment
- **Columns block**: 2 or 3 column layout with nested text areas

### 5. `src/components/automations/email-editor/email-blocks/emailBlockSerializer.ts`
- `blocksToHtml(blocks)` — Converts block array to clean email-compatible HTML
- Each block type has its own HTML renderer with inline styles (email-safe)
- Handles variable interpolation (`{{first_name}}` etc.)
- Output feeds directly into existing `email-send` pipeline (no backend changes)

### 6. `src/components/automations/email-editor/email-blocks/EmailBlockEditor.tsx`
- Main orchestrator component (replaces the textarea in `AutomationEmailEditor`)
- Three-panel layout: BlockLibrary | Canvas | Properties
- Manages block state, selection, history (undo)
- Exposes `onMessageChange` by serializing blocks to HTML on every change

## Modified Files

### 7. `src/components/automations/email-editor/AutomationEmailEditor.tsx`
- When `isEmail` is true, render the new `EmailBlockEditor` instead of the plain textarea
- Keep the textarea for SMS/WhatsApp (`isEmail === false`)
- Blocks are stored as JSON in `message` field (stringified). On load, detect if message is JSON (block array) or legacy HTML string
- Backward compatibility: legacy string messages still work in preview, but editing switches to block mode
- Keep existing preview infrastructure (iframe + `buildPreviewHtml`) — just feed it the serialized HTML from blocks
- Keep template settings, presets (presets now create pre-built block arrays), insert dropdown, and variable autocomplete

### 8. `src/components/automations/email-editor/emailPreviewRenderer.ts`
- Add a `blocksToPreviewHtml()` path that takes blocks + template settings and renders the full email preview
- Reuses existing layout wrapper (header bar, logo, footer, unsubscribe)

## Key Design Decisions
- **No external dependencies** — drag-and-drop uses native HTML5 drag events (same pattern as funnel builder)
- **Backward compatible** — existing automations with plain text messages still render and can be edited
- **Same send pipeline** — blocks serialize to HTML, fed to existing `email-send` edge function unchanged
- **Variable support** — text blocks and button URLs support `{{variable}}` syntax with autocomplete
- **Responsive** — block editor collapses gracefully; properties panel slides in on mobile

