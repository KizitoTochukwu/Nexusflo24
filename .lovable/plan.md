

# Add "Learn More" to How It Works Cards + Create Premium Detail Pages

## What Changes

1. **Add slugs to the `steps` array** in `Index.tsx` and render a "Learn more →" link on each card, linking to `/how-it-works/capture`, `/how-it-works/nurture`, `/how-it-works/convert`.

2. **Create 3 premium detail pages** — one for each step — with rich, visually compelling content:
   - `src/pages/HowCapture.tsx` — AI Lead Capture deep-dive
   - `src/pages/HowNurture.tsx` — Nurture Flow deep-dive
   - `src/pages/HowConvert.tsx` — AI Conversion deep-dive

3. **Register routes** in `App.tsx` for `/how-it-works/:slug`.

## Page Design (each page follows same premium template)

Each page will include:
- **Hero section** with navy gradient background, step number badge, icon, title, and subtitle
- **Key benefits grid** — 3-4 benefit cards with icons and descriptions specific to the step
- **Feature spotlight** — a detailed section with a faux UI mockup (Tailwind-built, matching the brand) showing the feature in action
- **How it integrates** — short section explaining how this step connects to the other two
- **CTA banner** — "Start Free Trial" + "Book a Demo" buttons

All pages use the existing `Layout` component and follow the navy/gold/white brand palette.

## Files

| Action | File |
|--------|------|
| Modify | `src/pages/Index.tsx` — add slugs + Learn More links to step cards |
| Create | `src/pages/HowCapture.tsx` — Capture detail page |
| Create | `src/pages/HowNurture.tsx` — Nurture detail page |
| Create | `src/pages/HowConvert.tsx` — Convert detail page |
| Modify | `src/App.tsx` — add 3 routes |

