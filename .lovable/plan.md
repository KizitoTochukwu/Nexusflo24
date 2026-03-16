

# Add Real-Time Dashboard Metrics Updates

## What Changes

When a tracking event arrives (email opened, link clicked, new lead), the dashboard metrics will automatically refresh without requiring a page reload.

## Approach

1. **Enable Realtime** on `campaign_messages` and `leads` tables via a database migration (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`).

2. **Add Realtime Subscriptions** in `useDashboardMetrics.ts`:
   - Subscribe to `postgres_changes` on `campaign_messages` (filtered by `workspace_id`) for `UPDATE` events (opened/clicked flags changing).
   - Subscribe to `postgres_changes` on `leads` (filtered by `workspace_id`) for `INSERT` events (new leads).
   - On any change, invalidate the `dashboard-metrics` query key via `useQueryClient().invalidateQueries()`, triggering a refetch.
   - Clean up subscriptions on unmount via `useEffect` return.

## Files

| Action | File | Change |
|--------|------|--------|
| Create | `supabase/migrations/..._enable_realtime_dashboard.sql` | Add `campaign_messages` and `leads` to `supabase_realtime` publication |
| Modify | `src/hooks/useDashboardMetrics.ts` | Add `useEffect` with Supabase realtime channel subscription that invalidates the query on changes |

## Technical Detail

The hook will create a single Supabase channel with two listeners. On any postgres change event, it calls `queryClient.invalidateQueries({ queryKey: ["dashboard-metrics", workspaceId] })`. The subscription is skipped when demo mode is enabled. The channel is removed on cleanup.

