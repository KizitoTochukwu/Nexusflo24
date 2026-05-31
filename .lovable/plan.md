# Multi-Currency & Regional Pricing

Add GBP, USD, EUR, NGN support across NexusFlo24 with auto-detection, manual switcher, Stripe (GBP/USD/EUR) and Paystack (NGN) checkout, and admin-managed regional pricing.

## 1. Currency foundation

**New file `src/lib/currency/config.ts`**
- `CURRENCIES = { USD:{symbol:"$",locale:"en-US",stripeCode:"usd"}, GBP:{symbol:"£",locale:"en-GB",stripeCode:"gbp"}, EUR:{symbol:"€",locale:"en-IE",stripeCode:"eur"}, NGN:{symbol:"₦",locale:"en-NG",provider:"paystack"} }`
- `COUNTRY_TO_CURRENCY` map (GB→GBP, US→USD, NG→NGN, EU countries→EUR, default USD).
- `formatPrice(amount, currency)` using `Intl.NumberFormat`.

**New `src/contexts/CurrencyContext.tsx`**
- Provides `{ currency, setCurrency, rates, convert(amountUSD) }`.
- On mount: read order = profile.preferred_currency → localStorage → geo-IP (`https://ipapi.co/json/`) → USD fallback.
- Persist to localStorage + (if authed) profile via Supabase update.
- Wrap app in `src/App.tsx`.

## 2. Header currency switcher

Add a compact `<CurrencySwitcher />` dropdown in `src/components/layout/Header.tsx` (desktop + mobile) and `DashboardLayout.tsx` topbar. Shows flag + code; updates context.

## 3. Database

Migration:
- `profiles.preferred_currency text default 'USD'`
- `regional_prices` table: `(id, plan_key, billing_cycle, currency, amount_minor int, stripe_price_id text null, paystack_plan_code text null, active bool, updated_at)` with GRANTs + RLS (admin write, anon read).
- `currency_rates` table: `(base text, quote text, rate numeric, updated_at)` seeded with static fallbacks (USD→GBP 0.79, USD→EUR 0.92, USD→NGN 1600).

## 4. Pricing display

Update `src/lib/stripe/plans.ts` to expose USD base price; new `getLocalPrice(planKey, cycle, currency)` reads `regional_prices` (cached via React Query) else converts via rates.

Update `src/pages/Pricing.tsx`, `src/components/pricing/CreditPackCards.tsx`, `UpgradeModal`, `UsageCreditsTab`, dashboard credit widget, billing history, invoices view — all read currency from `useCurrency()` and call `formatPrice`.

## 5. Checkout routing

`src/lib/billing/checkout.ts` → `startCheckout(planKey, cycle, currency)`:
- NGN → invoke new `paystack-checkout` edge function.
- Others → existing `create-checkout-session` (extended to accept `currency` and resolve correct Stripe price ID from `regional_prices`).

Same pattern for `create-credit-purchase` (multi-currency price IDs from `regional_prices`).

## 6. Stripe multi-currency

Extend `create-checkout-session` + `create-credit-purchase`:
- Look up `regional_prices` row by `(plan_key, cycle, currency)`. If `stripe_price_id` present use it; else error asking admin to configure.
- Allowed price ID set becomes dynamic (loaded from DB).

Admin must create matching prices in Stripe for GBP/EUR (USD already exists). Pricing page UI shows "Configure in admin" if missing.

## 7. Paystack integration

- Secret `PAYSTACK_SECRET_KEY` (request via add_secret when user confirms).
- New edge function `supabase/functions/paystack-checkout/index.ts`: creates transaction (`/transaction/initialize`) for one-off credit packs and subscription (`/subscription/create` with plan_code) for plans. Returns `authorization_url`.
- New edge function `paystack-webhook` verifying `x-paystack-signature` (HMAC SHA512 of body w/ secret); upserts `subscriptions` / credit ledger same shape as Stripe webhook.
- Update `subscriptions` table to include `provider text default 'stripe'` and `provider_customer_id`, `provider_subscription_id` (migration).

## 8. Admin pricing manager

New page `src/pages/admin/AdminPricing.tsx` (route under AdminGuard):
- Table per plan × cycle × currency with amount, Stripe price ID, Paystack plan code, active toggle.
- "Auto-fill from base + rate" helper.
- Edit `currency_rates` inline.
Uses `regional_prices` + `currency_rates` tables.

## 9. Invoices / receipts / billing history

`UsageCreditsTab` + any billing history component: render stored `currency` from subscription / credit_transactions rows (add `currency` column to `credit_transactions` migration). Stripe/Paystack webhooks write currency at time of purchase so history stays accurate even if user later switches display currency.

## Technical notes

- Geo-IP: `ipapi.co/json/` (free 1k/day, no key) with 24h localStorage cache; fall back silently.
- Rates refresh: cron edge function `refresh-fx-rates` (daily) pulling from `exchangerate.host` (no key) → upsert `currency_rates`. Manual fallback values seeded.
- Display conversion only — actual charge always uses currency-matched Stripe/Paystack price (no FX drift in billing).
- All amounts stored as minor units (cents/kobo).
- Keep Navy/Gold styling; switcher uses existing DropdownMenu primitives.

## Open items needing user input

1. **Paystack secret key** — I'll request `PAYSTACK_SECRET_KEY` via add_secret when you approve.
2. **Stripe prices for GBP / EUR** — do you want me to auto-create them via Stripe tools using converted amounts from current USD prices, or will you create them manually and paste IDs?
3. Scope check: this is ~15 files + 3 migrations + 2 edge functions. OK to proceed in one pass, or split into phases (Phase A: display + switcher + detection; Phase B: Stripe multi-currency; Phase C: Paystack; Phase D: admin UI)?