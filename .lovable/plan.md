

# Phase 1: Usage-Based Message Credit System

## Overview
Add a message credit system so every outbound message (email, SMS, WhatsApp) deducts from a workspace balance. Credits are purchased through Stripe and managed entirely within NexusFlo24 — no third-party accounts needed.

## Database Changes

### New table: `message_credits`
Tracks per-workspace credit balance and lifetime usage.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| workspace_id | uuid | unique, FK to workspaces |
| email_balance | integer | default 0 |
| sms_balance | integer | default 0 |
| whatsapp_balance | integer | default 0 |
| email_used | integer | default 0, lifetime counter |
| sms_used | integer | default 0 |
| whatsapp_used | integer | default 0 |
| updated_at | timestamptz | auto-updated |

RLS: workspace members can SELECT; service_role can INSERT/UPDATE.

### New table: `credit_transactions`
Audit log of every credit change (purchase, deduction, admin grant).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| workspace_id | uuid | |
| channel | text | email/sms/whatsapp |
| amount | integer | positive = top-up, negative = deduction |
| reason | text | "purchase", "message_sent", "admin_grant", "plan_allocation" |
| reference_id | text | nullable, e.g. Stripe session ID or message ID |
| created_at | timestamptz | |

RLS: workspace members can SELECT; service_role can INSERT.

## Plan-Included Credits

Each billing cycle, workspaces receive bundled credits based on their plan tier. These are allocated on subscription creation/renewal via the existing webhook.

| Plan | Email/mo | SMS/mo | WhatsApp/mo |
|------|----------|--------|-------------|
| Starter | 500 | 0 | 0 |
| Plus | 2,500 | 100 | 100 |
| Pro | 10,000 | 500 | 500 |
| Enterprise | 50,000 | 2,000 | 2,000 |

## Stripe Credit Packs (Top-Up)

Create 3 Stripe products for purchasing additional credits beyond plan allocation:

- **Email Credits Pack** — e.g. 1,000 emails for $5
- **SMS Credits Pack** — e.g. 100 SMS for $5
- **WhatsApp Credits Pack** — e.g. 100 messages for $5

These are one-time payments (not subscriptions). A new edge function `create-credit-purchase` handles checkout, and the existing `stripe-webhook` is extended to handle `checkout.session.completed` with a `type: "credit_purchase"` metadata flag.

## Edge Function Changes

### Shared utility: `_shared/credit-guard.ts`
A reusable function called by `email-send`, `sms-send`, and `whatsapp-send`:

```text
deductCredit(workspaceId, channel) → { allowed: boolean, remaining: number }
```

- Checks `message_credits` balance for the channel
- If balance > 0: atomically decrements balance, increments used counter, logs to `credit_transactions`, returns allowed=true
- If balance <= 0: returns allowed=false (send functions return a clear error)

### Modify `email-send`, `sms-send`, `whatsapp-send`
Before sending, call `deductCredit()`. If not allowed, return `{ error: "Insufficient credits" }` with status 402.

### Modify `stripe-webhook`
- On `checkout.session.completed` with metadata `type: "credit_purchase"`: add credits to `message_credits` and log to `credit_transactions`.
- On `checkout.session.completed` with subscription metadata: allocate plan-included credits (upsert `message_credits` row).
- On `invoice.payment_succeeded` (renewal): top up monthly allocation.

### New: `create-credit-purchase/index.ts`
One-time payment checkout for credit packs. Accepts `{ channel, packSize, workspaceId }`, creates a Stripe checkout session with `mode: "payment"`.

## Frontend Changes

### Credit Balance Display
- Add a `useMessageCredits` hook that fetches from `message_credits` table
- Show balances in the dashboard sidebar (email: X, SMS: X, WhatsApp: X)
- Show in Settings page under a new "Usage & Credits" tab

### Buy Credits UI
- Add "Buy Credits" button in the Usage tab
- Simple modal with pack selection per channel → calls `create-credit-purchase`

### Insufficient Credits Feedback
- When send functions return 402, show a toast: "Insufficient [channel] credits. Buy more in Settings → Usage."

### Plan Limits Update
- Update `planLimits.ts` to include credit allocations per tier (for display on Pricing page)
- Update Pricing page to show included credits per plan

## Implementation Order

1. Database migration (2 tables)
2. `_shared/credit-guard.ts` utility
3. Modify `stripe-webhook` for credit allocation on subscription events
4. Modify `email-send`, `sms-send`, `whatsapp-send` to enforce credits
5. `create-credit-purchase` edge function
6. Frontend: `useMessageCredits` hook + sidebar display
7. Frontend: Usage tab + Buy Credits modal
8. Update Pricing page with credit info

