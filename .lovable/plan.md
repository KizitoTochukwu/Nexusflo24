## Problem

On `/dashboard/:workspaceId/automations`, opening an automation opens the editor inside `AutomationDetailsDrawer`. The drawer's open state is local React state (`selectedAutomation`, `drawerOpen`) in `DashboardAutomations.tsx`. When the user navigates to another page and returns, the component remounts, state resets, and the editor closes — so it feels like a "refresh back to the list".

## Fix

Drive the drawer from the URL instead of local state. Add a search param `?edit=<automationId>` (and optionally `step=<stepId>` if useful later). The Automations page reads it on mount and opens the matching automation; closing the drawer clears the param.

### Changes

1. **`src/pages/dashboard/DashboardAutomations.tsx`**
   - Replace `selectedAutomation` / `drawerOpen` `useState` with `useSearchParams`.
   - Derive `editId = searchParams.get("edit")`; find the automation from the loaded list.
   - `openDetails(a)` → `setSearchParams({ edit: a.id })` (preserves other params).
   - Drawer `onClose` → remove `edit` from params.
   - Render the drawer with `open={!!editId && !!found}` and `automation={found}`.
   - While automations are still loading but `editId` is set, keep the drawer mounted in a loading state (pass `automation={null}` + `open={true}` only once the list resolves to avoid flicker) — simplest: only open once `automations` has loaded and matches.

2. **`src/components/automations/AutomationDetailsDrawer.tsx`** (only if needed)
   - No structural changes expected; it already accepts `automation`, `open`, `onClose`.
   - If it currently holds internal "is dirty" state that resets on remount, leave as-is — the drawer itself doesn't remount when only the URL param changes, because the parent component now persists across the same route.

### Out of scope
- The deeper issue (parent route remounts when navigating away and back) is expected SPA behavior. Persisting via URL is the standard SaaS fix and also enables shareable/bookmarkable editor links.
- No changes to the workflow canvas auto-save logic.
- No backend changes.