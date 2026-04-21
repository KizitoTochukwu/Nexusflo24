

## Goal
Wire your 3 new Stripe one-time price IDs into the codebase so the credit-pack "Buy Now" buttons work end-to-end.

## Changes

**1. `src/lib/stripe/creditPacks.ts`** — replace the 3 stale `priceId` values:
- `email.priceId` → `price_1TOfYVE524oup9rkOupWd3vN`
- `sms.priceId` → `price_1TOfc8E524oup9rkWQWIhwrf`
- `whatsapp.priceId` → `price_1TOfeBE524oup9rkcPlroL47`

**2. `supabase/functions/create-credit-purchase/index.ts`** — the edge function hardcodes the same 3 IDs in its own `CREDIT_PACKS` map (lines 11–15). Update all 3 to match the new IDs above. This is the actual fix for the "No such price" error — the frontend constant is just for display; the edge function is what Stripe sees.

**3. `docs/stripe.md`** — append a "Credit Packs (one-time)" section listing the 3 new prices for future reference:

| Pack | Price ID | Amount |
|---|---|---|
| Email — 1,000 emails | `price_1TOfYVE524oup9rkOupWd3vN` | $5 |
| SMS — 100 messages | `price_1TOfc8E524oup9rkWQWIhwrf` | $5 |
| WhatsApp — 100 messages | `price_1TOfeBE524oup9rkcPlroL47` | $5 |

## Verification after deploy
- Edge function `create-credit-purchase` auto-deploys on save.
- Test by clicking "Buy Now" on `/pricing` for each of the 3 packs — should redirect to Stripe Checkout instead of returning a 400.
- The existing `stripe-webhook` already handles `checkout.session.completed` with `metadata.type === "credit_purchase"` to grant credits — no backend logic changes needed.

## Out of scope
- No UI changes to `CreditPackCards.tsx` or `UsageCreditsTab.tsx`.
- No changes to subscription plans, webhook handler, or credit-grant flow.
- No changes to `plans.ts` or auth flow.

