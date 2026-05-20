## Add "Solutions" dropdown to Header nav

Add a new "Solutions" item to the desktop and mobile navigation in `src/components/layout/Header.tsx`, linking to the three sector landing pages.

### Desktop
- Replace the current plain `<Link>` rendering loop with a hybrid: regular links for existing items, and a Radix dropdown (using the existing `@/components/ui/dropdown-menu`) for "Solutions".
- Trigger: "Solutions" button styled identically to the other nav links (same padding, font, hover, active color). Includes a small `ChevronDown` icon from `lucide-react`.
- Active state: highlight "Solutions" in gold (`text-accent`) when the current path is one of the three sector routes.
- Menu items (each a `<Link>` wrapped in `DropdownMenuItem asChild`):
  - **For Coaches & Creators** → `/coaches-creators`
  - **For Marketing Agencies** → `/marketing-agencies`
  - **For SMEs / Local Businesses** → `/small-business`
- Placement: insert "Solutions" right after "Features" in the nav order (Dashboard, Features, **Solutions**, Pricing, …).

### Mobile
- In the mobile menu, render "Solutions" as a non-link section header (muted, slightly smaller), followed by the three sector links indented (e.g. `pl-6`) so the hierarchy is obvious without needing a collapsible accordion.
- Each mobile link closes the menu on click (existing `setMobileOpen(false)` pattern).
- Active state on each sector link matches the existing pattern.

### Implementation notes
- Define a `solutionsLinks` array alongside `navLinks` so labels/paths live in one place.
- Reuse existing styling tokens — no new colors, no design-system changes.
- No changes to Footer, routing, or sector pages.

### Files
- Edit: `src/components/layout/Header.tsx`
