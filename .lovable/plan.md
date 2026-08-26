# CRM Customer Journey: Repair and Completion

## What the inspection found

Live inspection of the main workspace (Kizito Tochukwu's Workspace) shows the real cause of the contradictory totals:

| Store | Rows |
|---|---|
| Leads | 662 (647 from one CSV/contact import source) |
| CRM Contacts | 6 |
| Form submissions | 24 |
| Bookings | 10 |
| Deals | 0 |
| Tasks | 0 |
| Automation enrolments | 0 |
| Pipelines | 3 (Sales Pipeline with 6 stages, plus two "New pipeline" rows with 0 stages) |

Root causes confirmed by reading code and data:

1. **Two parallel person tables.** `capture-lead` (and every other acquisition path) writes only to `leads`. Nothing upserts a `contacts` row. So Leads says 662, CRM Contacts says 6, and Analytics/Dashboard disagree depending on which table each query reads.
2. **Contact actions are gated on `origin_lead_id`.** `ContactQuickActions` disables Task, Enrol and messaging when a contact has no linked lead — which is most of them, because the link is never created.
3. **Deals are blocked by empty pipelines.** The workspace has two stage-less "New pipeline" records; the Deals page only enables New Deal / Pipeline Settings against `activePipelineId`, and a selected empty pipeline yields no stage to place a deal in. Nothing labels these pipelines as incomplete.
4. **Metrics are computed per-component.** Dashboard, Analytics, Forms, Bookings and CRM each run their own counting query, with different date fields and dedupe rules, so no two agree.
5. **Bookings and form submissions are never reconciled to contacts**, so Recent Activity and drill-downs come up empty even when totals are non-zero.

## Approach

Additive only. No table is dropped, renamed or truncated; no legacy lead is deleted. `leads` stays the acquisition/enquiry record, `contacts` becomes the canonical person, and every legacy lead is *linked* to a contact rather than replaced.

## Phase 1 — Canonical contact identity

- Add to `contacts`: `lifecycle_stage`, `temperature`, `score_updated_at`, consent columns per channel, first/last-touch attribution columns, `external_source_id`, `merged_into_id`, `conversion_source`, `conversion_reason`.
- Add `contact_identities` (workspace, contact, type email/phone/external, normalised value, unique per workspace) and `contact_merge_log`.
- Add `crm_upsert_contact(...)` security-definer function: match on external id → normalised email → E.164 phone; create otherwise; never cross workspace; flag ambiguity instead of silent merge.
- Add `contact_source_map` (source table, source id, contact id, method, confidence, migration version) for traceability.

## Phase 2 — Backfill and reconciliation

Staged, idempotent, batched migration:
- Inventory counts per workspace and source table into `crm_reconciliation_runs`.
- Map and link all 662 legacy leads, 24 form submissions, 10 bookings, commerce customers and message identities to canonical contacts.
- Backfill `leads.contact_id`, booking→contact, submission→contact, conversation→contact, order→contact links and derivable timeline events.
- Write a reconciliation report row (linked, created, updated, ambiguous, unresolved, before/after counts). No deletions.

## Phase 3 — Acquisition paths

Route `capture-lead`, `ingest-leads`, form submission handling, funnel submits, ROI calculator, chatbot, booking, inbound SMS/WhatsApp and commerce webhooks through the same upsert service, each recording: acquisition event, attribution (source/channel/campaign/utm/ad ids/landing page/referrer), consent per channel, timeline event, score update, then automation eligibility. Idempotency keys so retried webhooks create nothing twice.

## Phase 4 — Deals, pipelines, tasks

- Mark pipelines with zero stages as **Incomplete**: badge, "Finish setup", archive action, excluded from deal creation; the valid Sales Pipeline is auto-selected.
- New Deal enabled whenever a usable pipeline exists; clear setup message otherwise. Deal creation from contact, lead, company, booking and qualification automation.
- Add `crm_deal_stage_history` (entered/exited, actor, manual vs automated), required loss reason, time-in-stage, stale detection, weighted forecast from stage probability.
- Un-gate Task creation on contacts (no `origin_lead_id` requirement), add reminder/completion fields, My Tasks / Due Today / Upcoming / Overdue / Completed views, automation-origin fields with dedupe, and a "Next action" indicator on contacts and deals.

## Phase 5 — Automation enrolment and health

- Enrolment modal driven by the contact (not the lead) showing eligible workflows, ineligible ones with the specific reason, active enrolments, re-entry policy, consent requirements and first actions. Nothing sends on open.
- Automation Health view detecting duplicate triggers, overlapping enrolment, duplicate names/drafts, missing exit conditions/consent/templates, invalid delays, recursion, references to deleted forms/pipelines/stages. Findings are surfaced, never auto-disabled.
- Fix reporting so Exited/Skipped/Failed render real values (zero instead of blank) with drill-downs to the enrolment records.

## Phase 6 — Metric definition layer

One set of SQL views/RPCs (`crm_metric_*`) used by Dashboard, CRM, Analytics, Forms, Bookings, Automations and Commerce: total/new contacts, unique/new leads, MQL, SQL, sales-ready, open/won/lost deals, submissions, unique form contacts, bookings, enrolments, customers, orders, revenue, open/click/conversion rate. Each documented with source, date field, dedupe and filters. Components stop counting on their own. Bookings metrics adopt the documented definitions (show rate = completed / (completed + no-show)) across Overview, Calendar, Analytics and profiles, and Recent Activity is fed from booking events.

## Phase 7 — Journey surfaces

- **Customer Journey** page under CRM: funnel from acquisition event → paid customer with counts, stage conversion, average time to next stage, drop-off, trend, filters and record-level drill-downs.
- **Customer Journey Health**: unprocessed events, unlinked submissions/bookings, unmatched conversations, duplicate contacts, SQL contacts without deals, deals without next action, failed executions, paid orders without contact linkage.
- **Duplicate Review**: suspected pairs, match reason, confidence, conflicting fields, safe merge (transfers leads, deals, tasks, notes, messages, bookings, submissions, enrolments, purchases, tags, files, timeline, attribution) and "not a duplicate", both audited.
- Contact profile Overview strip: lifecycle, explainable score, temperature, owner, attribution, open deal and stage, next task, active enrolments, latest booking, customer/revenue status.

## Phase 8 — Messaging, commerce, permissions, verification

- Conversations resolved to contacts by normalised number, with an Unmatched queue and manual link; SMS/WhatsApp rendered as plain text (never raw HTML); correct approved template name, category, language, provider status shown; test templates blocked for production marketing.
- Commerce: paid order verified server-side upserts the contact, creates the purchase and entitlement links, sets lifecycle Customer with an explainable conversion source; manual conversions labelled Manual with a stored reason; unpaid/refunded excluded from revenue. Storefront setup warnings for default slug, missing Stripe, no live product.
- RLS on every new table scoped to workspace membership, with role checks server-side; owner/admin vs member privileges enforced for pipelines, scoring, merges and exports.
- Tests: Vitest coverage for normalisation, matching, dedupe, scoring thresholds, metric definitions and eligibility rules, plus scripted end-to-end verification in an isolated test workspace with clearly marked test records, cleaned up afterwards with evidence retained.

## Delivery order

Phases 1–2 land first (identity + backfill, no UI change), then 3–4, then 5–6, then 7–8. Each phase ends with build, typecheck and a reconciliation check that the same metric agrees across modules. A completion report follows the final phase covering root causes, migrations, backfill results, RLS changes, files touched, tests run and remaining external configuration.
