## Goal
Replace the flip-card features grid on the homepage with the approved **Premium Navy** direction — a refined, editorial dark-navy card grid with hairline gold borders, a circular gold-outlined icon that fills on hover, and an uppercase tracked-wide gold pill CTA.

## Scope
Single edit to `src/pages/Index.tsx` (lines ~218–260), the `#features` section. The existing `features` array (icon, title, desc, slug) stays unchanged — we only restyle the grid markup.

## Changes

**Section wrapper**
- Switch background from `bg-slate-200` to white (matches the rest of the site).
- Keep the centered eyebrow/heading/intro block; tighten typography to match the premium feel.

**Card markup (replaces the flip-card)**
Each card becomes:
```
group bg-[#0B1F3B] rounded-xl border border-accent/15 p-8
hover:border-accent/50 hover:-translate-y-2
hover:shadow-[0_20px_40px_-15px_rgba(11,31,59,0.3)]
transition-all duration-500
flex flex-col items-center text-center
```
Contents:
- Circular icon badge: `w-14 h-14 rounded-full border border-accent/30 text-accent`, on hover `bg-accent text-primary`.
- Title: `text-white text-xl font-semibold tracking-tight`.
- Description: `text-slate-400 text-sm leading-relaxed flex-grow`.
- CTA pill `Link to={/features#${slug}}`: `bg-accent text-primary text-xs font-bold tracking-widest uppercase rounded-full px-6 py-2 hover:bg-white hover:scale-105`.

Removes the 3D flip interaction, "Hover to explore" hint, and the front/back duplicate markup.

**Tokens**
Use existing semantic tokens (`bg-primary`, `text-accent`, `border-accent/…`) rather than hex literals so the navy/gold brand stays centralized. No `index.css` or `tailwind.config.ts` changes needed — `accent` (gold) and `primary` (navy) already map correctly.

## Out of scope
No copy changes, no route changes, no changes to the `features` data array, no font swaps. Other sections untouched.
