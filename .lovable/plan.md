# Premium About Page Redesign

Polish `/about` with the same Navy + Gold premium treatment used on the Contact page. Keep all copy, images, stats, timeline, leadership, and CTA links — only restructure layout and elevate visuals. No backend or data changes.

## Fixes (current issues)

- Several sections use `bg-slate-200` with `text-gray-50` (white text on light grey → unreadable). Replace with semantic tokens.
- Values cards have icon color identical to background (`text-accent` on `bg-accent`) — icons invisible. Title also stacked oddly with `bg-primary` chip styling.
- Stats section sets `text-primary-foreground` on outer container but cards use light bg → muted text becomes light-on-light.
- Timeline lacks visible spine and feels flat.

## Section-by-section direction

1. **Hero** — Same premium treatment as Contact: layered `bg-hero` + gold radial glow, faint grid overlay, staggered fade-up headline, eyebrow chip, trust microcopy row ("10k+ users · 40+ countries · GDPR-ready"). Slightly larger H1.

2. **Vision & Mission** — Move to clean `bg-background`. Cards get gradient navy→gold hairline border (1px wrapper), larger icon tile with `bg-gradient-gold` + `shadow-gold`, refined typography. Replace the "Where we're headed / What we do every day" labels with subtle uppercase eyebrows in `text-accent`.

3. **Values** — Rebuild as 4 premium cards on `bg-surface`: white card, gold gradient icon tile at top-left, hover lift, accent left-border on hover. Fix invisible icons and broken chip.

4. **CEO Message** — Keep 2/5 photo + 3/5 message split. Wrap card in gradient border, add a subtle quote-mark watermark (Lucide `Quote` at low opacity in corner), gold accent bar at top, signature gets a small gold underline.

5. **Stats & Culture** — Hero-style dark section using `bg-hero` with glow. Stat cards become glass cards (`bg-navy-light/40 backdrop-blur` + `border-accent/20`), gold numerals via `text-gradient-gold`. Culture cards: dark translucent variant with hover gold border.

6. **Timeline** — Vertical spine in `bg-gradient-to-b from-accent/60 to-accent/0`, year badges with `bg-gradient-gold shadow-gold`, event content as elevated cards with hover lift. Light `bg-background` section (not slate-200).

7. **Leadership** — Premium cards: larger avatar with gold ring (`ring-2 ring-accent/40 ring-offset-2`), name + role, optional LinkedIn-style ghost link placeholder removed (no new data). Subtle gradient hover.

8. **CTA band** — Keep `bg-hero`, add gold glow, upgrade button to `bg-gradient-gold` with arrow micro-interaction. Add a secondary ghost button "See Pricing" linking to `/pricing`.

## Technical notes

- Single file change: `src/pages/About.tsx`.
- Use only existing tokens: `primary`, `accent`, `muted-foreground`, `surface`, `card`, `navy-light`, `gold`, `gradient-hero`, `gradient-gold`, `shadow-card`, `shadow-card-hover`, `shadow-gold`, `text-gradient-gold`.
- Use existing animations: `animate-fade-up`, `animation-delay-200/400/600`, `hover:-translate-y-1 transition-all duration-300`.
- Remove all `bg-slate-200`, `text-gray-50`, and the broken Values color combos.
- Keep image paths, link targets, copy, and the 5-entry timeline as-is.
- No new packages, no index.css edits, no route changes.

## Out of scope

- New team members, new stats, new copy beyond microcopy additions in hero/CTA, parallax/scroll libs, video embeds.
