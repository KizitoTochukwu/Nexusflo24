

## Goal
Resolve the `No such price: 'price_1TD8MHCvKm9Paj6GPnQcHNSH'` error on the "Buy Now" credit-pack buttons by replacing the 3 stale price IDs with real ones from your Stripe account.

## Why this is happening
`src/lib/stripe/creditPacks.ts` references three one-time Stripe price IDs (`email`, `sms`, `whatsapp`) that don't exist in your Stripe account. I confirmed via Stripe — only your 4 subscription plans exist; there are **no** one-time credit-pack products/prices.

## What you'll do (5 minutes in Stripe)
Create 3 one-time products in your Stripe Dashboard → Products → Add Product:

| Product name | Price | Billing | Notes |
|---|---|---|---|
| Email Credits Pack — 1,000 emails | **$5.00 USD** | One-time | |
| SMS Credits Pack — 100 messages | **$5.00 USD** | One-time | |
| WhatsApp Credits Pack — 100 messages | **$5.00 USD** | One-time | |

For each, copy the **Price ID** (starts with `price_…`) and paste them back to me in this format:
```
email: price_xxx
sms: price_xxx
whatsapp: price_xxx
```

## What I'll do once you send the 3 price IDs
1. **Update `src/lib/stripe/creditPacks.ts`** — replace the 3 stale `priceId` values with your new ones. No other logic changes.
2. **Verify the edge function** (`supabase/functions/create-credit-purchase/index.ts`) reads from this same constant — confirm one-time `mode: "payment"` checkout flow is intact.
3. **Update `docs/stripe.md`** — add a "Credit Packs" section listing the 3 new one-time price IDs alongside the existing subscription prices for future reference.

## Out of scope
- No changes to checkout logic, webhook handling, or credit-grant flow on the backend
- No changes to `CreditPackCards.tsx` UI — it already works correctly, just needs valid price IDs downstream
- No changes to subscription plans or `plans.ts`

## Alternative if you'd rather not touch Stripe
Re-approve the "create prices via tool" approach from earlier and I'll create all 3 in one batch — same end result, no manual work for you.

