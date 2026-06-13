## Phase 3 — Finish Admin Communication UI

Wire all admin-side communication screens to live data and complete the remaining backend touch-points.

### 1. Backend
- **`twilio-whatsapp-send`** — bring in line with `whatsapp-send`: accept optional `sender_profile_id`, resolve via `_shared/sender-resolver.ts`, use the resolved Twilio WA SID as `from`, apply country-aware `getDeductionAmount()` deduction via `credit-guard`, write `communication_usage` row, and stamp `sender_profile_id` on the `whatsapp_messages` log.
- **`admin-credit-package-save`** (new) — admin-only upsert/delete for `credit_packages` and `credit_pricing_rules` (channel, country, credits_per_message). Validates `has_role(admin)`.
- **`admin-usage-export`** (new) — admin-only CSV stream of `communication_usage` joined with workspaces + sender_profiles, accepting `from`, `to`, `workspace_id`, `channel`, `country` filters.

### 2. AdminOrgDetail wiring
- Replace local Save handler in the WhatsApp / SMS / Email tabs with calls to `sender-profile-save`.
- "Set as default" and "Delete" actions call `sender-profile-save` (mode: `set_default` / `delete`).
- Email tab gets a **Verify DNS** button calling `email-domain-verify`; render SPF / DKIM / DMARC pill statuses returned by the function and persist them on `email_senders`.
- Wallet adjust panel: keep existing `admin-wallet-adjust` call, surface recent `credit_transactions` (last 20) in a side list.

### 3. AdminCreditPackages
- Two-tab layout:
  - **Packages** — table of `credit_packages` (name, credits, price, currency, stripe_price_id, active). Create / edit / archive via `admin-credit-package-save`. Inline "Test checkout" button calls `credit-package-checkout` for a sample workspace.
  - **Pricing Rules** — editable grid for `credit_pricing_rules` keyed by (channel, country). Empty value = fallback `1`. Bulk seed button preloads sensible defaults (US/UK/NG SMS, WA marketing/utility, email).

### 4. AdminUsage
- Filter bar: date range, workspace, channel, country, sender_profile.
- KPI strip: total messages, total credits, avg credits/message, unique workspaces.
- Table (paginated, 50/page) with channel badge, recipient (masked), credits, status, sender label, timestamp.
- "Export CSV" button hits `admin-usage-export`.
- Channel split bar chart (recharts) for the selected range.

### 5. AdminMessagesInbox
- Workspace switcher (combobox of all workspaces).
- Three tabs: WhatsApp / SMS / Email — each lists last 200 messages with status, recipient, sender_profile label, body preview, sent_at.
- Click a row → side drawer with full payload + delivery timeline (status events from existing logs).
- No realtime in this phase (covered later if Phase 6 ships).

### 6. AdminCommunicationOverview
- KPI cards (last 30d): messages sent, credits consumed, approved senders, pending approvals, low-balance workspaces (< 20 credits).
- "Pending approvals" mini-list linking to `/admin/sender-approvals`.
- "Top workspaces by spend" mini-table.
- "Channel mix" donut.
- All data fetched through `useAdminCommunication` (extend hook with `useAdminKpis`, `useAdminUsage`, `useAdminMessages`, `useCreditPackages`).

### 7. Hook & component additions
- Extend `src/hooks/useAdminCommunication.ts` with the queries above (react-query, 30s stale).
- New components:
  - `src/components/admin/comm/KpiCard.tsx`
  - `src/components/admin/comm/UsageFilters.tsx`
  - `src/components/admin/comm/MessageDrawer.tsx`
  - `src/components/admin/comm/PricingRuleGrid.tsx`
  - `src/components/admin/comm/DnsStatusPill.tsx`

### Out of scope (later phases)
- Customer-facing `/settings/*`, `/billing/credits`, `/messages` routes (Phase 5).
- Automation / Campaign `sender_profile_id` plumbing (Phase 4).
- Inbound webhooks & realtime inbox (Phase 6).

### Acceptance
- Admin can create a package + pricing rule, approve a sender, adjust wallet, view a usage row produced by a real `whatsapp-send` / `twilio-whatsapp-send` / `sms-send` / `email-send` call, and export usage CSV — all without touching SQL.
