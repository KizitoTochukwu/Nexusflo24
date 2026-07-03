# Move ROI Savings Calculator into Public "Resources" Nav

The ROI Savings Calculator page (`/tools/roi-savings-calculator`) already exists and is public. This plan restructures the marketing site navigation so it's discoverable from the top nav under a new **Resources** dropdown, alongside **Academy** and **Blog**.

The admin submissions view (`/dashboard/:workspaceId/admin/roi-calculator-submissions`) stays exactly where it is — this is a public-nav change only.

## Changes

### 1. `src/components/layout/Header.tsx`
- Add a new `resourcesLinks` array:
  - Academy → `/academy`
  - Blog → `/blog`
  - ROI Savings Calculator → `/tools/roi-savings-calculator`
- Remove `Academy` and `Blog` from the flat `navLinks` array.
- Insert a **Resources** dropdown (same pattern as the existing "Solutions" dropdown) after `Pricing`.
- `resourcesActive` highlights the trigger when the current route matches any child.
- Mobile menu: render an inline "Resources" section with the three child links (mirroring how "Solutions" is rendered under Features today).

Resulting desktop order:
```
Dashboard · Features · Solutions ▾ · Pricing · Resources ▾ · Referral · About · Contact
```

### 2. `src/components/layout/Footer.tsx`
- Verify the existing ROI Savings Calculator footer link stays under a "Resources" column (add Academy + Blog there for consistency if not already grouped). Only reorganize labels — no route changes.

## Not changing
- No route changes in `src/App.tsx`.
- No changes to the calculator page, edge function, DB table, or admin submissions page.
- Sidebar (logged-in dashboard) untouched — the tool is a public marketing asset, not a dashboard feature.

## Technical notes
- Reuses the existing shadcn `DropdownMenu` already imported in `Header.tsx`, so no new dependencies.
- `linkClass` / `solutionsActive` pattern is duplicated 1:1 for `resourcesActive` — trivial and matches the file's current style.
