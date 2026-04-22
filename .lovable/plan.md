

## Replace native browser delete confirm with a premium-styled dialog

The "Delete Untitled workflow?" prompt in the screenshot is the browser's built-in `window.confirm()` dialog (triggered by `confirm(...)` in `DashboardWorkflows.tsx`). It's plain, system-styled, and breaks the NexusFlo24 visual language. We'll replace it with the project's existing AlertDialog primitive, styled to match the premium navy/gold dashboard aesthetic.

### What it will look like

- Centered modal with the standard rounded card, border, and shadow (matches the rest of the dashboard).
- Title: "Delete workflow?" with a small destructive icon (Trash2 in a soft red circle) to draw the eye.
- Description: "This will permanently delete **\"{workflow name}\"** and all its steps. This action can't be undone."
- Footer: a quiet "Cancel" button and a destructive "Delete workflow" button (red, with a spinner while the mutation runs).
- Closes on Cancel, Esc, or backdrop click. The Delete button is the focused/primary action and disables while deleting.

### How it works

- One reusable confirm dialog living next to the workflows grid, controlled by a `pendingDelete: Workflow | null` state.
- Clicking the dropdown's Delete item sets `pendingDelete = wf` instead of calling `confirm()`.
- The dialog reads `pendingDelete.name` for the description, calls `remove.mutateAsync(pendingDelete.id)` on confirm, shows the success toast, then clears state.
- Uses the existing shadcn `AlertDialog` components already in the project — no new dependencies.

### Files touched

- `src/pages/dashboard/DashboardWorkflows.tsx`
  - Add `pendingDelete` state and a `handleConfirmDelete` async handler with loading state.
  - Replace the inline `if (!confirm(...))` block (line 140–144) with `onClick={() => setPendingDelete(wf)}`.
  - Render an `<AlertDialog>` at the bottom of the page with the styled title, description, Cancel and destructive Delete buttons (using existing `Button` variant="destructive" and a `Loader2` spinner during deletion).
  - Add imports for `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel` from `@/components/ui/alert-dialog`.

### Out of scope

- Other places in the app that may still use `window.confirm` (only the workflows delete is requested).
- Changing the dropdown menu styling or the workflow card layout.

