
## Problem

On mobile, opening `/dashboard/:workspaceId/overview` shows only the centered spinning loader from `WorkspaceGuard` and never resolves. Root cause is a combination of two issues:

1. **Loading state can get stuck.** `WorkspaceContext.fetchWorkspaces` has no `try/catch`. If the workspaces query fails (transient network hiccup, momentarily missing auth token on a mobile tab restore, RLS error), `setLoading(false)` is never reached, so `WorkspaceGuard` keeps rendering the spinner forever. There is also no timeout/fallback UI.
2. **The dashboard shell isn't mobile-aware.** `DashboardLayout` always renders a `fixed` 224 px sidebar and pushes main content with `ml-56`, with no drawer, no overlay close, no responsive breakpoint. Even once the spinner clears, the sidebar covers most of the 390 px viewport and taps hit sidebar links, which is what the user is describing as "keeps rotating when clicked" (each nav tap triggers a route change → guard spinner → stuck again).

## Fix

### 1. Make workspace loading resilient (`src/contexts/WorkspaceContext.tsx`)

- Wrap `fetchWorkspaces` in `try/catch/finally` so `setLoading(false)` always runs.
- On error, log and leave `workspaces = []` so `WorkspaceGuard` can render its "Setting up your workspace…" empty state instead of an infinite spinner.
- Expose the last error via context so the guard can surface a retry.

### 2. Add a stuck-loading fallback (`src/components/auth/WorkspaceGuard.tsx`)

- After ~6 seconds of `authLoading || wsLoading`, replace the bare spinner with a small card: "Still loading your workspace…" + **Retry** (calls `refreshWorkspaces`) + **Sign out** buttons. Prevents the dead-end mobile screen.

### 3. Make `DashboardLayout` mobile-responsive (`src/components/dashboard/DashboardLayout.tsx`)

- Detect mobile via `useIsMobile()` (already in the project).
- Mobile behavior:
  - Sidebar defaults to **closed**, renders as an off-canvas drawer (`fixed inset-y-0 left-0 w-72 -translate-x-full` / `translate-x-0` when open) with a dark backdrop that closes on tap.
  - Add a hamburger `SidebarTrigger` button on the left of the top bar (visible only on mobile).
  - Main content uses `ml-0` on mobile, current `ml-56 / ml-14` on desktop.
  - Auto-close the drawer when the route changes (`useEffect` on `location.pathname`).
- Desktop behavior unchanged (fixed rail, collapse toggle).
- Ensure the sidebar has `z-50` and backdrop `z-40` so it sits above the Nexus AI chat button and top bar.

### 4. Sanity pass

- Verify `p-6 lg:p-8` on the content wrapper still looks correct on 390 px width; tighten to `p-4 sm:p-6 lg:p-8`.
- Keep sign-out/credit widget accessible inside the mobile drawer (no layout change needed — they already live in the sidebar).

## Out of scope

- No changes to auth flow, routing, or `Dashboard.tsx` metrics logic.
- No visual redesign of individual dashboard cards.

## Verification

- Preview at 390 × 844: spinner resolves, drawer closed by default, hamburger opens it, tapping a link navigates and closes the drawer, no infinite spinner on route change.
- Force a failed workspaces fetch (offline) → fallback card with Retry appears instead of a perpetual spinner.
- Desktop layout unchanged.
