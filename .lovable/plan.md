

## Plan: Complete Funnel Builder — Nesting, Image Upload, and Extended Properties

### Current State Assessment
The builder already has comprehensive property panels for all 15 block types. The main gaps are:
1. **No nesting support in the builder** — Sections and Columns can't contain child blocks (PublicBlockRenderer supports it, but the builder canvas treats everything as flat)
2. **No image upload** — Image block only accepts URLs
3. **Missing Section properties** — background position/size/repeat, overlay color, shadow intensity, 1280px max-width option
4. **Missing Columns features** — per-column background/padding/border, custom width input, mobile order
5. **Missing Embed properties** — max width, alignment, margin

### Architecture Change: Nested Block Support
This is the most significant change. Currently `StepPageBuilder` manages a flat `Block[]`. We need to support `block.children` for Section and Column blocks in the builder, not just in the public renderer.

```text
Current:  [Section, Heading, Columns2, Text, Button]  (flat)
Target:   [Section { children: [Heading, Columns2 { children: [Text, Button] }] }]  (nested)
```

### Files to Modify

**1. `blockTypes.ts`** — Add 1280px to Section defaults, add `backgroundPosition`, `backgroundSize`, `backgroundRepeat`, `overlayColor`, `shadowIntensity` to Section defaults. Add `funnel-assets` storage bucket reference for image uploads.

**2. `PropertiesPanel.tsx`** — Extend:
- **Section**: add background position/size/repeat selectors, overlay color picker, shadow intensity slider, add 1280px to max-width options
- **Columns**: add custom width input field, per-column background color, per-column padding, per-column border radius/color
- **Embed**: add max width, alignment, margin top/bottom fields
- **Image**: add file upload button (using Supabase Storage)

**3. `BlockCanvas.tsx`** — Major refactor:
- Make `renderBlockPreview` recursive — Section and Column blocks render their `children` as nested droppable zones
- Add drop zones inside Section/Column containers that accept blocks
- Support selecting nested blocks and showing breadcrumb path (e.g., "Section > Column 1 > Image")
- Nested blocks get their own toolbar (move/duplicate/delete within parent)

**4. `StepPageBuilder.tsx`** — Refactor block management:
- `addBlock` needs a `parentId` parameter to insert into a parent's children array
- `moveBlock`, `deleteBlock`, `duplicateBlock`, `updateBlockProps` must traverse the tree recursively
- `reorderBlock` must work within nested children
- Helper: `findBlockById(blocks, id)` and `updateBlockInTree(blocks, id, updater)`

**5. `PublicBlockRenderer.tsx`** — Minor: add overlay color support, background position/size/repeat for Section

**6. Database migration** — Create `funnel-assets` storage bucket for image uploads with RLS policies scoped to workspace members

### Implementation Tasks (6 tasks)

1. **Extend block defaults and Section/Embed properties** — Update `blockTypes.ts` with new props; update `PropertiesPanel.tsx` Section panel (bg position/size/repeat, overlay color, shadow intensity, 1280px); update Embed panel (max width, alignment, margin); update Columns panel (per-column bg/padding/border, custom widths)

2. **Create funnel-assets storage bucket + image upload** — DB migration for `funnel-assets` bucket with workspace-scoped RLS. Add upload button to Image block properties panel that uploads to storage and sets the URL.

3. **Refactor block tree for nesting** — Add tree traversal helpers to `StepPageBuilder.tsx`. Update `addBlock`, `moveBlock`, `deleteBlock`, `duplicateBlock`, `updateBlockProps` to operate on nested tree structure.

4. **Nested canvas rendering** — Refactor `BlockCanvas.tsx` so Section and Column blocks render their children as interactive, selectable, drag-droppable nested blocks. Add breadcrumb path display for selected nested block.

5. **Update PublicBlockRenderer** — Add overlay color, background position/size/repeat for Section. Add max-width/alignment/margin for Embed.

6. **QA pass** — Ensure block duplication preserves children, undo/redo works with nested changes, drag-drop works inside columns, no console errors.

### Storage Bucket Migration SQL
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('funnel-assets', 'funnel-assets', true);

CREATE POLICY "Workspace members can upload funnel assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'funnel-assets');

CREATE POLICY "Anyone can view funnel assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'funnel-assets');

CREATE POLICY "Workspace members can delete own funnel assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'funnel-assets' AND (auth.uid())::text = (storage.foldername(name))[1]);
```

### Risks
- Nesting adds complexity to undo/redo (history stores full tree snapshots, so it should work as-is)
- Existing saved funnels with flat blocks will continue to work — they just won't have children
- Image upload requires the storage bucket to be created first

