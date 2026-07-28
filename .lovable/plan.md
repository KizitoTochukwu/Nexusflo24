
# Repackage NexusFlo24 Plans

Prices stay as they are (Starter / Plus / Pro / Enterprise at the current Stripe price IDs). What changes is **how features are grouped, what each tier includes, and the enforced limits**.

## Packaging principles

- Every plan is described using the same six groups, in the same order, so the ladder is easy to scan:
  1. **Capture** — forms, funnel pages, booking pages
  2. **CRM & Pipeline** — contacts, pipeline, smart lists, lead scoring
  3. **AI & Automation** — AI copy, nurture flows, behaviour triggers, AI qualification
  4. **Communication Wallet** — monthly email / WhatsApp / SMS credits, top-up packs
  5. **Insights** — analytics depth, exports
  6. **Team & Advanced** — seats, workspaces, white-label, API
- **No "unlimited" anywhere.** Every usage figure becomes a real number. Enterprise uses "Custom" plus a sales conversation, not "unlimited".
- Messaging is presented as one **Communication Wallet**: a monthly credit allowance per channel that can be topped up anytime with credit packs (existing packs stay).
- Starter is made genuinely usable (real CRM, booking, forms, automation basics). Pro is the best-value anchor and keeps "Most Popular". Plus is positioned as the clear step up for growing teams. Enterprise becomes sales-led.

## Proposed tier contents

**Starter — for beginners getting their first system live**
Capture: 3 forms, 1 funnel page, 1 booking page · CRM: 1,000 contacts, full pipeline & lead scoring · AI & Automation: 15 AI generations/day, 2 active automations, 3 campaigns · Wallet: 1,000 email + 100 WhatsApp credits/mo · Insights: core dashboard · Team: 1 seat. Keeps the 14-day trial note.

**Plus — for growing businesses and small teams**
Capture: 15 forms, 5 funnel pages, 3 booking pages · CRM: 5,000 contacts + smart lists · AI & Automation: 100 AI generations/day, 10 automations, 15 campaigns, behaviour triggers, AI lead qualification · Wallet: 5,000 email + 500 WhatsApp + 250 SMS/mo · Insights: campaign & funnel reporting · Team: 3 seats.

**Pro — most popular, best value**
Capture: 50 forms, 20 funnel pages, 10 booking pages · CRM: 25,000 contacts · AI & Automation: 500 AI generations/day, 50 automations, 60 campaigns, full automation builder, AI Sales Closer · Wallet: 20,000 email + 2,000 WhatsApp + 1,000 SMS/mo · Insights: advanced analytics, cohort & attribution, exports · Team: 10 seats, AI Agent Connections (MCP).

**Enterprise — sales-led, for agencies and high-volume senders**
Everything in Pro with custom capture/CRM volumes, 100,000 contacts baseline, multi-client workspaces, white-label dashboard, API access, priority delivery, dedicated account manager. Wallet: 75,000 email + 6,000 WhatsApp + 4,000 SMS/mo with custom top-ups. CTA becomes **Talk to Sales** (routes to /contact) instead of Buy Now.

## Technical changes

- `src/lib/billing/planLimits.ts` — replace all `Infinity` values with the concrete numbers above; add fields the new grouping needs (`maxForms`, `maxBookingPages`, `maxAutomations`, `maxSeats`, `aiQualification`, `aiSalesCloser`, `mcpConnections`) and drop `aiCopyUnlimited` in favour of the daily limit only.
- `src/hooks/usePlanGating.ts` — update `ADMIN_LIMITS` to the new shape (admins keep bypass), and widen `checkLimit` to accept the new countable keys.
- `src/lib/stripe/creditPacks.ts` — update `PLAN_CREDITS` to the new wallet allowances so the pricing table and wallet UI stay in sync.
- `src/pages/Pricing.tsx` — rewrite `tiers` with the six-group structure, rewrite `comparisonFeatures` to match (no "Unlimited" cells), and make the Enterprise CTA sales-led.
- `src/components/pricing/CreditPackCards.tsx` — reframe the section heading as "Top up your Communication Wallet" (copy only, same checkout).
- Check the consumers of the changed limits (`useLeads`, `useFunnels`, `useCampaigns`, `UsageCreditsTab`, `LockedFeature` call sites) and update any that assumed `Infinity` or the removed `aiCopyUnlimited` flag.
- Update `PricingFaq` copy for the wallet model, and refresh the pricing memory file.

No database or Stripe changes are required; existing subscriptions keep their plan key and simply resolve to the new limits.
