# Stripe Integration Setup

## 1. Environment Secrets (already configured in Lovable Cloud)

| Secret | Description |
|--------|-------------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key (`sk_test_…` or `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) |

## 2. Replace Price IDs

Open `src/lib/stripe/plans.ts` and replace the placeholder IDs with your actual Stripe price IDs:

```ts
pro: {
  monthlyPriceId: "price_YOUR_PRO_MONTHLY",
  yearlyPriceId: "price_YOUR_PRO_YEARLY",
  productId: "prod_YOUR_PRO",
},
agency: {
  monthlyPriceId: "price_YOUR_AGENCY_MONTHLY",
  yearlyPriceId: "price_YOUR_AGENCY_YEARLY",
  productId: "prod_YOUR_AGENCY",
},
```

### Creating Products & Prices in Stripe Dashboard

1. Go to **Stripe Dashboard → Products**
2. Create **NexusFlo24 Pro** product with two prices:
   - Monthly: $49/mo recurring
   - Yearly: $39/mo ($468/yr) recurring
3. Create **NexusFlo24 Agency** product with two prices:
   - Monthly: $149/mo recurring
   - Yearly: $119/mo ($1,428/yr) recurring
4. Copy each price ID (`price_…`) into `plans.ts`

## 3. Webhook Setup

### Production (Stripe Dashboard)
1. Go to **Developers → Webhooks**
2. Add endpoint: `https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret → update `STRIPE_WEBHOOK_SECRET`

### Local Testing (Stripe CLI)
```bash
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

## 4. Customer Portal

1. Go to **Stripe Dashboard → Settings → Billing → Customer Portal**
2. Enable it and configure allowed actions (cancel, update payment method, etc.)

## 5. Test Cards

| Card | Scenario |
|------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 3220` | 3D Secure required |
| `4000 0000 0000 0002` | Declined |

## 6. Flow

1. User clicks "Start Free Trial" on Pro/Agency → redirected to Stripe Checkout
2. 14-day trial starts (card required)
3. On success → redirected to `/dashboard?checkout=success`
4. Webhook updates `subscriptions` table
5. "Manage Billing" button opens Stripe Customer Portal
