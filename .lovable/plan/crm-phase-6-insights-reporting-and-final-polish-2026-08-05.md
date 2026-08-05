# CRM Phase 6 — Insights, Reporting and Final Polish

Phases 1-5 covered Contacts, Companies, Deals & Pipelines, Tasks/Conversion/Import-Export, and CRM Settings. One phase of work remains to close out the module.

## What is still missing

- The existing Analytics page does not read any CRM data (no deals, tasks or contacts metrics anywhere).
- Saved views exist for Contacts only; Companies and Deals have no equivalent.
- The audit log table is written to but has no viewer.
- Deal and task activity is not summarised anywhere for managers.

## Phase 6 scope

**1. CRM Insights page** (`/crm/insights`, new sidebar entry under CRM)
- Headline cards: open pipeline value, weighted forecast, won this month, average deal size, average days to close.
- Pipeline funnel: deal count and value per stage, with conversion rate stage-to-stage.
- Win/loss breakdown over a selectable date range (30/90/365 days), including top loss reasons.
- Contact growth: new contacts per week, split by source and lifecycle stage.
- Task health: overdue, due today, completed this week, per owner.
- Activity leaderboard: notes, calls, emails, meetings logged per team member.
- Every card respects the selected date range and the current workspace.

**2. Saved views for Companies and Deals**
- Reuse the existing saved-views mechanism so filters on the Companies list and Deals board can be named, saved, reapplied and deleted, exactly like Contacts.

**3. Record audit trail**
- A read-only "Audit" tab on contact, company and deal records showing who changed which field, from what to what, and when.

**4. Polish pass**
- Consistent empty, loading and error states across all CRM pages.
- Export the current filtered view to CSV from Contacts, Companies, Deals and Tasks.
- Keyboard-friendly navigation on the Contacts table and Deals board.

## Technical notes

- Insights are computed with aggregate queries against `crm_deals`, `crm_pipeline_stages`, `crm_tasks`, `crm_activities` and `contacts`, all scoped by `workspace_id` under existing RLS. No new tables are required.
- Charts use the chart components already present in the design system, styled with the navy/gold tokens.
- Saved views reuse `crm_saved_views` by extending its record-type scope rather than adding a table.
- The audit tab reads `crm_audit_log`, which is already being written by CRM mutations.
- New files: an insights page plus small chart card components, a shared CSV-export helper, and an audit-trail panel reused by the three record types.

## Out of scope

- Cross-workspace or agency-level roll-up reporting.
- Scheduled report emails.
