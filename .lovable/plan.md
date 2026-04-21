

## Goal
Remove the "All Leads" entry and make the Leads page folder-first, so leads are always grouped and viewed by folder.

## The trade-off (important)
"All Leads" is currently the only way to see leads that aren't assigned to any folder. If we hide it, any **unfiled** lead becomes invisible. Two ways to solve this:

1. **Auto-file everything** — guarantee every lead lives in a folder, so nothing gets orphaned. New leads from CSV/forms/API land in either the user-chosen folder, the matching auto-route folder, or a default "Uncategorized" folder.
2. **Keep an "Unfiled" view** — replace "All Leads" with a smaller "Unfiled" entry that shows only leads with no folder. Less clean, but no migration needed.

Recommended: **Option 1 (auto-file everything)** — matches the mental model you described.

## Changes

### 1. Backfill existing leads
- Create an "Uncategorized" folder per workspace (only if needed).
- Move every existing lead that isn't in any folder into "Uncategorized".
- Result: zero orphaned leads after migration.

### 2. Auto-file new leads going forward
- **CSV import** (`CsvImportDialog.tsx`): if user doesn't pick a folder, fall back to "Uncategorized" instead of leaving leads unfiled.
- **Capture pipeline** (`capture-lead` edge function + `useCaptureLead`): after insert, if no auto-route rule matched, assign the lead to "Uncategorized".
- **Manual Add Lead** (`AddLeadDialog`): folder picker becomes required (defaults to "Uncategorized" or the currently active folder).
- **Auto-route rules** continue to work first — "Uncategorized" is only the fallback.

### 3. UI changes — `FolderPanel.tsx` + `DashboardLeads.tsx`
- Remove the "All Leads" button at the top of the folder list.
- On page load, default `activeFolderId` to the first folder (or "Uncategorized" if it's the only one).
- The mobile folder dropdown loses its "All Leads" option too.
- The page title always shows the active folder name; the "Nasio Contacts (653)" header style stays.
- "Uncategorized" is protected: cannot be renamed or deleted from the dropdown menu.

### 4. Delete-all behavior
- "Delete all leads" in the page header now means "delete all leads in the current folder" (since there's no global view anymore). Copy updated to reflect that.

## Out of scope
- No changes to lead schema, RLS, scoring, or messaging.
- Smart Lists panel stays as-is (filters apply within the active folder).
- Pipeline view continues to render the active folder's leads.

## Files touched
- `supabase/migrations/` — new migration: create Uncategorized folders + backfill orphaned leads.
- `src/components/leads/FolderPanel.tsx` — remove All Leads row, protect Uncategorized.
- `src/pages/dashboard/DashboardLeads.tsx` — default to first folder, drop "All Leads" mobile option, update delete-all copy.
- `src/components/leads/CsvImportDialog.tsx` — fallback to Uncategorized when no folder chosen.
- `src/components/leads/AddLeadDialog.tsx` — folder required, default to active/Uncategorized.
- `supabase/functions/capture-lead/index.ts` — assign Uncategorized when no routing rule matches.

