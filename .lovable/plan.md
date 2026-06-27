## Plan: Premium-style Trust Logos Section

Redesign the "Trusted by teams using industry-leading tools" strip on the homepage to match the Premium Navy direction already applied to Features.

### Direction (Editorial Navy & Gold)
- White section background, gold uppercase eyebrow "Trusted by teams using industry-leading tools" with hairline gold divider beneath.
- Replace the boxy white logo chips with a continuous **navy (#0B1F3B) marquee** of logo tiles, each with a hairline gold border (`border-[#C9A227]/25`) that brightens to solid gold and lifts subtly on hover.
- Soft white-to-transparent edge fade masks on both sides for a premium continuous-scroll feel.
- Logos rendered in monochrome gold/white tone for consistency.
- Pause animation on hover; respects `prefers-reduced-motion`.

### Changes
- Edit the trust section in `src/pages/Index.tsx` (around line 192) — replace the current grid/chip markup with the new marquee block.
- Add a small `@keyframes marquee` rule in `src/index.css` (scoped class) for the scroll animation.
- Keep the existing logo list/imports; only restyle their presentation.

### Out of scope
- No changes to other sections, logos sourced, or routing.
