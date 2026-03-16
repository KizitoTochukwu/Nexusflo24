

# Add "Learn More" Links to Feature Cards on Home Page

## What Changes

1. **Add slug identifiers to each feature** in the `features` array in `Index.tsx` so each card links to a unique anchor on the Features page.

2. **Add a "Learn More" button** to each feature card in the features grid (line ~151-163 of `Index.tsx`) — a subtle link-style button with an arrow, linking to `/features#slug`.

3. **Add corresponding `id` anchors** on the Features page (`Features.tsx`) so the browser scrolls to the relevant section when navigating from the home page.

## Implementation Details

- Each feature gets a `slug` field (e.g. `"ai-lead-gen"`, `"smart-crm"`, etc.)
- The card renders a `<Link to={/features#${f.slug}}>` with a "Learn more →" text button at the bottom
- On `Features.tsx`, add matching `id` attributes to the relevant sections so anchor scrolling works
- Use `scroll-mt-20` on target sections for proper offset with sticky headers

## Files Modified
- `src/pages/Index.tsx` — add slugs + Learn More buttons
- `src/pages/Features.tsx` — add `id` anchors to feature sections

