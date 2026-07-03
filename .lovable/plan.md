Update the hero section on the ROI Savings Calculator page (`src/pages/tools/RoiSavingsCalculator.tsx`) to be more compact, conversion-focused, and clearly tied to the tool.

### Changes

1. **Badge**
   - Replace `Free lead-magnet tool` with `Free ROI Savings Calculator`.

2. **Headline**
   - Replace current headline with: `Calculate the Revenue You're Losing From Missed Follow-Up`.
   - Apply a max-width of approximately `850px` so it wraps naturally across two balanced lines.
   - Remove the existing accent color span wrapper; keep the heading in the primary hero color.

3. **Supporting paragraph**
   - Replace current paragraph with: `Enter a few details about your leads, conversion rate and manual follow-up process to estimate your monthly and annual revenue opportunity.`
   - Apply a max-width of `720px`.

4. **Compact sizing**
   - Reduce vertical padding on the hero section (e.g., `py-14 md:py-18` or equivalent) to remove excessive empty space.
   - Keep CTA buttons and layout unchanged.

### Constraints preserved
- Page route remains `/tools/roi-savings-calculator`.
- Calculator logic, wizard, result card, submission flow, database, and edge functions are untouched.
- Navigation, footer, and overall NexusFlo24 branding remain unchanged.
- SEO metadata, JSON-LD FAQ schema, and other sections below the hero are untouched.

### File changed
- `src/pages/tools/RoiSavingsCalculator.tsx` (hero section only, lines ~259–292).