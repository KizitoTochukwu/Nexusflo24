## Goal
When you switch to another browser tab/window and come back to NexusFlo24, the page should look exactly as you left it — no spinner, no data refetch, no scroll jump, no remount.

## What's happening today
- Route memory (Phase 1) already restores the last URL on login/refresh and remembers scroll. That covers "close browser and come back".
- The tab-switch flicker is a different issue: `src/App.tsx` creates `new QueryClient()` with default options. React Query's defaults are:
  - `refetchOnWindowFocus: true`
  - `refetchOnReconnect: true`
  - `staleTime: 0` (every query is immediately stale)
  - So every time you re-focus the tab, every visible query refires → loading states flash, lists reset to page 1 in some views, drawers re-fetch, etc.
- A few hooks also force `refetchOnWindowFocus: true` (e.g. `useMessageCredits`).

## Fix (Phase 2 — keep tab state on return)

### 1. Tune the global QueryClient (`src/App.tsx`)
Replace `new QueryClient()` with sensible defaults so cached data is reused on refocus:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000,   // 5 min — data considered fresh
      gcTime: 30 * 60 * 1000,     // keep cache 30 min after unmount
      retry: 1,
    },
    mutations: { retry: 0 },
  },
});
```

### 2. Remove per-hook overrides that re-enable focus refetch
- `src/hooks/useMessageCredits.ts` — drop `refetchOnWindowFocus: true`; rely on the existing realtime subscription / mutation invalidations to update the credit balance. Keep `staleTime: 5000`.
- Scan the other `staleTime`-only hooks (`useSmsStatus`, `useEmailStatus`, `useSmartActions`, `useAdminRole`) — they already don't set focus refetch, so they'll inherit the new default. No change needed.

### 3. Verify route memory's scroll restore plays nicely
`useRouteMemory` only writes scroll on `beforeunload` / `pagehide`. Tab switches don't fire those, so scroll position is preserved naturally by the browser when no remount happens. With queries no longer refetching, no list will reset → scroll stays put.

### 4. Sanity checks (manual, after build)
- Open `/dashboard/<ws>/leads`, scroll down, switch tab for 10s, return → no spinner, same scroll, same filters.
- Open Messages > a thread, switch tab, return → conversation stays open, no flicker.
- Mutate a lead → list still updates (mutations explicitly call `invalidateQueries`, which bypasses `staleTime`).
- Realtime channels (messages, notifications) still push updates because they don't rely on focus refetch.

## Out of scope
- Persisting in-page UI state (open drawers, unsubmitted form input, pagination) across full page reloads — that's a bigger Phase 3 and not what's broken here.
- Changing route memory; Phase 1 already handles "leave the site and come back later".

## Files to touch
- `src/App.tsx` — QueryClient defaults
- `src/hooks/useMessageCredits.ts` — remove `refetchOnWindowFocus: true`

## Acceptance
- Switching tabs and coming back never triggers a visible loading state or layout reset on any dashboard page.
- Data still updates after explicit user actions (create/edit/delete) and via existing realtime subscriptions.
