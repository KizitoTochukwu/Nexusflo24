# CRM: Add Contact Delete

## Current state
- CRM Contacts can be **archived** (bulk bar → Archive, restorable via "Include archived") but never deleted.
- No delete button exists on the contact profile page either.
- The standalone Leads module already has delete; this plan adds equivalent capability to CRM Contacts.

## What we'll build

1. **Delete mutation** (`src/hooks/useContacts.ts`)
   - `useDeleteContacts()` — deletes one or more contacts by ID, scoped to the workspace.
   - Cascade-check related records (notes, tasks, deals links, activities) rely on existing FK cascade/null behavior; log a `contact_deleted` audit entry per contact before removal.
   - Invalidate contacts/stats queries; success + error toasts.

2. **Single-contact delete** on the contact profile page (`ContactProfile.tsx`)
   - Red "Delete contact" button in a danger zone / overflow menu.
   - Confirmation dialog (AlertDialog) explaining the deletion is permanent, unlike archive.
   - On success, navigate back to the contacts list.

3. **Bulk delete** in the contacts list (`ContactBulkBar.tsx` + `DashboardContacts.tsx`)
   - "Delete" button next to Archive, manager-only, with confirmation dialog showing the selected count.
   - Clears selection on success.

## Safety
- Delete is permanent; the dialog copy distinguishes it from Archive ("Archive keeps full history and can be restored; Delete removes the contact permanently").
- Manager permission gate matches the existing Archive gating (`canManage`).

## Verification
- Build passes; browser smoke test: delete a test contact from profile and via bulk bar, confirm it disappears from the list (including "Include archived" view).
