# White-Label Communication Infrastructure (Admin-Only Phase)

Build NexusFlo24's multi-tenant branded comms layer. This phase ships **inside the admin panel only** — admins can configure, approve, and operate everything end-to-end. A later phase will surface the customer-facing screens on regular user dashboards.

We already have: Twilio (master), Stripe billing, Supabase, message credits wallet (`message_credits`, `credit_transactions`), WhatsApp via Meta Cloud + Twilio dispatcher, SMS via Twilio, Email via Resend, workspace-scoped RLS, `workspace_channel_settings`, `whatsapp_templates`, automations, inbox hooks. We will **extend**, not replace.

---

## 1. Data model (migration)

New tables (all workspace-scoped, RLS on, admin override via `has_role('admin')`):

- **`sender_profiles`** — unified identity record
  `id, workspace_id, channel ('whatsapp'|'sms'|'email'), label, display_name, address (phone/email), is_default, status ('pending'|'approved'|'rejected'|'suspended'), rejection_reason, approved_by, approved_at, metadata jsonb, created_at, updated_at`
- **`whatsapp_senders`** — Meta/Twilio WA business identity
  `id, sender_profile_id, business_name, phone_number, website, category, address, meta_business_id, twilio_wa_sender_sid, approved_sender_name, verification_status, provider ('meta'|'twilio')`
- **`sms_senders`**
  `id, sender_profile_id, sender_type ('dedicated_number'|'alphanumeric'|'shared'), display_name, phone_number, country, verification_status, monthly_fee_cents`
- **`email_senders`**
  `id, sender_profile_id, from_name, from_email, reply_to, domain, dkim_status, spf_status, dmarc_status, verification_status, provider ('resend'|'sendgrid'|'smtp'|'mailgun')`
- **`communication_usage`** — append-only per-send log
  `id, workspace_id, sender_profile_id, channel, message_id, country, credits_deducted, cost_cents, status, created_at`
- **`credit_packages`** — admin-managed catalog (extends existing `CREDIT_PACKS` lib)
  `id, channel, name, credits, price_cents, currency, stripe_price_id, country (nullable), is_active, sort_order`
- **`credit_pricing_rules`** — per-country / per-channel deduction rates
  `id, channel, country (nullable), credits_per_message, updated_by, updated_at`
- **`wallet_settings`** — per-workspace
  `workspace_id PK, low_balance_threshold, auto_topup_enabled, auto_topup_package_id, auto_topup_min_balance`

Reuse existing `message_credits` as the wallet balance source; `credit_transactions` as ledger. Add a `sender_profile_id` column to `whatsapp_messages`, `sms_logs`, `email_logs` (nullable, for traceability).

`conversations` / `messages`: not needed — `whatsapp_messages`, `sms_logs`, `email_logs` + inbox hooks already cover this.

All tables: `GRANT` to `authenticated` + `service_role`; RLS via `is_workspace_member` + `has_role(auth.uid(),'admin')` bypass.

## 2. Edge functions (new + extended)

New:
- `sender-profile-save` — create/update profile, enforce plan gating (Starter → only shared NexusFlo24 sender)
- `sender-profile-approve` — admin-only; sets status, fires notification
- `email-domain-verify` — checks DKIM/SPF/DMARC via DNS lookup
- `credit-package-checkout` — generalizes existing `create-credit-purchase` to use `credit_packages` rows
- `admin-wallet-adjust` — admin-only manual credit add/deduct with ledger entry

Extended:
- `whatsapp-send`, `twilio-whatsapp-send`, existing email/SMS senders: accept optional `sender_profile_id`, look up identity, validate `status='approved'`, write to `communication_usage` after success, apply country-aware deduction from `credit_pricing_rules`.
- `credit-guard`: add `getDeductionAmount(channel, country)` reading `credit_pricing_rules` (default 1).

## 3. Admin UI (this phase)

Top-level admin section "Communication" with these routes (admin-gated by `AdminGuard`):

- `/admin/communication` — overview dashboard: org count, pending approvals, Twilio usage proxy, revenue widget
- `/admin/communication/organisations` — list workspaces with channel status, credits, suspend toggle
- `/admin/communication/organisations/:workspaceId` — drill-down with tabs:
  - **WhatsApp** — view/configure WA sender (Meta + Twilio fields)
  - **SMS** — view/configure SMS sender
  - **Email** — view/configure email sender + DKIM/SPF/DMARC status pills
  - **Sender Profiles** — list, set default, add new
  - **Verification Status** — at-a-glance pills
  - **Usage & Credits** — wallet balance, ledger, manual adjust, low-balance settings
- `/admin/sender-approvals` — queue of pending WA/SMS/Email senders with approve/reject + reason
- `/admin/usage` — global communication_usage explorer with filters (channel, workspace, date)
- `/admin/credit-packages` — CRUD packages + per-country pricing rules
- `/admin/messages` — admin inbox: workspace switcher, conversation list, send-as picker (approved sender_profile dropdown)

Reuse: `WhatsAppConnectCard`, `ChannelSettingsTab`, `UsageCreditsTab` as building blocks inside org drill-down. Add `SenderProfilePicker` shared component used in admin messages and (later) automations.

## 4. Automation integration

- Add `sender_profile_id` to automation step config schema (WhatsApp/SMS/Email action types).
- `AutomationStepEditor`: add sender picker when action channel is messaging.
- `execute-automation`: pass `sender_profile_id` through to send functions.

(UI for picker reused from admin; the *user-facing* automations dashboard already exists — we only wire the new field. No visible change for non-admin users since they have no approved profiles yet.)

## 5. Plan gating

In `src/lib/billing/planLimits.ts`:
- Starter → only `sender_type='shared'` allowed; cannot create dedicated WA/SMS/email senders.
- Plus/Pro/Enterprise → full sender provisioning.
- Enforced in `sender-profile-save` and disabled in UI with `LockedFeature`.

## 6. Security guarantees

- Twilio/Meta secrets stay in edge functions; admin UI only displays masked fragments.
- All sends: approved-status check → wallet check → send → ledger + usage log → return.
- RLS denies cross-workspace reads; admin role bypass via `has_role`.

## 7. Out of scope (this phase)

- Customer-facing `/settings/communication`, `/settings/sender-profiles`, `/messages`, `/billing/credits` routes (deferred; admin manages on customer's behalf).
- Real Twilio sender SID provisioning API call (we store the SID once admin pastes it; automated provisioning is a follow-up).
- Inbound webhook re-architecture — existing `twilio-whatsapp-webhook`, `twilio-sms-webhook`, email inbound stay as-is and will be augmented to write to `communication_usage` only on outbound.
- Real-time inbox in admin (poll-based first; realtime channel later).

## 8. Build order

1. Migration (tables, grants, RLS, `sender_profile_id` columns).
2. Shared `SenderProfilePicker` + admin org list + drill-down (read-only first).
3. Sender setup forms (WA/SMS/Email) + approval queue.
4. Credit packages CRUD + pricing rules + wallet adjust.
5. Wire `sender_profile_id` through send functions + `communication_usage` logging.
6. Admin messages inbox with send-as picker.
7. Automation step picker wiring.

## Open questions

1. **Email provider scope** — do you want all four (Resend/SendGrid/SMTP/Mailgun) wired now, or just Resend (already integrated) with the others as selectable-but-disabled stubs?
2. **Conversations table** — keep using channel-specific tables (`whatsapp_messages`, `sms_logs`, `email_logs`) for the inbox, or do you want a unified `messages`/`conversations` table now (bigger migration, touches existing inbox hooks)?
3. **WA sender provider default** — for new approved WA senders, should the dispatcher prefer Twilio (since you've standardised on Twilio master) or keep Meta Cloud where already connected?
