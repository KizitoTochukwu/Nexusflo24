## Goal
Remove the "Dashboard" link from the public marketing site header navigation to reduce duplication with the Log In button and avoid confusing non-logged-in visitors.

## Current state
- File: `src/components/layout/Header.tsx`
- The `navLinks` array at line 15 contains `{ label: "Dashboard", to: "/dashboard" }`.
- This header is rendered on all public marketing pages (/, /features, /pricing, /about, /contact, etc.).
- Logged-in users already access the dashboard via the app sidebar; non-logged-in visitors see a marketing nav item that redirects to login.

## Proposed change
1. Remove the `{ label: "Dashboard", to: "/dashboard" }` object from the `navLinks` array.
2. Verify the dropdown insertion logic (Solutions after /features, Resources after /pricing) still works correctly because /features remains the first link.
3. Confirm mobile menu and active-state styling still render without errors.

## Files to modify
- `src/components/layout/Header.tsx`

## Acceptance criteria
- The marketing header no longer shows a "Dashboard" nav link on desktop or mobile.
- The remaining nav items (Features, Solutions, Pricing, Resources, Referral, About, Contact) keep their current order and active states.
- No broken routing or TypeScript errors.

## Optional follow-up
If you prefer to keep a dashboard shortcut only for authenticated users, we can instead make the link conditional using `useAuth()` so it appears only when a session exists. Let me know if you want that variant.