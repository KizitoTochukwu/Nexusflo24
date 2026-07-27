## Goal

Replace the current `/features` catalogue page with a premium, conversion-focused product story: Capture → Organise → Automate → Convert → Measure. Only `src/pages/Features.tsx` (plus small new components under `src/components/features/`) changes. Header, footer, cookie banner, chat widget, routes, auth and backend stay untouched.

## What exists today (verified)

- `src/pages/Features.tsx` (664 lines) uses `Layout` + `Seo` + shadcn `Button`/`Badge` + Lucide icons and `@/assets/hero-dashboard.png`.
- It contains unsupported claims to remove: "99.9% Uptime", "2x open rates", "3x more bookings", "<30s response time", "Save 10+ hrs/week".
- Integrations list currently includes tools with no implementation (HubSpot, Mailchimp) — these get accurate status labels or removal.
- Routes confirmed to exist: `/register`, `/pricing`, `/book/:slug`, `/tools/roi-savings-calculator`, `/security`, `/privacy-policy`, `/data-processing-addendum`. There is **no public templates route**, so "Explore Templates" will scroll to the final CTA.
- Analytics helper already present: `fbqTrack`/`fbqTrackCustom` in `src/lib/analytics/metaPixel.ts` (used by Pricing). No new library added.
- `Seo` component supports title, description, canonical, OG tags and one JSON-LD object.

## Page structure to build

1. **Hero** — badge "All-in-One AI Sales and Marketing Platform", single H1 "Capture Leads. Follow Up Automatically. Convert More Customers.", supporting copy, CTAs to `/register` and `/book/30-minute-discovery-call-9f5d5f`, plus "Explore the platform" anchor to the overview. Right side: existing `hero-dashboard.png` with descriptive alt text.
2. **Capability strip** — CRM, WhatsApp, Email, SMS, Funnels, Automations, Bookings, Nexus AI, Analytics, MCP. Horizontal scroll on mobile with hidden scrollbar; no page overflow.
3. **How it works** — 4 steps (Capture, Organise, Automate, Convert) in a responsive grid with connector line on desktop, stacked on mobile.
4. **Sticky category nav** — 9 categories, `position: sticky; top: 4rem` so it sits below the 64px site header, horizontally scrollable on mobile, smooth scroll with `scroll-margin-top` on each section, active item highlighted via IntersectionObserver.
5–11. **Feature sections** — Lead Capture & Funnels, CRM & Pipeline, Unified Messaging, Automation Builder (Trigger → Condition → Action diagram with the specified example workflow), Bookings, Nexus AI & MCP (with Connect → Approve → Ask → Execute strip; unimplemented MCP write actions labelled "Coming Soon"), Analytics & ROI (ROI calculator CTA → `/tools/roi-savings-calculator`). Alternating white / soft-grey backgrounds, each with eyebrow, H2, description, checklist grid and a lightweight in-page UI mock built from design tokens labelled "Sample data".
12. **Templates** — 8 categories; CTA scrolls to final CTA (no public templates route).
13. **Integrations** — grouped by category with explicit Available / Beta / Coming Soon badges. Available: Meta WhatsApp Cloud API, Twilio, Resend, Stripe, MCP clients. Beta/Coming Soon applied to the rest (Meta Ads, Google Ads, SendGrid, Zapier, Make, PayPal, Google Sheets, Slack, calendars) based on what is actually wired.
14. **Use cases** — 4 cards, each "See how it works" scrolls to the matching feature section.
15. **Security and control** — only supported statements; links to `/security`, `/privacy-policy`, `/data-processing-addendum`. No "GDPR compliant", "AES-256", "TLS 1.3", uptime SLA or Fortune 500 phrasing.
16. **FAQ** — accessible shadcn Accordion with the 10 specified questions; pricing answer links to `/pricing`.
17. **Final CTA** — navy→blue gradient, white text, both CTAs.

## Technical notes

- New file `src/components/features/` holds the small presentational pieces (capability strip, sticky nav, feature section shell, workflow diagram, integration card) so `Features.tsx` stays readable.
- Colours strictly via existing tokens (`bg-hero`, `text-primary-foreground`, `accent`, `surface`, `shadow-card`). No hardcoded colour utilities; all navy backgrounds use light foreground tokens.
- Motion: reuse `animate-fade-up`/`animate-fade-in`, added on scroll via IntersectionObserver, wrapped in a `prefers-reduced-motion` check.
- Images below the fold get `loading="lazy"` and real alt text.
- SEO: title "NexusFlo24 Features | AI CRM and Marketing Automation", the specified meta description, canonical `/features` (handled by `Seo`), OG tags, plus `SoftwareApplication` and `FAQPage` JSON-LD (FAQ schema generated from the same array that renders the accordion, so they can't drift).
- Analytics: `fbqTrackCustom` for `features_primary_cta_click`, `features_demo_click`, `features_category_select`, `features_roi_calculator_click`, `features_faq_expand`, `features_final_cta_click`.
- Verification with Playwright at 1440, 1024, 768 and 390 px: screenshots, horizontal-overflow check (`scrollWidth <= clientWidth`), sticky-nav offset check, and console-error capture.

Nothing is published; the page is left in preview for review.