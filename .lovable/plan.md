
## Overview

Add three premium, sector-specific landing pages reusing NexusFlo24's existing Header/Footer, design tokens (navy + gold), and Seo component. Each page is standalone, mobile-responsive, conversion-focused, and routes to existing `/register` (Start Free Trial) and `/contact` (Book a Demo).

## New Routes

- `/coaches-creators` → `src/pages/sectors/CoachesCreators.tsx`
- `/marketing-agencies` → `src/pages/sectors/MarketingAgencies.tsx`
- `/small-business` → `src/pages/sectors/SmallBusiness.tsx`

Registered in `src/App.tsx` alongside other public routes.

## Shared Building Blocks (new)

To avoid duplication while keeping each page tailored, create a small set of reusable sector components in `src/components/sectors/`:

- `SectorHero.tsx` — headline, subheadline, dual CTA, sector image
- `PainPointsGrid.tsx` — icon + title + short text cards (5 items)
- `SolutionSection.tsx` — pain → solution mapping
- `FeatureShowcase.tsx` — feature cards with icons (lucide-react)
- `WorkflowDiagram.tsx` — horizontal step flow (numbered, navy/gold)
- `TestimonialStrip.tsx` — placeholder quote cards (3)
- `SectorFAQ.tsx` — accordion (shadcn `Accordion`)
- `FinalCTA.tsx` — navy band with gold accent + dual CTA
- `TrustStrip.tsx` — "Built for creators, agencies, and growing businesses"

Each page composes these blocks with its own copy/data object — no shared text.

## Per-Page Content

Each page imports a local `content.ts` object with: hero copy, 5 pain points, 5–6 features (with lucide icons), 5-step workflow, 4–6 FAQs, final CTA. Copy is fully tailored per the brief — no overlap.

## Visuals

Generate 3 hero images via imagegen (fast tier, 1536×1024 jpg) into `src/assets/sectors/`:
- `coaches-hero.jpg` — creator at desk recording / online coaching scene
- `agencies-hero.jpg` — marketing team collaborating around dashboards
- `smb-hero.jpg` — local business owner with phone/laptop

Imported as ES6 image modules.

## Design System Compliance

- White background (`bg-background`), navy primary (`text-primary`, `bg-primary`), gold accent via existing `--accent` / gold utility tokens already in `index.css` / `tailwind.config.ts`
- All colors via semantic tokens — no hardcoded hex
- Typography: existing Inter stack; large display headings, generous spacing (8px grid)
- Buttons: existing shadcn `Button` (default = navy; outline for secondary CTA)
- Mobile-first: stacked sections, responsive grids (`grid md:grid-cols-2 lg:grid-cols-3`)
- Single H1 per page, semantic `<section>` structure, alt text on images

## SEO

Each page uses `<Seo>` with unique title (<60 chars), description (<160 chars), canonical path, and `Service` JSON-LD targeting the audience.

## CTAs

- "Start Free Trial" → `/register`
- "Book a Demo" → `/contact`
Sticky visibility: hero CTA, mid-page CTA band, final CTA section.

## Out of Scope

- No backend/data changes
- No nav menu changes (pages reachable by direct URL / can be linked later)
- No A/B testing infra

## File Summary

New: 3 pages, 9 shared sector components, 3 content files, 3 hero images.
Edited: `src/App.tsx` (add 3 routes + imports).
