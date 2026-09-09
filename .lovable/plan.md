# Fix: leads missing from the CRM leads list

## What I found (verified against the live data)

The leads are not lost — the list is hiding them because their status labels don't match.

In this workspace there are **670 leads**, stored under five different status labels:

| Status stored | Leads |
| --- | --- |
| `new lead` | 604 |
| `New` | 49 |
| `Warm` | 13 |
| `Hot` | 3 |
| `new` | 1 |

The status box at the top of the Leads page only offers `New`, `Warm`, `Hot`, `Won`, `Lost`, and it matches the wording exactly. So when "New" is chosen, the 605 leads saved as `new lead` / `new` vanish.

That explains both screenshots:
- "Facebook Lead Ads" folder says 15 but the table lists 10 — the other 5 are saved as `new lead` (1) and `Warm` (4).
- "Webinar – AI Sales System Masterclass" says 1 but shows "No leads found" — its single lead is `Warm`.

Folder counts themselves are correct: every folder join points at a lead that still exists.

## The fix

1. **Tidy the stored statuses.** Update the leads whose status is `new lead` or `new` to `New`, so every lead uses one of the five standard labels. This changes only the label; no lead is deleted or moved.
2. **Make the status filter forgiving.** Match statuses case-insensitively and treat `new lead` as `New`, so any leads that arrive later with odd wording still show up.
3. **Make the folder count and the table agree.** When a folder's count is higher than the number of rows on screen, show a small line under the title: "5 leads in this folder are hidden by your current filters — Clear filters", with a one-click reset.
4. **Remove the silent row cap.** The list currently fetches without an explicit limit, which tops out at 1,000 rows; this workspace is at 670. Raise the fetch limit and load in pages so growth doesn't start hiding leads again.

## Technical notes

- Data change through the run-SQL tool: `UPDATE leads SET status = 'New' WHERE lower(status) IN ('new lead','new')`. No schema migration needed.
- `src/hooks/useLeads.ts`: replace the exact `.eq("status", ...)` with a case-insensitive/alias-aware match, and add an explicit range so more than 1,000 leads can load.
- `src/pages/dashboard/DashboardLeads.tsx`: add the "hidden by filters" hint plus a Clear filters action; also normalise the status shown in the table badge.
- Lead ingestion (`supabase/functions/ingest-leads`) will be checked so newly captured leads are written with the standard `New` label.
