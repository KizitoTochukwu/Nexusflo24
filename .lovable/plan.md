# AI SEO & Search Visibility Engine — Service Page

A new standalone marketing page at `/ai-seo-visibility-engine`, built into the existing NexusFlo24 site (same Header, Footer, Seo component, navy/gold tokens, container/section rhythm used by `/coaches-creators`, `/marketing-agencies`, etc.).

## Files to create

1. **`src/pages/AiSeoVisibilityEngine.tsx`** — full page component with all 11 sections.
2. **`src/assets/ai-seo-visibility-hero.jpg`** — hero illustration generated via imagegen (navy + gold; Google search box, AI answer bubble, ranking chart, content cards, CRM/automation flow lines connecting them).

## Files to edit

1. **`src/App.tsx`** — add `<Route path="/ai-seo-visibility-engine" element={<AiSeoVisibilityEngine />} />` alongside the other sector/how-it-works routes.
2. **`public/sitemap.xml`** — add the new URL.

## Page architecture

Reuse the visual language of `SectorPage.tsx` (hero with eyebrow chip + image, trust strip, cards grid, numbered workflow, FAQ accordion, final CTA card). Build it inline rather than parameterizing `SectorPage`, because this page has 11 sections including pricing tiers and a lead form that the sector template doesn't support.

Sections, in order:

1. **Hero** — eyebrow "AI SEO & SEARCH VISIBILITY", H1 headline, subheadline, primary CTA (smooth-scrolls to `#audit-form`), secondary CTA (smooth-scrolls to `#how-it-works`), hero image, 4 trust pills.
2. **Problem** — intro copy + 3 cards (Low traffic / Poor Google visibility / Not in AI answers) using destructive-tinted icons like `SectorPage` pain points.
3. **Solution** — title, copy, then a horizontal 5-node flow: Visibility → Traffic → Leads → Automation → Sales (arrows between, accent color).
4. **What's Included** — 6 service cards in 3-col grid with lucide icons (Search, FileText, Sparkles, Wrench, Workflow, BarChart3).
5. **Who It's For** — 8 chip/cards in 4-col grid.
6. **How It Works** — 5 numbered steps (reuse the `SectorPage` workflow pattern with primary-bg circle + arrow between).
7. **Benefits** — 8 benefit cards with check icons, 4-col grid.
8. **Packages** — 3 pricing-style cards (middle one highlighted with accent border + "Most Popular" badge). Each lists name, tagline, bullet list with check icons, CTA button. No payments — buttons link to `/contact` or scroll to form.
9. **Lead Magnet form** (`id="audit-form"`) — controlled React form with fields: full_name, business_name, email, website_url, service_offered (text), main_goal (select). Validates with zod (matching the input-validation guideline). On submit: insert into a `seo_audit_requests` table OR simply call existing `/contact` mailto / `notify-form-submission` edge function — see open question below. On success, replace form with thank-you message.
10. **FAQ** — 6 Q&As using the shadcn Accordion (same as `SectorPage`).
11. **Final CTA** — navy band with headline, sub, two CTAs (Book Audit → scrolls to form; Speak to NexusFlo24 → `/contact`).

Use `<Seo>` with the supplied title, description, path `/ai-seo-visibility-engine`, and a `Service` JSON-LD block (provider = NexusFlo24 Organization, serviceType = "AI SEO & Search Visibility").

## Styling

- All colors via semantic tokens (`bg-primary`, `text-accent`, `bg-surface`, `border-border`, `bg-card`) — no raw hex in JSX.
- Match the spacing rhythm of `SectorPage`: `py-20` sections, `container` wrapper, alternating `bg-surface` bands.
- Cards: `rounded-2xl border border-border bg-card p-6 shadow-sm` with hover lift, identical to existing pages.
- Smooth scroll via `element.scrollIntoView({ behavior: 'smooth' })` handlers (the project already uses this pattern in anchor links per memory).

## Technical notes

- Hero image generated at 1536×1024 JPG, imported as ES6 module.
- Form state via `useState`; zod schema validates client-side; toast on error using existing `useToast`.
- Component is one file (~600 lines) to match the convention of `SectorPage.tsx` consumers; no new shared primitives needed.
- Page is purely presentational + one form submit — no business logic changes elsewhere.

## Open question (please confirm before I build)

Where should the **lead audit form** submissions go? Options:

- **A.** Insert into a new `seo_audit_requests` table (Lovable Cloud) and trigger `notify-form-submission` so the team gets an email. Adds a migration.
- **B.** Reuse the existing `/contact` flow: POST to whatever the Contact page uses today (no new table, no migration).
- **C.** Fire-and-forget mailto: opens the user's mail client to `info@…` with the fields prefilled. Zero backend.

I'll default to **B** (reuse contact flow) if you don't specify, since it's the lightest and matches "do not add backend code unless asked".
