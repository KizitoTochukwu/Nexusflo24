

# Direct Hero "Start Free Trial" to Signup Page

## Change

Replace the hero email-capture form on the Index page with a simple "Start Free Trial" button that links to `/register`, matching the behavior of all other "Start Free Trial" buttons across the site.

## Details

**File**: `src/pages/Index.tsx`

- Remove the `heroEmail` state, `useCaptureLead` hook, and `handleHeroSubmit` function
- Replace the `<form>` block (and the success message conditional) with a single `<Link to="/register">` wrapping the "Start Free Trial" button
- Keep the "Book a Demo" button as-is
- Remove unused imports (`Input`, `useState`, `Loader2`, `useCaptureLead`)

The bottom CTA, Header, Features, and Pricing pages already link to `/register` — no changes needed there.

