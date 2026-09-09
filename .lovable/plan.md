# Why today's leads only showed on Contacts

They were saved in both places. Every capture writes the Leads record first, then creates a matching Contact a fraction of a second later — I confirmed today's records exist as leads (Webinar — WhatsApp Sales source). The Leads page just hid them.

Two reasons they were hidden:

1. **Folders**: the Leads page always shows one folder at a time and auto-picks a folder on load. Today's leads were not put in any folder, so no folder view contains them — there is no "All leads" view to fall back on.
2. **Status wording**: the incoming leads were saved with the status written as "new" (lowercase), while the status filter looks for an exact "New". Anyone filtering by New would also miss them.

## Fix

- Add an **All leads** option at the top of the folder list (and the mobile folder dropdown), selected by default, so nothing is ever invisible. Folder views keep working as they do now.
- Add an **Unfiled** view that shows leads not yet in any folder, with a count badge.
- Make the status filter match regardless of capitalisation, so "new" and "New" are treated as the same status.
- Save newly captured leads with consistent capitalisation going forward, and tidy the existing mixed-case values so counts and filters agree.
- When a filter or folder is hiding results, show a short line such as "5 leads hidden by the current filter" with a one-click way to clear it, instead of a bare "No leads found".

## Technical notes

- `src/pages/dashboard/DashboardLeads.tsx`: folder state gains `"all"` and `"unfiled"` sentinels; auto-select becomes `"all"`; the folder filter in the `leads` memo skips filtering for `"all"` and inverts for `"unfiled"`.
- `src/hooks/useLeads.ts`: status filter switches from `.eq("status", value)` to a case-insensitive match (`.ilike`), plus alias handling for "new lead" vs "New".
- Capture paths (`capture-lead`, `ingest-leads`) normalise status casing on insert; a one-off data update aligns existing `new` / `new lead` values.
- Empty-state component in the leads table gains a hidden-by-filter message driven by `allLeads.length` vs `leads.length`.

No lead or contact records are deleted, and no captures are re-run.
