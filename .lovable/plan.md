Plan to fix the Settings return/reset issue

1. Preserve the active Settings tab in the URL
- Update the Settings page tabs from `defaultValue` to a controlled `value`.
- When a user clicks Channels, Sender Profiles, Tracking, etc., update the route to `/dashboard/:workspaceId/settings/channels` instead of leaving the URL at `/settings`.
- On refresh, browser return, or app remount, read the tab from the URL and reopen that same tab instead of defaulting to Profile.
- Add missing tab route values to the valid tab list, including `senders`, `buy-credits`, `wa-templates`, `meta-channel`, and `tracking`, so those tabs also survive refresh/remount.

2. Avoid unnecessary navigation loops
- Keep `/settings` as Profile by default only when no tab is specified.
- Keep non-admin `integrations` redirecting to `webhooks`, but do it through the controlled tab/URL logic.
- Do not add any browser-level reload behavior.

3. Protect Channel credentials from disruption during remounts
- Add lightweight session draft persistence for unsaved Channel Settings fields.
- Store only the form values the user is actively typing in the current browser session.
- Clear the draft for that channel after a successful save or disconnect.
- This keeps ongoing input from disappearing if the browser/app remounts while the user returns from another platform.

4. Finish removing old route restore behavior where it still exists
- Remove remaining `resolveRestoreTarget` usage from Login and Google auth callback redirects.
- After login/callback, continue sending users to workspace Overview instead of restoring stale deep pages.

5. Verify expected behavior
- From Settings → Channels, leave the app and return: it should stay on Channels, not Profile.
- Hard refresh on `/settings/channels`: it should reopen Channels.
- Unsaved channel inputs should still be present after an app remount in the same browser session.
- Login/callback should not restore a stale previous dashboard page.