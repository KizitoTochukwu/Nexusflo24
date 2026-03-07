

## Plan: Browser Push Notifications

### Overview
Add browser push notifications so workspace owners get alerts (e.g. new lead captured) even when the dashboard tab is not focused or is in the background. Uses the native Notifications API — no service worker needed for basic functionality since we already poll for new notifications.

### Changes

**1. New hook: `src/hooks/usePushNotifications.ts`**
- `requestPermission()` — prompts the user for notification permission
- `sendBrowserNotification(title, body, onClick?)` — fires a native `new Notification()`
- Exports a `usePushNotifications` hook that:
  - Tracks `permission` state (`default` | `granted` | `denied`)
  - Provides `requestPermission` function
  - Provides `notify` function

**2. Update `src/hooks/useNotifications.ts`**
- Import `usePushNotifications`
- Add a new hook `useNotificationWatcher()` that:
  - Keeps a ref of the last-seen notification timestamp
  - On each 30s poll refetch, compares new unread notifications against the ref
  - For any truly new notifications, calls `notify(title, body)` to trigger a browser push
  - Only fires when `document.hidden === true` (tab not active) to avoid double-alerting

**3. Update `src/components/dashboard/NotificationBell.tsx`**
- Add a small "Enable notifications" prompt/button when permission is `default`
- When clicked, calls `requestPermission()`
- Shows a muted label if permission is `denied`

**4. Mount watcher in `src/components/dashboard/DashboardLayout.tsx`**
- Call `useNotificationWatcher()` so it runs while user is on any dashboard page

### No backend or database changes needed
The existing 30s polling of the `notifications` table drives the push. No service worker file is required — the Notifications API works directly from the page context and fires even when the tab is in the background (not focused), which covers the primary use case.

