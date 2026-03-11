

## Features Page Premium Redesign

### Current Problems
- Repetitive alternating 2-column layout for all 8 features — looks templated
- Generic icon-in-gray-box placeholders instead of product UI mockups
- Flat copy focused on tools, not outcomes
- No visual hierarchy — every feature gets equal weight
- Weak hero with no CTAs or product preview
- Plain text integration badges

### New Page Structure

```text
┌─────────────────────────────────────────────┐
│  HERO (bg-hero, navy gradient)              │
│  Badge · Headline · Subheadline             │
│  [Start Free Trial]  [Book a Demo]          │
│  Product UI screenshot (hero-dashboard.png) │
│  with glow/shadow effect                    │
├─────────────────────────────────────────────┤
│  CATEGORY OVERVIEW (white bg)               │
│  4 cards in grid:                           │
│  Core Growth · Multichannel · AI Auto ·     │
│  Performance & Scale                        │
├─────────────────────────────────────────────┤
│  SPOTLIGHT FEATURES (alternating bg)        │
│  6 large sections, each with:              │
│  - Outcome-driven headline + copy           │
│  - Stat/metric callout                      │
│  - Faux product UI mockup (styled divs      │
│    with realistic data, charts, inboxes)    │
│  Features: AI Lead Gen, Smart CRM,          │
│  Email+WhatsApp, Nurture Flow Builder,      │
│  Funnel Builder, Analytics                  │
├─────────────────────────────────────────────┤
│  AI POWERHOUSE (dark navy bg, gold accents) │
│  4 AI tools in premium card grid:           │
│  Copywriter · Campaign Assistant ·          │
│  Lead Response · GPT Chatbot                │
│  Subtle glow effects                        │
├─────────────────────────────────────────────┤
│  INTEGRATIONS (surface bg)                  │
│  Polished logo-style badges with icons      │
│  "Works with the tools you love"            │
├─────────────────────────────────────────────┤
│  SECURITY (white bg, 3-col cards)           │
│  GDPR · Encryption · Uptime                 │
├─────────────────────────────────────────────┤
│  CTA (bg-hero)                              │
│  Strong outcome headline + dual buttons     │
└─────────────────────────────────────────────┘
```

### Implementation Details

**Single file change**: Rewrite `src/pages/Features.tsx` entirely.

**Hero section**: Reuse `hero-dashboard.png` (already in assets) as the product preview with a perspective transform, border glow, and shadow. Dual CTAs: gold "Start Free Trial" + outline "Book a Demo".

**Category overview**: 4 cards with icon, title, short description. Categories group features logically (e.g., "Core Growth Engine" covers Lead Gen + CRM + Funnels).

**Spotlight features**: Replace generic placeholders with styled mock UI panels — e.g., a fake CRM contact card, an email editor preview, a flow builder wireframe, a chart dashboard. Built with Tailwind divs, not images. Each section gets outcome-driven copy like "Convert 3x more leads" instead of "AI Lead Gen Engine".

**Dark AI section**: `bg-hero` background with gold-accented cards. Each card has icon, title, description, and a subtle gold border glow.

**Integrations**: Use lucide icons where possible + styled badges with hover effects. Larger, more polished grid.

**No new dependencies needed** — all built with existing Tailwind classes, lucide icons, and components.

