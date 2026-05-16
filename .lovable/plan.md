# Premium Academy Page Redesign

Apply the same Navy + Gold premium treatment used on Contact and About. Keep all copy, course data, links (nas.io), images, and section ordering — restructure presentation only.

## Fixes (current issues)

- Hero container has stray `bg-slate-200` clamped inside the dark hero (white box mid-hero). Remove.
- Outline CTA uses `bg-primary-foreground text-primary` — looks like a solid button, breaks dark-hero contrast hierarchy.
- "Featured Courses" section sits on default light background with no visual separation from hero.
- Category & course cards feel flat (no gold accents, no lift, generic icon tiles).
- Testimonial cards lack visual hierarchy (no quote mark, no avatar/initial badge).

## Section direction

1. **Hero** — Layered `bg-hero` + gold radial glow + faint grid overlay (Contact/About pattern). Bigger H1, staggered `animate-fade-up`, refined gold eyebrow chip (replace emoji with `GraduationCap` icon). Trust microcopy row: "6 categories · 70+ lessons · 5k+ learners". Primary CTA uses `bg-gradient-gold`; secondary becomes ghost outline with subtle border.

2. **Categories** — Premium grid: rounded-2xl cards, gold gradient icon tile (`bg-gradient-gold shadow-gold`), hover lift + accent border, soft accent corner glow on hover. Show count as small pill badge.

3. **Featured Courses** — Section on `bg-surface` for separation. Cards: rounded-2xl, gradient border wrapper for premium courses (gold hairline), image overlay refined (gradient bottom for legibility of category eyebrow), Play icon in a gold circle on hover, badge moved to top-left with backdrop blur, footer row gets a thin divider above rating/students.

4. **Testimonials** — Cards on `bg-background` with subtle gradient border, large `Quote` icon watermark in corner, avatar circle with initial in `bg-gradient-gold shadow-gold`, stars row, name + role.

5. **CTA** — `bg-hero` with gold glow, gradient gold button with arrow micro-interaction, plus secondary ghost "Browse courses" link to the categories anchor. Add small reassurance line ("No credit card · Cancel anytime").

## Technical notes

- Single file change: `src/pages/Academy.tsx`.
- Use only existing semantic tokens (`primary`, `accent`, `muted-foreground`, `surface`, `card`, `navy-light`, `gold`, `gradient-hero`, `gradient-gold`, `shadow-card`, `shadow-card-hover`, `shadow-gold`, `text-gradient-gold`).
- Keep all course objects, categories, testimonials, ratings, and the `nas.io` outbound links unchanged.
- Keep `loading="lazy"` on course images.
- No new packages, no `index.css` changes, no route changes, no copy changes beyond the small hero trust line and CTA reassurance line.

## Out of scope

- New courses, real ratings/students data, course detail routes, search/filter UI, video player embed.
