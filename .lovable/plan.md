

# Add Monthly/Yearly Billing Toggle

## Overview
Add a billing cycle toggle to the pricing page with 20% yearly discount, create yearly Stripe prices, and update the checkout flow.

## Step 1 — Create Yearly Stripe Prices
Create 4 new yearly recurring prices in Stripe (20% discount = monthly * 12 * 0.8):
- **Starter Yearly**: $144/yr ($12/mo effective, was $15/mo)
- **Plus Yearly**: $374.40/yr ($31.20/mo effective, was $39/mo)
- **Pro Yearly**: $758.40/yr ($63.20/mo effective, was $79/mo)
- **Enterprise Yearly**: $1,910.40/yr ($159.20/mo effective, was $199/mo)

## Step 2 — Store Yearly Price IDs as Secrets
Add 4 new secrets:
- `STRIPE_PRICE_STARTER_YEARLY`
- `STRIPE_PRICE_PLUS_YEARLY`
- `STRIPE_PRICE_ENTERPRISE_YEARLY`
- Update existing `STRIPE_PRICE_PRO_YEARLY` if needed

## Step 3 — Update `src/lib/stripe/plans.ts`
- Add `yearlyPriceId` to each plan entry
- Add monthly prices as numbers for display calculations
- Update `BillingCycle` type to `"monthly" | "yearly"`

```typescript
export const PLANS = {
  starter: {
    name: "Starter",
    monthlyPrice: 15,
    monthlyPriceId: "price_...",
    yearlyPriceId: "price_...",
  },
  // ... same pattern for plus, pro, enterprise
};
```

## Step 4 — Update `src/pages/Pricing.tsx`
- Add `billingCycle` state (`"monthly" | "yearly"`)
- Add a toggle switch in the hero section between "Monthly" and "Yearly" with a "Save 20%" badge
- Dynamically compute displayed price: yearly shows `Math.round(monthlyPrice * 0.8)` per month
- Show "Billed yearly" or "Billed monthly" beneath each price
- Show annual savings text (e.g., "Save $36/yr") on yearly mode
- Keep 14-day free trial note only on Starter
- Pass correct `priceId` and `billingCycle` to `handleSubscribe`

## Step 5 — Update `supabase/functions/create-checkout-session/index.ts`
- Add the 4 yearly env keys to the `getAllowedPriceIds` allowlist
- Only apply `trial_period_days: 14` when the plan is `starter` (not all plans)

## Step 6 — Update `docs/stripe.md`
Add yearly Price IDs to the documentation table.

## Files Changed
| File | Change |
|------|--------|
| `src/lib/stripe/plans.ts` | Add yearly price IDs, monthly prices, update BillingCycle type |
| `src/pages/Pricing.tsx` | Add toggle, dynamic pricing, savings display |
| `supabase/functions/create-checkout-session/index.ts` | Add yearly env keys to allowlist, conditional trial |
| `docs/stripe.md` | Document yearly Price IDs |

