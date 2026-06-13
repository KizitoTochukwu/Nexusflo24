# Phase 2 — Wire Communication Infrastructure End-to-End (Admin)

Phase 1 shipped the data model, admin UI shell, and wallet adjust. Phase 2 makes it **operational**: messages actually flow through `sender_profile_id`, get logged to `communication_usage`, deduct country-aware credits, and admins can both approve senders and send messages as any approved profile.

---

## 1. Shared helpers (edge functions)

- **`_shared/credit-guard.ts`** — add `getDeductionAmount(supabase, channel, country)` reading `credit_pricing_rules` (match `channel + country`, fallback to `channel + null`, default `1`).
- **`_shared/sender-resolver.ts`** (new) — `resolveSenderProfile(supabase, { workspaceId, channel, senderProfileId? })` returns `{ profile, detail }` where detail joins `whatsapp_senders` / `sms_senders` / `email_senders`. Validates `status='approved'` (throws 403 otherwise). When `senderProfileId` is null, returns the workspace's default approved profile for the channel; if none, returns `null` so caller falls back to existing workspace_channel_settings path.
- **`_shared/usage-logger.ts`** (new) — `logCommunicationUsage(supabase, { workspaceId, senderProfileId, channel, messageId, country, creditsDeducted, costCents, status })`.

## 2. New edge functions

- **`sender-profile-save`** — admin-or-member upsert into `sender_profiles` + channel detail table. Enforces plan gating (Starter → only `sender_type='shared'` for SMS; non-shared rejected). Resets `status` to `pending` on material change.
- **`sender-profile-approve`** — admin-only; sets `status`, `approved_by`, `approved_at`, optional `rejection_reason`; writes `notifications` row for workspace owner.
- **`email-domain-verify`** — DNS TXT lookup for SPF, DKIM (selector + `_domainkey`), DMARC; updates `email_senders.*_status` + `verification_status`.
- **`credit-package-checkout`** — wraps existing `create-credit-purchase`, accepts `credit_packages.id`, resolves `stripe_price_id`, creates Stripe session, returns URL.

## 3. Extend existing send functions

Touch: `whatsapp-send`, `twilio-whatsapp-send`, `sms-send`, `email-send`.

For each:
- Accept optional `sender_profile_id` in body.
- Call `resolveSenderProfile`; if returned, use its credentials/identity (Meta phone_number_id, Twilio WA sender SID, SMS from-number, email from address+domain). Otherwise keep existing workspace_channel_settings path (back-compat).
- After successful send: compute `creditsDeducted = getDeductionAmount(channel, country)` (was hardcoded 1), deduct from `message_credits`, write `credit_transactions` row, write `communication_usage` row with `sender_profile_id`, `message_id`, `country`, `credits_deducted`, `status`.
- Stamp `sender_profile_id` onto `whatsapp_messages` / `sms_logs` / `email_logs` row (column already exists from Phase 1).
- `twilio-whatsapp-send` already returns `{ success:false, fallback:true }` when 24h window closed — preserve that contract.

## 4. Admin UI wiring

- **`SenderProfilePicker`** shared component (`src/components/admin/SenderProfilePicker.tsx`) — filtered by `workspaceId + channel + status='approved'`, shows default first.
- **`AdminSenderApprovals`** — replace stub with approval queue using `useSenderProfiles(undefined, 'pending')`; per-row Approve / Reject (with reason textarea); calls `sender-profile-approve`.
- **`AdminMessagesInbox`** — workspace switcher (reuse `useAllOrganisations`), three tabs (WhatsApp / SMS / Email), conversation list reading existing `whatsapp_messages` / `sms_logs` / `email_logs` filtered by `workspace_id`, compose box with `SenderProfilePicker` + textarea + Send button that invokes the right send function with `sender_profile_id`.
- **`AdminCreditPackages`** — wire CRUD form (channel, name, credits, price_cents, currency, stripe_price_id, country) using `useUpsertCreditPackage`. Add a second panel: per-channel/country **pricing rules** table using `useUpsertPricingRule`.
- **`AdminUsage`** — replace stub with filterable table over `communication_usage` (filters: workspace, channel, date range); CSV export button.
- **`AdminCommunicationOverview`** — fill KPI cards (workspaces with active senders, pending approvals, 30-day sends per channel, 30-day credit revenue from `credit_transactions` where source='purchase').
- **`AdminOrgDetail`** — `ChannelTab` Save button currently sets `status='pending'`; change to call new `sender-profile-save` edge function (so plan gating + notification trigger happens server-side). Add **Set default** and **Delete** row actions in profile list. Add **Verify DNS** button in email channel detail that calls `email-domain-verify` and refreshes status pills.

## 5. Automation integration (wiring only, admin-visible only)

- Extend automation step config TS type in `src/lib/workflows/types.ts` (or equivalent) with optional `sender_profile_id`.
- `AutomationStepEditor`: when action is WhatsApp/SMS/Email, render `SenderProfilePicker` (workspace-scoped). Hidden if no approved profiles exist (silent fallback to default).
- `execute-automation` edge function: pass `sender_profile_id` through to send functions.

No visible change for non-admin users (they have no approved profiles yet).

## 6. Migration deltas (small)

- `credit_pricing_rules` unique `(channel, country)` if not already.
- Index `communication_usage (workspace_id, created_at desc)` and `(channel, created_at desc)` for `AdminUsage` filters.
- `sender_profiles` partial unique: only one `is_default=true` per `(workspace_id, channel)` — enforce via partial unique index.

## 7. Out of scope (defer to Phase 3)

- Customer-facing `/settings/sender-profiles`, `/settings/communication`, `/messages`, `/billing/credits` routes.
- Realtime admin inbox (poll/refetch only).
- Automated Twilio WA sender SID provisioning via API.
- Inbound webhooks writing back to `communication_usage` (outbound-only for now).
- White-label customer-visible branding swap.

## Build order

1. Shared helpers (`credit-guard.getDeductionAmount`, `sender-resolver`, `usage-logger`).
2. Extend the four send functions + add `sender_profile_id` everywhere they're invoked.
3. New edge functions (`sender-profile-save`, `sender-profile-approve`, `email-domain-verify`, `credit-package-checkout`).
4. Migration deltas (indexes + partial unique).
5. `SenderProfilePicker` shared component.
6. Wire admin pages: Approvals → Messages Inbox → Credit Packages → Usage → Overview → OrgDetail edits.
7. Automation step picker + executor passthrough.

## Open questions

1. **Email domain verification** — accept a single hardcoded DKIM selector (`resend` for Resend domains) or make the selector a column on `email_senders`?
2. **AdminMessagesInbox conversation threading** — group by recipient address (simple) or by `lead_id` when present (richer but requires joins)?
3. **Country-aware pricing default seeds** — seed common rules (US SMS = 1, UK SMS = 2, WA marketing = 3 etc.) or leave the table empty and rely on the `1` default until admin adds rules?
