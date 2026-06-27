## Tighten Trust Section

Shrink the trust band on the homepage (`src/pages/Index.tsx`) across all three dimensions.

### Changes

1. **Section padding** — `py-14` → `py-8`; reduce header bottom margin `mb-8` → `mb-5`.
2. **Heading text**
   - Eyebrow "Trusted Integrations": `text-[11px]` → `text-[10px]`, tracking `0.28em` → `0.24em`.
   - Subtitle "Powering teams alongside industry-leading tools": `text-sm` → `text-xs`, `mt-2` → `mt-1.5`.
3. **Logo tiles**
   - Tile size: `h-20 w-40` → `h-14 w-28`, `rounded-2xl` → `rounded-xl`, `px-5` → `px-3`.
   - Logo height: `max-h-10` → `max-h-7`.
   - Gap between tiles: `gap-8` → `gap-5`.

### Out of scope
- No change to logos, marquee animation, fade masks, hover behavior, or surrounding sections.
