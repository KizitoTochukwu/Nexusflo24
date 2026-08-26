# Platform Admin: foundation, core operations and verified repairs

This delivers Phase 1 and Phase 2 in full, plus the Phase 5 repairs whose root causes I confirmed against the live database. Phases 3 and 4 are scoped at the end and will be built next — their nav entries will show honest "Not configured yet" states rather than fake pages.

## What I verified before planning

Confirmed by reading the code and querying the database:

- Admin today lives only under `/dashboard/:workspaceId/admin/*` (12 routes in `App.tsx`), guarded by `AdminGuard` → `user_roles.role = 'admin'`. There is one single boolean-style role and one admin user.
- `/admin` is not a registered route, so it 404s.
- The database really holds 12 users, 12 workspaces, 24 blog posts, 2 store orders, 0 store projects, and only **1** subscription row. So "everyone is Free / inactive / 0 active subscriptions" is largely truthful data, not a display bug — but the panel also conflates *account status* with *subscription status*, which is a real defect.
- **Communication Control's zero organisations is an RLS gap**: `workspaces` has only a `Members can view their workspaces` SELECT policy. `useAllOrganisations()` selects all workspaces, so a platform admin sees only their own. No admin read policy exists.
- **Onboarding fetch failure root cause found**: `useOnboarding` queries `public.user_onboarding`, and that table **does not exist** (`to_regclass` returns null). Every read/write 404s.
- **Duplicate Meta Pixel**: `index.html` hard-codes `fbq('init','4520045111651647')`, and `workspacePixels.ts` independently inits whatever pixel a workspace configured. If a workspace saved that same ID, it initialises twice; the guard array is only partially shared.
- **Blog Manager**: the query and admin RLS policy are both fine (an ALL policy on `has_role`). The stuck "Loading…" is not yet root-caused — the component renders on `isLoading` alone with no error or empty branch, so a failing/never-settling query shows a permanent spinner. Diagnosing this is the first step of that work item, not an assumption.
- Store orders exist with zero `store_projects` — fulfilment creation is not firing on paid orders.

## Phase 1 — Platform Admin foundation

**Routing.** New top-level `/platform-admin/*` tree, lazy-loaded, outside the workspace layout so it never depends on a workspace ID. Every existing `/dashboard/:workspaceId/admin/...` URL stays alive as a redirect to its new home, so bookmarks and sidebar links keep working.

**Roles and permissions.** Replace the single `admin` flag as the *authorisation* mechanism while keeping it working:

- `platform_roles` (super_admin, operations, billing, support, content, compliance, technical, analyst)
- `platform_permissions` — granular keys (`platform.users.suspend`, `platform.billing.modify`, …)
- `platform_role_permissions`, `platform_staff_assignments`
- Security-definer functions `has_platform_permission(uid, key)` and `is_platform_staff(uid)`
- Backfill: the existing `user_roles.role='admin'` holder becomes `super_admin`. `has_role(uid,'admin')` keeps working, so no existing policy breaks.
- Guards: last active super_admin cannot be removed; nobody can grant themselves a role; workspace admin/owner grants nothing at platform level.

**Audit.** `platform_audit_logs`, append-only (no UPDATE/DELETE policies), with actor, action, entity, workspace, before/after summary, reason, result, correlation ID. Written server-side by every consequential mutation.

**High-risk action wrapper.** A shared confirm dialog + server-side edge function pattern requiring permission check, typed reason, no optimistic UI, and an audit write. Used by suspend, role change, credit adjustment, plan change, refunds, support mode.

**Layout.** `PlatformAdminLayout` in existing navy/gold design tokens: collapsible sidebar with the grouped nav (Overview / Customers / Revenue / Operations / Content / Governance), mobile drawer, breadcrumbs, global search, staff badge and "Return to workspace". Grouped admin links are removed from the ordinary workspace sidebar and replaced with one protected "Platform Admin" entry.

## Phase 2 — Core operations

**Overview.** Real aggregate metrics via an RPC (`platform_overview_metrics`) so no bulk data reaches the browser: users, workspaces, subscriptions by state, MRR/ARR from subscription + plan price, trial conversion, communication and AI usage, automation executions and failures, orders and outstanding fulfilment. Date-range filter, tooltips documenting each metric's source and formula, truthful empty states, and drill-down links. Metrics with no data source yet render "Not tracked" rather than 0.

**Users.** Server-paginated table (search, filters, sorting, column picker, CSV export behind permission) over an admin RPC joining `profiles`, `auth.users` metadata, `workspace_members`, `subscriptions`. New `profiles.account_status` enum (`invited | active | suspended | deactivated | deletion_pending | anonymised`) backfilled from verifiable signals only (confirmed email → active, unconfirmed invite → invited); **account status is rendered separately from subscription status**, fixing the "everyone inactive" display. Detail drawer with profile, workspaces, roles, subscription, usage, communications, sessions, admin history. Actions (reset link, resend verification, suspend/reactivate, revoke sessions, assign platform role) all run in an edge function with permission + audit.

**Workspaces.** Platform-wide directory — this needs the new admin SELECT policy on `workspaces` (and matching reads for members/usage), which also **fixes Communication Control's zero organisations**. Detail view with owner, members, plan, entitlements, usage, integrations, orders, admin history. Actions: suspend/restore, extend trial, adjust credits, change owner (controlled), enter support mode.

**Support mode.** `platform_support_access_sessions` — permission-gated, written reason, expiry, read-only by default, persistent banner, full audit of entry/exit.

**Plans.** `platform_plans` + `platform_plan_versions` holding the current Starter/Plus/Pro/Enterprise definitions (prices, allowances, limits, entitlements, overage policy) migrated from `src/lib/stripe/plans.ts` without changing existing subscriber behaviour. Editing creates a new version; existing subscriptions stay pinned.

**Subscriptions.** Read model reconciled with Stripe: customer, subscription, plan, interval, trial, status, period, cancellation, failed payments, invoices. All mutations (plan change, trial extension, cancel at period end, refund, resend invoice, reconcile) run server-side through Stripe with idempotency keys, confirmation, reason and audit. The current "change the plan dropdown = active subscription" behaviour is removed.

**Usage and credits.** Unified view over existing `communication_usage`, `ai_usage`, `message_credits`, `credit_transactions` plus a new append-only `credit_adjustment_ledger` (previous balance, new balance, reason, actor, correlation ID). Manual adjustments never overwrite a balance.

## Phase 5 repairs (done in this change set)

1. **Onboarding** — create the missing `user_onboarding` table (user + nullable workspace, current_step, completed, answers JSONB, skipped steps, checklist/tour flags) with owner-scoped RLS and grants; `useOnboarding` then loads or shows a truthful empty state instead of a silent failure.
2. **Meta Pixel** — make `index.html` the single init point, share one global registry, and have `workspacePixels.ts` skip any ID already initialised; SPA route PageView fires once. Also audits `site_custom_code` for a second pixel snippet.
3. **Admin metrics** — corrected as described above, each with a documented source.
4. **Blog Manager** — diagnose the hang first (network + query settle state), then add real error, empty and permission-denied branches so it can never sit on "Loading…"; empty state offers "New post".
5. **Store fulfilment gap** — investigate `shop-webhook` / store checkout to find where project creation is missing, add idempotent creation keyed on order ID, and provide a **dry-run reconciliation report** listing which paid orders lack projects. Nothing is backfilled until you approve that exact list.

## Deferred to the next change set (Phases 3 and 4)

Communications deep views, automation monitoring and retry, integration health, platform health, security/compliance, support centre, and the store/blog/academy/community relocation into Platform Admin. Their nav entries will link to honest "Not configured yet" placeholders — no dead buttons.

## Technical notes

- All new tables get PK/FKs, timestamps, check constraints, indexes for filter columns, explicit `GRANT`s, and RLS keyed on `has_platform_permission`.
- Migrations are additive and reversible; nothing is dropped, renamed or truncated, and no existing policy is weakened.
- Admin reads go through security-definer RPCs with pagination; the browser never downloads full user/log tables.
- No secrets move client-side; all consequential mutations run in edge functions.
