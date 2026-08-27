# Platform Admin: Phases 3 & 4 — Operations, Content & Governance

Completes the Platform Admin programme by replacing the nine "Not configured yet" placeholder pages (`PlatformDeferred.tsx`) with real, data-backed screens. Every page uses the existing patterns: security-definer RPCs for platform-wide reads, the `platform-admin-action` edge function for audited mutations, permission-gated nav items, and honest empty/"Not tracked" states — no invented numbers.

## Phase 3 — Operations

### 1. Communications (`/platform-admin/communications`)
- New RPC `platform_communications_metrics(_since)`: cross-workspace delivery stats aggregated from `email_send_log`, `sms_logs`, `whatsapp_messages` (sent/delivered/failed/bounced rates by channel and day), plus `communication_usage` totals.
- Sender approval queue: platform-wide read of `sender_profiles` / `whatsapp_senders` / `sms_senders` with pending status; approve/reject/suspend goes through `platform-admin-action` (permission `platform.communications.manage`) with reason + audit.
- Provider/sender health table: per-workspace connected senders and their status, flagging workspaces with no verified sender.
- Replaces the existing "Available today" links to workspace-scoped Communication Control; those screens stay live but are no longer the entry point.

### 2. Automations (`/platform-admin/automations`)
- New RPC `platform_automation_health(_since)`: failed `workflow_runs` / `automation_logs`, stuck `workflow_enrollments` (no progress beyond threshold), scheduled job lag from `scheduled_jobs`, DLQ depth.
- Failed-run queue table with per-row **Retry** action — routed through `platform-admin-action` (`platform.automations.retry`), which invokes the existing execution path idempotently (respecting `processed_automation_events` dedupe) and audits the attempt.
- Dead-letter listing with one-by-one requeue; nothing is bulk-reprocessed without an explicit typed confirmation.

### 3. Integrations (`/platform-admin/integrations`)
- New RPC `platform_integration_health()`: connection status matrix across `ad_connections`, `whatsapp_accounts`, `google_calendar_tokens`, `seller_payment_accounts` (Stripe Connect), `meta_settings` — flagging expired/refresh-failed tokens and never-connected workspaces.
- Per-provider summary cards (connected / error / expiring soon).
- Read-only here; reconnection remains a workspace-owner action, with a "copy reminder text" helper rather than pretending platform staff can fix tokens.

### 4. Store Fulfilment (`/platform-admin/fulfilment`)
- Migrate the existing `AdminStoreOrders` / `AdminStoreCatalogue` capabilities into the platform-admin layout: orders list, `store_projects` delivery pipeline, and the orders-missing-projects reconciliation view (read model over `store_orders` ⨝ `store_projects`).
- Idempotent "create missing project" action per order via `platform-admin-action` (keyed on order ID) — single-order only, each audited; no bulk backfill.
- Catalogue management links through to the existing catalogue editor (relocated route, same component).

## Phase 4 — Content & Governance

### 5. Blog & Pages (`/platform-admin/content`)
- Migrate `AdminBlogManager` under the platform-admin layout (permission `platform.content.manage`): post list with status, search, editor, publish/unpublish — plus a scheduled-publishing queue view over `blog_posts.scheduled_for`-style fields where present.
- Content audit entries written to `platform_audit_logs` on publish/unpublish/delete.

### 6. Academy & Community (`/platform-admin/academy`)
- Academy: read/edit surface for the platform course catalogue with a truthful note that courses are file-defined, linking to the source structure rather than a fake editor; lesson counts and publish state surfaced where data exists.
- Community moderation queue: cross-store read of `shop_community_posts` / `shop_community_comments` flagged or reported, with remove/restore actions via `platform-admin-action` (`platform.community.moderate`), audited.

### 7. Security (`/platform-admin/security`)
- Access review panel: all active `platform_staff_assignments` with last-sign-in and a per-assignment "mark reviewed" record (new `platform_access_reviews` table: reviewer, subject, outcome, note, created_at — append-only, super_admin only).
- Sign-in/security signals surfaced only where the data exists (auth audit where accessible); otherwise an explicit "Not tracked" state — no fabricated metrics.
- Policy/RLS notes section rendered from a checked-in summary document, clearly labelled as documentation, not live scanning.

### 8. Platform Health (`/platform-admin/health`)
- Background job status from `scheduled_jobs` (last run, next run, failures) and `email_send_state` queue depth — real data that exists today.
- Edge function and DB performance sections show "Not tracked" until telemetry exists; no uptime numbers are invented.

### 9. Settings (`/platform-admin/settings`)
- New `platform_settings` table (key/value JSONB, super_admin write via audited action, all staff read): maintenance-mode banner text + on/off, default trial length, feature-flag map per plan code.
- Maintenance banner consumed by the workspace `DashboardLayout` when enabled (read-only for non-staff, public SELECT policy on a non-secret view of the flag only).

## Cross-cutting

- Nav: permission keys added for the new sections; items hidden when the staff member lacks the permission (existing `can()` filter already does this).
- All mutations go through `platform-admin-action` with typed reasons, confirmation dialogs (`HighRiskActionDialog`), no optimistic UI, and audit writes.
- Old `/dashboard/:workspaceId/admin/*` routes redirect to the migrated platform-admin equivalents.
- New tables follow the standard: PK/FKs, timestamps + updated_at trigger, indexes, explicit GRANTs, RLS keyed on `has_platform_permission`, service_role grant for edge-function access.
- Verification: build clean, `rg` shows no remaining `PlatformDeferred` imports, linter warnings stay at the reviewed baseline, and a browser smoke test signs in as staff and walks each new page checking real data renders.

## Technical notes

- New RPCs are `SECURITY DEFINER` with `SET search_path = public`, explicit `REVOKE ... FROM PUBLIC, anon` / `GRANT TO authenticated`, and internal `is_platform_staff` / `has_platform_permission` checks.
- Reads are paginated/aggregated server-side; no bulk table downloads to the browser.
- Everything is additive: no drops, renames, or weakened policies.
