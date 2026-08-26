# CRM Customer Journey — Phase 8: Messaging, Commerce, Permissions, Verification

Phases 1–7 are complete (canonical contacts, backfill, acquisition wiring, deals/pipelines/tasks, automation eligibility, metric layer, journey surfaces). This is the final phase of the approved 8-phase plan.

## Messaging → contact resolution

- Resolve SMS/WhatsApp conversations to canonical contacts by normalised phone (E.164), same normalisation helpers used in `crm_upsert_contact`.
- Unmatched conversations queue: list, preview, manual "Link to contact" action; match recorded for future auto-linking.
- Rendering hardening: SMS/WhatsApp bodies rendered as plain text (never raw HTML).
- Template display: correct approved template name, category, language and provider status; test/hello_world templates blocked from production marketing sends.

## Commerce fulfilment

- Paid-order path (shop webhook, verified server-side): upsert canonical contact, link purchase + entitlement, set lifecycle to `customer` with explainable conversion source.
- Manual conversions labelled "Manual" with a stored reason; unpaid/refunded orders excluded from revenue metrics.
- Storefront setup warnings surfaced in Commerce dashboard: default slug, missing Stripe Connect, no live products.

## Permissions & RLS

- Verify/add RLS on all Phase 1–7 tables scoped to workspace membership; role checks enforced server-side.
- Owner/admin vs member privileges enforced for pipeline management, scoring config, merges and exports (server-side via `has_role`-style checks, never client-side).

## Tests & verification

- Vitest coverage: phone/email normalisation, contact matching order, dedupe rules, scoring thresholds, metric definitions, automation eligibility rules.
- Scripted end-to-end verification in an isolated test workspace (clearly marked test records, cleaned up afterwards), with reconciliation that each canonical metric agrees across modules.

## Completion report

After this phase: root causes, migrations applied, backfill results, RLS changes, files touched, tests run, and any remaining external configuration.

## Technical notes

- Build on existing `crm_upsert_contact`, `crm_metric_snapshot`, `useCrmMetrics`, and the conversation/messaging tables already in place — no parallel systems.
- All migrations additive; GRANTs + RLS in the same migration per project rules.
- No destructive merges; duplicate handling stays review-only as in Phase 7.
