

# Features Page Premium Redesign

## Single File Change
Rewrite `src/pages/Features.tsx` completely.

## New Page Structure

1. **Hero** — `bg-hero` gradient, badge, bold outcome headline ("Turn Visitors Into Revenue — Automatically"), subheadline, dual CTAs (gold + outline), `hero-dashboard.png` with perspective transform and glow shadow

2. **Category Overview** — 4 cards: Core Growth Engine, Multichannel Communication, AI Automation, Performance & Scale. Each with icon, title, 3-4 bullet features

3. **Spotlight Features** (6 sections, alternating white/surface bg) — Each has:
   - Outcome-driven headline (e.g., "Convert 3x More Leads on Autopilot")
   - Description + metric callout badge
   - Faux product UI mockup built with styled Tailwind divs (CRM contact cards, email editor preview, flow builder wireframe, analytics charts, funnel builder)
   - Features: AI Lead Gen, Smart CRM, Email+WhatsApp, Nurture Flow Builder, Funnel Builder, Analytics

4. **AI Powerhouse** — Dark `bg-hero` section, 4 gold-accented cards: AI Copywriter, AI Campaign Assistant, AI Lead Response, AI GPT Chatbot. Subtle gold border glow

5. **Integrations** — `bg-surface`, polished icon badges with hover effects, "Works with the tools you already love"

6. **Security** — 3-column cards: GDPR, Encryption, Uptime SLA

7. **CTA** — `bg-hero`, strong outcome headline, dual buttons

## Technical Notes
- No new dependencies — uses existing Tailwind classes, lucide-react icons, shadcn Button/Badge/Card
- Faux UI mockups use nested divs with borders, rounded corners, and realistic placeholder data
- Reuses `hero-dashboard.png` from `src/assets/`
- Maintains Layout wrapper (Header + Footer)
- Copy is outcome-driven throughout ("Save 10+ hours/week", "3x conversion rates")

