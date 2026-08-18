# Automation Store — Conversion & Sales Readiness Upgrade

Additive only. The catalogue, configurator, pricing levels, filters, delivery process and all existing product data stay exactly as they are.

## 1. Fit-call CTA on every product page
- Secondary button under "Configure this automation": **"Book a Free 15-Minute Automation Fit Call"**, linking to the public booking page `/book/book-a-free-15-minute-automation-fit-call-9c004f`.
- Supporting line: "Not sure this is the right automation? We will help you choose before you buy."
- Same CTA repeated near the bottom of the page beside the closing call to action.

## 2. Trust / social-proof section — "A safer, clearer way to automate"
Six trust cards: fixed scope confirmed before payment, secure onboarding, human implementation, complete workflow testing, go-live support, clear delivery timeline.
Below it, empty-but-styled slots for future testimonials and case studies (shown as "Customer stories coming soon" placeholders). No invented logos, results or testimonials.

## 3. "What is not included" section
Standard list on every product: third-party subscriptions and usage fees, advertising spend, WhatsApp/Meta approval fees, custom software development outside agreed scope, extra integrations or revisions outside the selected configuration. Closing note: any additional work is quoted and approved before it begins.

## 4. FAQ section
Standard accordion on every product detail page covering the eight questions requested (subscription needed, existing software accounts, third-party fees, passwords, what happens after purchase, scope changes, ongoing support, cancelling an Automation Care plan). Answers rendered as FAQPage JSON-LD for search visibility.

## 5. Currency handling
- UK visitors already resolve to GBP via geo detection; this is kept and the fallback order is tightened so a UK visitor never lands on USD.
- USD, EUR, NGN stay supported; manual choice is saved to local storage and to the signed-in profile (already in place) and re-used on future visits.
- **Charging currency changes from GBP-only to the visitor's selected currency.** The selected currency and the converted minor-unit amounts are sent to checkout, stored on the order, used for the Stripe session, and used in confirmation/admin emails, so catalogue → product → configurator → cart → Stripe → order record → email all agree.
- NGN cannot be charged through Stripe. When NGN is selected, the cart and checkout show a clear notice that payment is taken in GBP, and the order is recorded in GBP.

## 6. Order assurance block
A compact assurance list beside the purchase action on the product page, in the cart and on checkout: fixed scope confirmed before payment, secure checkout, 3–5 working day delivery where stated, you approve before go-live, never share passwords.

## 7. Purchase workflow completion
Already working: add to cart, Stripe checkout, success page, order + delivery projects created on payment, customer confirmation email, admin order list, separate storage of one-time setup total and monthly plan total.
Gaps closed in this change:
- Order status starts as **"Awaiting onboarding"** after payment (currently a generic "paid"), with matching labels in the admin dashboard and the customer's My Automations view.
- Dedicated **customer onboarding email** with a direct link to the onboarding form, sent immediately after the confirmation email.
- **Internal admin notification** email on every new paid order sent to the team address.
- Confirmation and admin emails show the order's currency rather than assuming GBP.

## Technical notes
- New shared components under `src/components/store/`: `ProductTrustSection`, `NotIncludedSection`, `ProductFaq`, `OrderAssurance`, `FitCallCta`. Rendered from `StoreProductDetail.tsx`; standard copy lives in `src/lib/store/constants.ts`.
- `src/lib/store/price.ts` gains a helper returning both the display string and the charge amount in the active currency's minor units.
- `store_orders` already has a `currency` column; `store-checkout` will persist the selected currency and pass the matching Stripe currency code, converting item amounts from GBP pence using the live `currency_rates` table server-side (not trusting client amounts).
- `stripe-webhook` sets `status: "awaiting_onboarding"` and triggers the new `onboarding_invite` and `admin_new_order` events in `store-notify`.
- Status label maps in `AdminStoreOrders.tsx` and the customer projects view updated to render "Awaiting onboarding".
