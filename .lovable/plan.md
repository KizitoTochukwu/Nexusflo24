

I'll add an animated **"NexusFlo24 in Motion"** showcase section directly above the existing "Why We Created NexusFlo24" section on the homepage. Built in pure React + Tailwind + SVG — no extra dependencies, fully on-brand (Navy `#0B1F3B` + Gold `#C9A227`).

## What it looks like

A full-width section showing an **automation flow diagram** that animates continuously:

```text
                  ┌────────────┐
                  │  AI BRAIN  │   (pulsing gold core)
                  └──────┬─────┘
        ┌─────────┬──────┼──────┬─────────┐
        ▼         ▼      ▼      ▼         ▼
     [Lead]   [Email] [SMS] [WhatsApp] [Booking]
        │         │      │      │         │
        └─────────┴──────┼──────┴─────────┘
                         ▼
                    ┌─────────┐
                    │   SALE  │  (gold glow on arrival)
                    └─────────┘
```

**Animations (all CSS/SVG, no JS libraries):**
- 5 channel nodes orbit/pulse softly around a central "AI Brain" hub
- Animated gold particles travel along SVG paths from Lead → channels → AI → Sale (using `stroke-dasharray` + `animate`)
- Each node card has a soft hover lift, glow ring, and staggered fade-in on scroll
- Background: subtle navy radial gradient with floating gold dots (CSS keyframes)
- Headline kinetic reveal: "**See NexusFlo24 in Motion**" with gold accent on "Motion"
- Sub-stats row at bottom: `10K+ Leads Captured`, `2M+ Messages Sent`, `47% Avg. Conversion Lift` — count-up on viewport entry

## Files to change

1. **NEW** `src/components/home/AutomationFlowGraphic.tsx` — the animated SVG flow diagram (self-contained, ~200 lines)
2. **NEW** `src/components/home/MotionShowcaseSection.tsx` — section wrapper with headline, graphic, stats
3. **EDIT** `src/pages/Index.tsx` — import & render `<MotionShowcaseSection />` directly above the "Why We Created NexusFlo24" section (around line 229)
4. **EDIT** `tailwind.config.ts` — add 3 keyframes: `flow-particle`, `pulse-glow`, `orbit-soft` (uses existing navy/gold tokens, no new colors)

## Brand alignment

- Colors: `bg-hero` navy backdrop, `text-accent` gold for highlights, `bg-card` for nodes — matches existing homepage rhythm
- Spacing: `py-20 md:py-28` matches sibling sections
- Typography: same `text-3xl md:text-4xl font-bold` headline pattern
- Motion respects `prefers-reduced-motion` (animations pause)
- Lazy-rendered (IntersectionObserver) so it doesn't impact initial paint

## Out of scope

- Not embedding the uploaded MP4 (per your choice to recreate in code)
- No new dependencies — pure CSS keyframes + inline SVG
- No backend/DB changes

