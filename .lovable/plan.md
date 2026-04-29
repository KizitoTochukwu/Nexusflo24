## Fix truncated folder name in Folders sidebar

**Problem**: Long folder names like "Webinar – AI Sales System Masterclass" are cut off in the Leads → Folders panel because the label uses `truncate` (single-line ellipsis) inside a narrow sidebar column.

**File**: `src/components/leads/FolderPanel.tsx` (line 107 area, inside the `folders.map(...)` button)

### Changes

1. Replace the single-line `truncate` span with a wrapping label that breaks long words across up to 2 lines, so the full folder name is always readable without expanding the sidebar:
   - Swap `truncate` for `break-words leading-snug` and add `line-clamp-2` so very long names cap at 2 lines instead of pushing layout.
   - Add a native `title={f.name}` tooltip so the complete name shows on hover even if clamped.
2. Make the row align to the top (`items-start` on the inner button) so the icon/count stay aligned when the name wraps.
3. Keep the trailing meta cluster (lock icon, route icon, lead count) on its own non-shrinking flex group with `shrink-0` so it never gets pushed off or squeezed.

### Technical detail

```tsx
<button
  onClick={() => onSelectFolder(f.id)}
  className={`flex flex-1 items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${...}`}
>
  <FolderOpen className="h-4 w-4 mt-0.5 shrink-0" style={{ color: f.color || undefined }} />
  <span
    className="flex-1 text-left break-words leading-snug line-clamp-2"
    title={f.name}
  >
    {f.name}
  </span>
  <div className="flex items-center gap-1 shrink-0 mt-0.5">
    {/* lock / route / count unchanged */}
  </div>
</button>
```

No other files need changes. No data, RLS, or edge-function changes required.

### Result
- "Webinar – AI Sales System Masterclass" displays on two lines fully visible inside the sidebar.
- Lead count and rule/lock icons remain right-aligned and never clipped.
- Hovering still reveals the full name as a tooltip for any edge cases.