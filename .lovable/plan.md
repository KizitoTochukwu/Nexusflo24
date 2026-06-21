## Root cause

The error "Error validating verification code. Please make sure your redirect_uri is identical to the one you used in the OAuth dialog request" comes from Meta's `/oauth/access_token` endpoint.

The current code calls `FB.login()` (Facebook JS SDK) with `response_type=code` and passes `redirect_uri: "https://nexusflo24.com/auth/callback"`. The backend then exchanges the code passing that same string as `redirect_uri`.

That URL is in the app's "Valid OAuth Redirect URIs" list, so on paper it should match. But the Facebook JS SDK does NOT actually navigate the popup to our app callback — for `FB.login()`, the code Meta issues is internally bound to the SDK's own `https://staticxx.facebook.com/x/connect/xd_arbiter/...` URL (or to an empty redirect_uri), regardless of what we pass in the options object. So when the backend exchanges the code with `redirect_uri=https://nexusflo24.com/auth/callback`, Meta sees a different URI than the one bound to the code and rejects the exchange.

This is the standard, well-known pitfall with WhatsApp Embedded Signup over `FB.login`. Meta's own Embedded Signup sample omits `redirect_uri` on both the JS SDK call and the server-side token exchange.

## Fix

Remove `redirect_uri` from both sides of the Embedded Signup flow. Keep `META_REDIRECT_URI` only as a marketing/return URL fallback; do not send it to Meta.

### 1. `src/lib/meta/fbSdk.ts`
- In `launchEmbeddedSignup`, drop the `redirect_uri` option from the `FB.login()` call. Keep `config_id`, `response_type: "code"`, `override_default_response_type: true`, `extras: { setup: {} }`.
- Stop requiring/validating `metaRedirectUri`; the SDK manages its own redirect.

### 2. `src/hooks/useWhatsAppConnection.ts`
- Remove the pre-popup origin check that throws when `window.location.origin !== new URL(META_REDIRECT_URI).origin`. The popup works from any allowed JS-SDK domain (preview, custom domain, etc.); origin-locking it to `nexusflo24.com` blocks legitimate connections from the preview and lovable.app domains.
- Stop passing `META_REDIRECT_URI` to `launchEmbeddedSignup` and to the backend payload. Keep the existing diagnostic logs but mark redirect_uri as "not sent".

### 3. `supabase/functions/whatsapp-embedded-signup/index.ts`
- Remove `redirect_uri` from the `body` requirement and from the Graph `/oauth/access_token` querystring. The exchange URL becomes:
  ```
  GRAPH/oauth/access_token?client_id=...&client_secret=...&code=...
  ```
- Drop the `redirectUri !== META_REDIRECT_URI` guard; it can no longer fire and was the cause of confusing 400s.
- Keep all downstream logic (debug_token, phone_numbers recovery, encrypted insert into `whatsapp_settings`) unchanged.

### 4. Deploy the edge function
Redeploy `whatsapp-embedded-signup` so the production exchange call stops sending `redirect_uri`.

## Meta Developer console — no changes required

The screenshot of `Valid OAuth Redirect URIs` is already correct (contains both `nexusflo24.com/auth/callback`, `www.nexusflo24.com/auth/callback`, the preview domain, and the lovable.app domain). Once the code stops sending `redirect_uri`, the mismatch error disappears regardless of which of those domains the user is on.

## Verification

1. Open `/dashboard/<workspaceId>/settings/channels` on the preview URL.
2. Pick Meta Cloud API → Connect WhatsApp via Meta.
3. Complete the Meta popup (Business → WABA → phone number).
4. Expect: green "WhatsApp connected" state and a row in `whatsapp_settings` for the workspace. The old red "Error validating verification code…" banner must not appear.
5. Confirm in edge function logs that `[Meta Embedded Signup] exchanging code` no longer includes a `redirect_uri` query param.
