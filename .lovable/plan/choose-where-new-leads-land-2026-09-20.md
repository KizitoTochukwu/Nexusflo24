# Choose where new leads land

Today a new lead only reaches a folder if a form or funnel was configured with one, or a routing rule matches. Everything else ends up in "Uncategorized", which is why leads look like they just sit under "All leads". Leads arriving through your website/webhook intake are never filed at all.

## What you'll get

1. **A default folder for the workspace.** In the Leads folder list you can mark any folder as the default. Every new lead with no other destination lands there instead of "Uncategorized".
2. **Create a folder on the spot.** Anywhere a folder is chosen (Add Lead, form settings, funnel step settings, the folder list), you can type a new folder name and it's created and used immediately.
3. **Add Lead** pre-selects the default folder, and lets you pick or create another.
4. **Website/webhook leads get filed too.** Leads coming in through the CRM webhook are routed by the same rules: folder named in the payload → matching routing rule → workspace default → Uncategorized.
5. **CSV import** keeps its folder picker and also falls back to the default folder.

## Consistent filing order (used everywhere)

```text
1. Folder explicitly chosen on the form / funnel / dialog / payload
2. Matching folder routing rule
3. Workspace default folder
4. Uncategorized (last resort)
```

Existing leads are not moved; this applies to leads arriving from now on.

## Technical detail

- Migration: add `is_default boolean not null default false` to `lead_folders`, plus a partial unique index on `(workspace_id) where is_default` so only one default per workspace. Additive, no data loss.
- Extract the folder-routing block from `supabase/functions/capture-lead/index.ts` into `supabase/functions/_shared/leadFolders.ts` (`routeLeadToFolders`), covering: explicit folder name/id (auto-create), active `lead_routing_rules`, default folder, Uncategorized fallback, `fireFolderAutomations` for each assignment, dedupe against existing `lead_folder_leads` rows.
- `capture-lead` calls the shared helper (same behaviour plus the default-folder step).
- `ingest-leads` calls the same helper after lead create/update, accepting `folder_id` / `folder_name` (or `lead_destination.folder_name`) from the payload; document the new field in `docs/afarhome-webhook.md`.
- `useLeadFolders.ts`: add `useSetDefaultFolder` (clears the previous default, sets the new one) and expose `is_default` on `LeadFolder`.
- `FolderPanel.tsx`: "Default" badge and a "Set as default folder" item in the folder menu.
- `AddLeadDialog.tsx`: default the `folder_id` field to the workspace default folder; add an inline "Create new folder…" option that calls `useCreateFolder` and selects the result.
- `CsvImportDialog.tsx`: same default fallback when no folder is chosen.
- No changes to lead dedupe, scoring, automations or pipelines beyond the extra folder assignment.
