# NexusFlo24

Project: NexusFlo24 (www.nexusflo24.com) — All‑in‑one AI‑powered marketing automation platform website.

Goal
Build a sleek, professional, high‑converting marketing site + demo dashboard for an AI marketing automation SaaS that targets creators, entrepreneurs, small businesses, and marketers. Emphasize “grow smarter — not harder.” Responsive, fast, SEO‑friendly.

Branding / Style
- Look/feel: professional, clean, futuristic.
- Palette: white background; navy blue primary (#0B1F3B or similar); gold accents (#D4AF37 or similar). Neutral grays for text/borders.
- Typography: modern sans (Inter / Geist / SF Pro fallback).
- Components: rounded cards, soft shadows, subtle gradients, micro-animations (hover, scroll reveal).
- Imagery: realistic SaaS mockups (dashboard, automation builder, chat/WhatsApp, funnel pages). Use placeholder mockup images (generated/stock placeholders) with consistent style.

Information Architecture / Pages
1) Home (/)
- Hero with headline: “Automate Your Marketing. Convert Smarter. Grow Faster — with AI.”
- Subheadline: “NexusFlo24 helps you capture leads, nurture them automatically, and close more sales — all in one AI-powered platform.”
- Primary CTAs: “Start Free Trial” (prominent) and “Book a Demo” (secondary).
- Hero visuals: mockup collage (CRM dashboard + workflow builder + WhatsApp/email cards).
- Social proof strip: integration logos (Google Sheets, Zapier, Make.com, Meta Ads, Stripe, PayPal), trust badges (GDPR-ready, 99.9% uptime placeholder).
- Features overview (8 cards): AI Lead Gen Engine, Smart CRM, AI Email & WhatsApp, Bulk SMS, Nurture Flow Builder, Funnel & Page Builder, AI Copywriter, Analytics.
- How it works (3 steps): Capture → Nurture → Convert (with icons and short copy).
- Demo section: screenshots + bullet benefits.
- Testimonials (3–6) with photos/placeholders and metrics.
- Pricing teaser linking to /pricing.
- FAQ (6–8 questions).
- Footer with links, newsletter signup, social links, support email.

2) Features (/features)
- Hero + quick nav.
- Sections for each core feature with alternating layout: description, benefits, mini mockup.
- Include “Integrations” grid.
- Include security/privacy notes.

3) Pricing (/pricing)
- Toggle Monthly/Yearly (Yearly shows ~20% savings).
- Tiers:
  - Free Trial: $0 for 14 days (or Free) — limited contacts/campaigns.
  - Pro: $49/mo (or $39/mo yearly) — full automation, WhatsApp/email, analytics.
  - Agency: $149/mo (or $119/mo yearly) — multi-client, white-label, priority support.
- Clear feature comparison table.
- CTA buttons: “Start Free Trial” / “Contact Sales”.

4) About (/about)
- Mission: “Simplifying AI Marketing for Every Business.”
- Story, values, timeline, leadership placeholders.

5) Contact (/contact)
- Contact form (name, email, company, message).
- WhatsApp button (placeholder link).
- Support email: support@nexusflo24.com (placeholder).
- Office/location placeholder.

6) Auth
- Login (/login) and Register (/register)
- Basic form UI; authentication placeholders.

7) Dashboard Demo (/dashboard)
- A gated-like demo (allow view without login but show banner “Demo data”).
- Layout: left sidebar nav (Overview, Leads, Campaigns, Automations, Funnels, Analytics, Settings).
- Overview cards: New leads, Open rate, CTR, Revenue, Tasks.
- Charts: leads over time, campaign performance.
- Tables: Recent leads (name, source, score, status), Recent campaigns.
- Workflow builder preview component (read-only) with nodes: Form Submitted → AI Score → Send Email → WhatsApp Follow-up → Tag Warm → Notify Sales.

Advanced Additions
- AI chatbot widget (“Nexus AI”) on all public pages.
  - Behavior: greets visitor, answers FAQs (scripted), offers to capture name/email/goal.
  - Save captured leads to a placeholder endpoint and store locally / in DB.
- Newsletter signup in footer connected to placeholder “AI nurture flow” endpoint.
- Backend placeholders for integrations:
  - Make.com webhook
  - Serlzo API
  - WhatsApp Cloud API
  - MailerLite/SendGrid
  - Bulk SMS gateway (placeholder)

Functional Requirements
- Implement routing for pages listed.
- Use componentized layout (Header/Nav, Footer, PricingCards, FeatureSections, Testimonials, FAQ accordion).
- Forms should validate (required fields, email format).
- Add a simple database schema (if supported) for Leads and NewsletterSubscribers:
  - Leads: id, name, email, phone (optional), source, score, status, created_at
  - NewsletterSubscribers: id, email, created_at
- API endpoints (placeholders) for:
  - POST /api/leads
  - POST /api/newsletter
  - POST /api/chatbot
- On submit, show success states and store records.

SEO / Performance
- Proper meta titles/descriptions per page.
- OpenGraph placeholders.
- Fast load, image optimization, accessible color contrast.

Copy / Messaging Highlights
- Emphasize AI personalization, multi-channel automation (Email + WhatsApp + SMS), all-in-one simplicity.
- Add microcopy like: “Launch a nurture flow in minutes.” “AI writes your follow-ups.” “See what’s converting.”

CTAs / Conversion
- Sticky header with “Start Free Trial”.
- Multiple CTAs across sections.
- “Book a Demo” links to /contact with prefilled subject.

Domain
- Ensure the site is branded as NexusFlo24 and prepared for custom domain www.nexusflo24.com.

Deliverable
A fully working responsive website with the pages above, demo dashboard, chatbot widget, and placeholder backend endpoints + DB schema for leads/subscribers.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://nexusflo24.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/83abe329-97fa-4834-9de4-67adac397517).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
