

## Goal
Remove duplicate upgrade prompts on the dashboard and keep one clean, accurate billing card.

## What's wrong today
The dashboard shows **two** upgrade CTAs stacked on top of each other:
1. A yellow "Starter Plan" banner at the very top (`FreePlanBanner`)
2. A "Plan: Free / Upgrade" billing card right below it

They also disagree (one says **Starter**, the other says **Free**) which looks broken.

## Plan

### 1. Remove the top banner
In `src/components/dashboard/DashboardLayout.tsx`, remove the `<FreePlanBanner />` render and its import. The `<BillingWarningBanner />` (for past-due / canceled subscriptions) stays — it serves a different purpose.

### 2. Keep & upgrade the Billing Card (in `src/pages/Dashboard.tsx`)
Make this the single source of truth for plan status:
- Fix the plan label so it correctly shows **Starter / Plus / Pro / Enterprise / Free** (currently the mapping only handles `agency` and `pro`, which is why it falls back to "Free" even when the user is on Starter).
- When the user is on Starter (or Free), append a short helper line under the plan name: *"Upgrade to unlock unlimited leads, automations, and more."* — pulling the value the removed banner was providing.
- Keep the existing "Upgrade" → `/pricing` button and "Manage Billing" button as they already are.
- Tighten visual styling so the card feels like the primary plan surface (gold accent border on free/starter plans, subtle sparkle icon).

### 3. Keep `FreePlanBanner.tsx` file
Don't delete the component file — it may be reused elsewhere later. Just stop rendering it in the dashboard layout.

## Files to change
- `src/components/dashboard/DashboardLayout.tsx` — remove `FreePlanBanner` import + render
- `src/pages/Dashboard.tsx` — fix `planLabel` mapping for all 4 tiers, add helper copy + light styling polish to the billing card

## Out of scope
- No changes to pricing logic, Stripe, or `usePlanGating`
- No changes to the warning banner for past-due subscriptions
- `FreePlanBanner.tsx` component file kept intact (just unused on dashboard)

