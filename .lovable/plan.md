# Fix WhatsApp "Opening Meta…" hang

## Problem
Clicking **Connect WhatsApp via Meta** leaves the button stuck on "Opening Meta…" indefinitely. Root cause: the Facebook JS SDK fails to load or initialize (typically blocked by ad-blocker, tracking protection, Brave Shields, corporate network, or a stale script tag), and the current code has no timeout or error path — so the React Query mutation never resolves, the button spins forever, and no toast is shown.

Three real bugs in `src/lib/meta/fbSdk.ts` make this happen:
1. No timeout on SDK script load → hangs forever if `connect.facebook.net` is blocked.
2. The `existing` script branch `return`s without resolving the promise → second click hangs.
3. `fbAsyncInit` may never fire even if the script loads (privacy mode, third-party cookies disabled) → no rejection path.
4. Popup-blocker / silent `FB.login` failures aren't surfaced.

## Changes (frontend only)

**`src/lib/meta/fbSdk.ts`**
- Add a 15s timeout to `loadFbSdk`; reject with a clear, user-actionable message ("Facebook SDK was blocked. Disable ad-blocker / tracking protection for this site and try again.") if it doesn't initialize in time.
- Fix the `existing` script branch: instead of bare `return`, poll for `window.FB` and resolve/reject correctly so retries work.
- Reset `sdkPromise` to `null` on failure so the user can retry after disabling their blocker.
- Wrap `FB.login` in a safety timeout (90s) that rejects with "Meta popup didn't respond — it may have been blocked. Allow popups for this site and try again."
- Detect immediate popup-blocker by checking that `FB.login` actually opened a window (best-effort).

**`src/components/settings/WhatsAppConnectCard.tsx`**
- No structural change; existing `toast.error(err?.message)` will now surface the new clearer messages.
- Add a small helper text under the button: "If nothing happens, allow popups and disable ad-blockers for this page."

## Out of scope
- No edge-function or DB changes. Meta secrets are already configured.
- No change to the post-signup `whatsapp-embedded-signup` flow.

## How the user can verify
1. Click **Connect WhatsApp via Meta**.
2. If SDK is blocked → within ~15s a toast appears explaining to disable ad-blocker.
3. If popup is blocked → toast tells them to allow popups.
4. If everything works → the Meta dialog opens as before.
