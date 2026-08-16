# NexusFlo24 Automation Store — Phase 1: Storefront

A new public commerce layer inside NexusFlo24 at `/automations`, selling done-for-you automation setups as products. Phase 1 delivers the full browsing and lead-capture experience with a database-backed catalogue. Cart, Stripe checkout, onboarding and customer project tracking follow in Phase 2 (outlined at the end).

Nothing existing is redesigned: the current header, footer, design tokens, auth, currency switcher and Cloud backend are reused as-is.

## What gets built

### 1. Catalogue in the database
Seeded with the 12 automations, 4 bundles, 14 categories, 10 business problems, and the 3 managed care plans. Everything is editable later from an admin screen (Phase 2) rather than hardcoded.

- Products: name, slug, category, level (Quick Win / Business Automation / Automation System), badge, outcome statement, problem narrative, "what you get" list, best-for chips, integrations, workflow steps, base price in GBP, delivery estimate, popularity flag, tags.
- Bundles: included items, headline price, saving vs buying separately.
- Categories and business problems with their own hero copy.
- Public read access for published rows only; admin-only writes.

### 2. Store homepage — `/automations`
- Premium hero: "Automate the Work. Grow the Business." with primary "Browse Automations", secondary "Find My Automation", tertiary "Build Something Custom".
- Animated workflow visual beside the hero (New Lead → CRM → Notification → Email → WhatsApp → Follow-Up) using connected nodes and gentle motion — no robots, no stock illustration.
- Trust strip: Done For You, Secure Setup, Built & Tested, Human Support, No Technical Skills Required.
- "What Would You Like to Automate?" — 10 clickable business-problem cards.
- Popular Automations: 8 product cards (icon, name, outcome, category, level badge, delivery estimate, from-price, View / Configure).
- Automation levels explainer, bundles teaser, managed plans teaser, closing CTA band.
- No invented review counts, ratings or sales figures anywhere.

### 3. Catalogue — `/automations/all`
Ecommerce-style browsing:
- Search field ("What would you like to automate?") matching name, description, category, problem, integrations, industry and tags.
- Filters: category, business problem, level, price range, industry, integration, delivery time, most popular, managed support available. Sidebar on desktop, drawer on mobile.
- Sorting: Recommended, Most Popular, Price low→high, Price high→low, Newest.
- Filter state reflected in the URL so results can be shared.

### 4. Category pages — `/automations/lead-generation` etc.
One reusable template covering all 14 categories: category hero, outcome-focused intro, recommended automations, matching bundle, related integrations, CTA into the Automation Finder.

### 5. Product page — `/automations/[slug]`
Conversion-focused template: title, category, level, benefit statement, from-price, delivery timeframe, "Configure Automation" and "Talk to Us" CTAs, sticky summary on desktop.
Sections: How It Works (visual connected workflow), The Problem This Solves, What You Get (checklist), Best For (business-type chips), Supported Integrations (only the relevant ones), What Happens After You Order (7 steps: Configure → Purchase → Onboard → Build → Test → Approve → Go Live), managed plan upsell, related automations.

### 6. Configurator
Dynamic per-product question set (lead sources, CRM, channels, systems to connect, monthly volume, existing accounts) with a live "Estimated Setup Price" that adjusts transparently — no hidden costs. In Phase 1 the configuration is saved and submitted as a request; Phase 2 hands it to cart and checkout.

### 7. Automation Finder — `/automation-finder`
Five-step wizard (improvement area → time sinks → software used → lead sources → free-text goal) ending in "Recommended For You" with 1–3 products, each with a plain-English reason it fits, price, delivery time and CTAs. Recommendation logic is rule-based now but structured behind a single scoring module so an AI engine can replace it later. Responses are stored as leads in the CRM.

### 8. Build My Automation — `/build-my-automation`
Full request form (contact, business, industry, team size, problem, current process, platforms, desired process, volume, budget, timeline) with the LinkedIn→HubSpot→WhatsApp example placeholder. Submissions land in the CRM as leads and notify the team, ready for AI scoping later.

### 9. Bundles — `/automation-bundles`
The 4 bundles presented as ecommerce packages with contents, from-price and visible saving, plus a comparison of what each is best for.

### 10. Navigation and SEO
- Primary nav becomes: Solutions, Services, Automation Store, AI Agents, Pricing, Resources — with Login/Dashboard and "Browse Automations" on the right. Mobile drawer updated to match. Automation Store gets a subtle accent so it stands out without dominating.
- Footer gains an Automation Store column.
- Per-page titles, meta descriptions, canonical URLs and Product/ItemList structured data; store routes added to the sitemap.

## Technical notes

- New tables in Lovable Cloud: `store_products`, `store_categories`, `store_problems`, `store_bundles`, `store_plans`, `store_configurations`, `store_requests`. Public `SELECT` limited to published rows; writes restricted to admins via the existing `has_role` check. Request/configuration inserts allowed from the public store form and mirrored into `leads` so the CRM, scoring and automations keep working as they do today.
- New route group under `src/pages/store/` with shared components in `src/components/store/`, following the existing page/layout conventions and the Navy/Gold token set. Existing `Layout`, `Header`, `Footer`, `Seo` and shadcn primitives are reused.
- Prices stored in GBP minor units; display goes through the existing `CurrencyContext` so USD/EUR/NGN/CAD/AUD/ZAR/GHS/KES/INR display is ready when Phase 2 charges money.
- No changes to existing dashboard, CRM, bookings, campaigns or ads code.

## Phase 2 (not in this build)

Cart with separated one-time and monthly totals, multi-step checkout on the existing Stripe integration, post-purchase success page, dynamic onboarding (secure access instructions only — never password fields), "My Automations" and project detail pages in the customer dashboard, and an admin fulfilment panel for order status, progress, updates and approval requests.
