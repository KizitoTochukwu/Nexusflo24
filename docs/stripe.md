# Stripe Integration Setup

## 1. Environment Secrets (already configured in Lovable Cloud)

| Secret | Description |
|--------|-------------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key (`sk_test_…` or `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) |

## 2. Price IDs (configured)

| Plan | Monthly Price ID | Yearly Price ID |
|------|-----------------|-----------------|
| Starter ($15/mo · $144/yr) | `price_1T9mXPE524oup9rkk8iIwV9V` | `price_1T9mYOE524oup9rkkZdWRQFx` |
| Plus ($39/mo · $374.40/yr) | `price_1T9marE524oup9rkld15YfyQ` | `price_1T9mbVE524oup9rkVF3I4II2` |
| Pro ($79/mo · $758.40/yr) | `price_1T9mcBE524oup9rkNpX4MfLj` | `price_1T9mdJE524oup9rkt4IgzlT6` |
| Enterprise ($199/mo · $1,910.40/yr) | `price_1T9mf7E524oup9rkAFzF9Yae` | `price_1T9mfeE524oup9rk66YsGrWs` |

Yearly pricing = Monthly × 12 × 0.8 (20% discount).

## 3. Webhook Setup

### Production (Stripe Dashboard)
1. Go to **Developers → Webhooks**
2. Add endpoint: `https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret → update `STRIPE_WEBHOOK_SECRET`

## 4. Plan Hierarchy

- **Starter** ($15/mo · $12/mo yearly) — 14-day free trial, no card required. Account locks after trial unless subscribed.
- **Plus** ($39/mo · $31.20/mo yearly) — Growing businesses.
- **Pro** ($79/mo · $63.20/mo yearly) — Most popular. Full-featured.
- **Enterprise** ($199/mo · $159.20/mo yearly) — Agencies & teams. White-label, API, multi-workspace.

## 5. Billing Toggle

The pricing page includes a Monthly/Yearly toggle. Yearly billing applies a 20% discount. Only the Starter plan includes a 14-day free trial.

## 6. Test Cards

| Card | Scenario |
|------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 3220` | 3D Secure required |
| `4000 0000 0000 0002` | Declined |

## 7. Flow

1. User clicks "Buy Now" on any plan → redirected to Stripe Checkout
2. Starter plan includes 14-day free trial (no card required at signup)
3. On success → redirected to `/dashboard?checkout=success`
4. Webhook updates `subscriptions` table
5. "Manage Billing" button opens Stripe Customer Portal

## 8. Credit Packs (one-time)

These are one-time purchase prices used by the credit-pack "Buy Now" buttons on `/pricing` and the Usage tab in Settings. The edge function `create-credit-purchase` references these IDs directly.

| Pack | Price ID | Amount |
|---|---|---|
| Email — 1,000 emails | `price_1TOfYVE524oup9rkOupWd3vN` | $5 |
| SMS — 100 messages | `price_1TOfc8E524oup9rkWQWIhwrf` | $5 |
| WhatsApp — 100 messages | `price_1TOfeBE524oup9rkcPlroL47` | $5 |
