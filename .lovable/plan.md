# NexusFlo24 CRM Upgrade

A full CRM module built in approved phases. Contacts and Leads become separate objects, the sidebar gains a CRM group, and each phase ships fully wired (UI + database + permissions + actions) before the next begins.

## Audit of what exists today

| Capability | Status | Notes |
|---|---|---|
| Leads | Partially functional | `leads` table with score, status, pipeline_stage, tags, owner, consent fields. Single 500-line page. |
| Contacts | Missing | No contact object; `leads` doubles as contacts. |
| Companies | Missing | No table, no UI. |
| Deals / Pipelines | UI only | `pipeline_stage` is a text column on `leads` with a Kanban view. No deal records, values, probabilities or forecasting. |
| Tasks | Partially functional | `lead_tasks` exists (title, due_date, is_completed) — no priority, status enum, assignee, recurrence, reminders or task views. |
| Notes | Partially functional | Single free-text `notes` column on the lead. No note records, authors, pinning or history. |
| Files | Missing | No CRM file storage. |
| Activity timeline | Partially functional | `lead_activities` exists and is written by triggers, but is not unified across deals/tasks/notes/files and has no type/date filters or dedup guard. |
| Custom fields | Missing | No definitions, no per-record values. |
| Tags | Partially functional | Text array on leads. No colour, description, merge or tag registry. |
| Lead scoring | Partially functional | Trigger-based scoring, `lead_score_history`, decay function, plus AI scores in `ai_lead_scores`. Thresholds hardcoded; no admin config, manual adjustment or contributing-factor explanation. |
| Import | Partially functional | `CsvImportDialog` handles leads only — no record-type choice, saved mappings, error CSV, history, undo or background processing. |
| Export | Partially functional | Client-side CSV of the current lead list only. |
| Folders / Smart lists | Fully functional | `lead_folders`, `smart_lists`, routing rules — preserved as-is. |
| Workspace isolation | Fully functional | `workspace_id` + RLS helper functions on all existing CRM tables. |

Nothing above uses mock data; the gaps are missing objects rather than fake ones.

## Navigation

The sidebar item "CRM (Leads)" becomes a collapsible **CRM** group:

```text
CRM
  Contacts
  Companies
  Leads
  Deals
  Tasks
  Pipelines
  Import & Export
  CRM Settings
```

Routes are added under `/dashboard/:workspaceId/crm/*`. The existing `/leads` route stays as a redirect so bookmarks and in-app links keep working. Messaging, campaigns, automations, funnels, bookings and billing navigation are untouched.

## Phase 1 — Foundation + Contacts workspace (this phase)

**Data model.** New `contacts` table (workspace-scoped, owner, lifecycle stage, name, email, phone, WhatsApp, job title, company link, source, consent, tags, score, archived_at, created/updated). Existing leads are *not* deleted or rewritten — a backfill copies each qualified lead into a contact and stores `contacts.origin_lead_id` so history stays linked. `leads` keeps serving campaigns, automations, messaging, forms and bookings exactly as it does now; nothing that reads `leads` changes in this phase.

Also created in phase 1 because Contacts depends on them:
- `crm_saved_views` — workspace-specific saved filters with private/shared visibility and column config.
- `crm_notes`, `crm_files`, `crm_activities` — polymorphic (`record_type`, `record_id`) so later phases reuse them.
- `crm_custom_field_defs` + `crm_custom_field_values` — schema only; the admin UI arrives in phase 5.
- `crm_tags` — tag registry with colour and description; the existing text arrays keep working and are migrated into it.
- `crm_audit_log` — actor, record, before/after for every important change.

Every table gets `workspace_id`, GRANTs, RLS scoped through the existing `is_workspace_member` / `is_workspace_admin` functions, soft archive rather than hard delete, and indexes on the workspace + search + relationship columns.

**Contacts UI.**
- Table view with sortable and customisable columns, pagination, debounced search, selection checkboxes and inline editing; optional grid view.
- Advanced filters on name, email, phone, company, owner, lifecycle stage, score, tags, source, consent, created date, last activity and custom fields — savable as private or shared views.
- Bulk owner assignment, tagging, lifecycle-stage change and archive (with confirmation).
- Contact creation drawer and CSV export of the current filtered result.
- Contact profile page: left detail panel, main tabs (Overview, Activity, Emails, WhatsApp, SMS, Calls, Meetings, Tasks, Notes, Deals, Files, Campaign engagement), right panel with upcoming activities, related company/deals, AI summary and next action.
- Quick actions (email, WhatsApp, SMS, log call, schedule meeting, task, note, deal, enrol in automation) route through the existing configured providers and are disabled with a clear reason when a provider is disconnected — never a fake send.
- Loading skeletons, empty states with CTAs, error and permission-denied states, optimistic updates with rollback, unsaved-change warnings, responsive desktop/tablet/mobile.

**Automation events.** `contact.created` and `contact.updated` fire through the existing automation engine, after the database commit, deduplicated via `processed_automation_events` so retries cannot double-fire.

## Later phases (planned, built after approval of each)

2. **Companies** — `companies` table, list, profile, contact associations (one primary plus secondary), deals, engagement history, notes/tasks/files.
3. **Deals & Pipelines** — `pipelines`, `pipeline_stages`, `deals`, `deal_line_items`. Kanban with optimistic drag-and-drop and rollback, table and forecast views, won/lost reasons, weighted forecasting by owner/pipeline/period.
4. **Leads workspace & conversion** — lead inbox with table/Kanban, customisable stages (New → Attempting Contact → Connected → Qualified → Nurturing → Disqualified → Converted), assignment rules extended to round-robin/territory/industry/source/team, and a transactional convert flow with duplicate detection that creates contact + company + optional deal or fails cleanly.
5. **Tasks, Notes, Files, unified timeline** — task statuses, priority, assignee, reminders, safe recurrence, list/Kanban/calendar views; rich-text notes with pinning and edit history; Supabase Storage files under workspace-separated paths with signed access.
6. **Custom fields, tags, CRM settings, Import/Export** — admin field manager for all five objects with the full type list, tag management and merge, configurable score thresholds and rules, guided multi-record-type import wizard with duplicate handling, saved mappings, error CSV, history and undo, and background-job export with notification.

## Technical notes

- Contacts data access goes through a new `src/hooks/useContacts.ts` and `src/lib/crm/*` modules following existing hook and query-key patterns.
- New pages under `src/pages/dashboard/crm/`, components under `src/components/crm/`.
- Polymorphic `crm_activities` uses a partial unique index on `(workspace_id, source, external_event_id)` to make webhook retries idempotent.
- No service-role credentials in frontend code; privileged work stays in edge functions.
- No seed or mock data is written over production records.

## Deliverables at the end of each phase

Audit table update, list of features preserved / repaired / created, migrations with indexes and RLS, routes and files changed, automation events wired, test results, and any manual configuration left for you.
