# NexusFlo24 AI Client Finder

Find the right companies. Reach the right decision-makers. Start more qualified sales conversations.

A B2B prospecting and outbound module built **inside** NexusFlo24 — reusing the existing auth, workspaces, CRM, bookings, automations, email infrastructure, Nexus AI, billing and Platform Admin. No second CRM, no second billing system, no second login.

## What the inspection found

- **Routing**: public pages at `/…`, workspace app at `/dashboard/:workspaceId/…` behind `WorkspaceGuard`, platform staff at `/platform-admin/…`. Sidebar items live in `DashboardLayout.tsx`.
- **CRM already complete**: contacts, companies, deals, pipelines/stages, tasks, notes, timeline, tags, custom fields, dedupe, canonical `crm_upsert_contact` — all reusable.
- **Email sending exists**: `email-send` edge function (Resend + SendGrid, workspace or platform credentials), `email_logs`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens`, open/click tracking. **No Gmail/Outlook OAuth mailbox connection exists** — only Google *Calendar* tokens.
- **Jobs**: `scheduled_jobs` + `process-scheduled-jobs` (pg_cron driven) is the established background architecture.
- **Billing/entitlements**: Stripe subscriptions + `src/lib/billing/planLimits.ts` + `usePlanGating`; credits in `message_credits`.
- **Bookings, automations, Nexus AI (`nexus-ai`, gpt-5.6-sol), Platform Admin (audited `platform-admin-action`, permission keys, staff RPCs)** all exist and will be extended, not duplicated.
- **No prospecting functionality exists.** The `nexusintel_*` tables are orphaned (no code references them at all); they will be left untouched, not repurposed.
- **No prospect-data provider is configured.** The module must therefore ship truthful "provider not configured" states plus a real CSV import path.

## Delivery in four phases

Each phase is shippable and leaves nothing decorative behind.

### Phase 1 — Foundation, offers, ICPs, prospects (this build)
- Migration: `prospecting_offers`, `ideal_customer_profiles` (+ `icp_versions`), `prospect_lists`, `prospect_companies`, `prospect_contacts`, `prospect_sources`, `prospect_research_findings`, `email_verifications`, `prospecting_provider_connections`, `prospecting_usage_events`, `prospecting_audit_events`, `prospecting_jobs`. Workspace-scoped RLS + GRANTs, archive flags, indexes on workspace/status/domain/email.
- Routes `/dashboard/:id/client-finder/{overview,offers,icps,search,prospects,settings}` + sidebar entry **AI Client Finder**.
- Onboarding wizard steps 1–2 (offer + ICP) with saved progress.
- Edge functions: `client-finder-analyse-website` (SSRF-guarded fetch: HTTPS only, DNS-resolved public IPs, robots respected, page list shown), `client-finder-ai` (offer analysis, ICP suggestion, fit explanation) via Lovable AI Gateway with per-operation usage logging.
- Provider adapter layer (`_shared/prospect-providers/`) with a company-discovery, contact-discovery, enrichment and verification interface. Ships with the **CSV import provider** live and external vendors pluggable; unconfigured providers render a truthful not-configured state, never fake rows.
- Prospect table with explained fit score (criteria breakdown, no magic number), sources, freshness, CRM-status column, save/reject/exclude/report actions.
- Public marketing page `/ai-client-finder`.

### Phase 2 — Approval, research, campaigns, sending
- Saved-prospect approval queue (single + bulk), suppression and duplicate checks.
- Research grounding: `prospect_research_findings` with source URL/title/retrieved-at/confidence; email copy may only cite stored findings, honest fallback copy when evidence is thin, evidence inspector per sentence.
- Campaign builder + multi-step sequence builder, per-prospect preview, test send, launch-readiness checklist, human approval required before launch.
- Sending engine on `scheduled_jobs`: idempotency key per send attempt, workspace/mailbox/plan/campaign limits, sending windows and prospect time zones, randomised spacing, exponential backoff for transient failures only, truthful statuses (`sent` ≠ `delivered`), auto-pause on high bounce/auth failure/quota exhaustion.
- Compliance: workspace sender identity, unsubscribe wired to existing `unsubscribe` + `suppressed_emails`, do-not-contact, complaint and retention controls, audit trail.

### Phase 3 — Mailboxes, inbox, reply intelligence, CRM/booking/automation wiring
- `connected_sending_accounts` + **Google/Microsoft OAuth mailbox connection** (new edge functions, server-side token storage) with health, limits, reconnect, and safe campaign pausing on disconnect. Until a workspace connects a mailbox, sending falls back to the existing verified Resend/SendGrid sender, shown explicitly.
- Reply sync + AI classification (11 classes) with user correction stored for auditing; AI-drafted replies always require approval.
- CRM writeback: company/contact on approval, lead on first send, deal on positive reply/booking; timeline events; configurable pipeline/stage; dedupe against existing records.
- Booking CTA from existing booking pages; booking stops the sequence, updates lead/deal, attributes the meeting once.
- New automation triggers and reuse of existing actions, with loop and duplicate-enrolment protection.

### Phase 4 — Reports, entitlements, admin, tests
- Overview dashboard and report suite from real rows, each metric with a defined source, date range, drill-down and calculation tooltip.
- Server-enforced entitlements added to the existing plan-limits model (campaigns, searches, discoveries, verifications, AI research ops, emails, mailboxes, exports) + Platform Admin configuration, no code change to adjust.
- Platform Admin → AI Client Finder: feature enablement, provider config status, aggregate health, queue health, bounce/complaint indicators, workspace/campaign suspension, audited access.
- Test suite: vitest for scoring, dedupe, suppression, idempotency, merge-variable resolution, CSV sanitisation; browser end-to-end passes for the full workflow; cross-workspace RLS probes.

## Technical notes

- All migrations additive; no existing table or column is dropped, renamed or repurposed. Orphaned `nexusintel_*` tables are left as-is.
- Every new public table gets GRANTs, RLS keyed on `is_workspace_member(auth.uid(), workspace_id)`, and read-only/staff variants where needed.
- Secrets (provider keys, OAuth tokens, app secrets) stay server-side; no key ever reaches the client bundle or a URL.
- Website analysis and any provider fetch run inside an allowlist guard blocking private, loopback, link-local, metadata and reserved ranges, with redirect re-validation.
- AI runs server-side through the existing Lovable AI Gateway path used by `nexus-ai`, one stored usage row per operation (workspace, user, op, record, model, prompt version, status, tokens, error class).
- Design system reused as-is: navy `#0B1F3A`, gold accent, existing cards/tables/dialogs/toasts; no new palette or font.

## External configuration still required (will be reported honestly, not claimed as done)

- A prospect-data provider account (company/contact discovery, enrichment, verification) — until then CSV import is the working path.
- Google Cloud / Microsoft Entra OAuth app credentials for mailbox connection in Phase 3.
