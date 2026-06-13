## What's happening

The exact `redirect_uri` sent to Meta in the OAuth dialog is hardcoded in `supabase/functions/_shared/meta.ts`:

```
https://nexusflo24.com/
```

(note the trailing slash). It is sent in three places that must all agree:

1. **Frontend `FB.login(...)` call** — `src/lib/meta/fbSdk.ts` → `redirect_uri: "https://nexusflo24.com/"`
2. **Backend token exchange** — `supabase/functions/whatsapp-embedded-signup/index.ts` posts the same value to `graph.facebook.com/oauth/access_token` as `redirect_uri`
3. **Meta App console** — must list this exact string under *WhatsApp → Configuration → Embedded Signup* AND under *App settings → Basic → App Domains / Valid OAuth Redirect URIs* (Facebook Login for Business product)

Meta's error "Error validating verification code. Please make sure your redirect_uri is identical to the one you used in the OAuth dialog request" means the value sent at code-exchange time does NOT byte-for-byte match what's registered in the Meta App console for the **Embedded Signup configuration**.

## Most likely cause

Our code sends `https://nexusflo24.com/` (with trailing slash), but the Meta App's Embedded Signup config most likely has one of:
- `https://nexusflo24.com` (no slash)
- `https://www.nexusflo24.com/`
- the old `*.lovable.app` preview URL
- nothing at all under the Embedded Signup config

Meta does strict string comparison — even the trailing slash matters.

## Plan

### 1. Confirm the exact value being sent

I'll add a one-line log echo to the backend response so we can see the exact `redirect_uri` Meta rejected, then you open browser DevTools → Network → `whatsapp-embedded-signup` → Response to read it. (Already partially logged server-side, but currently invisible to you.)

Alternatively, before any code change, open DevTools → Network during a Connect attempt, find the call to `https://www.facebook.com/.../dialog/oauth?...` and copy the `redirect_uri=` query value. That is the literal string Meta is comparing against.

### 2. Fix the Meta App console (most likely the only fix you need — no code change)

In the Meta App used for NexusFlo24's Embedded Signup:

- **App Dashboard → WhatsApp → Configuration → Embedded Signup → Configurations** → open the config whose ID is returned by `whatsapp-embedded-signup-config` → set **Redirect URI** to exactly:
  ```
  https://nexusflo24.com/
  ```
  (trailing slash, no `www`, https).
- **Facebook Login for Business → Settings → Valid OAuth Redirect URIs** → add the same string.
- **App settings → Basic → App Domains** → add `nexusflo24.com`.
- Save and wait ~30s for propagation, then retry.

### 3. (Optional, only if you also want www and preview to work)

If you want both `nexusflo24.com` and `www.nexusflo24.com` to work, we'd need to:
- Register BOTH redirect URIs in Meta (with matching trailing slashes).
- Change `supabase/functions/_shared/meta.ts` to compute the redirect from `req.headers.get('origin')` instead of hardcoding, and validate against an allowlist.
- Redeploy `whatsapp-embedded-signup` and `whatsapp-embedded-config`.

I'd only do this if you confirm you want multiple domains supported. Otherwise step 2 alone fixes it.

### 4. Verify

After the Meta console save, click *Connect WhatsApp via Meta* again. Expected: popup completes, backend logs show `redirect_uri used in backend: https://nexusflo24.com/`, the connection row is written, and the WhatsApp card flips to *Connected*.

## What I need from you

Please confirm:
- (a) The exact `redirect_uri` value currently registered in your Meta App's Embedded Signup configuration (copy/paste it).
- (b) Whether NexusFlo24 should only support `https://nexusflo24.com/` (current behavior) or also `www` / preview / custom domains.

Then I'll either tell you the one-line fix in Meta console (no code change) or implement the dynamic redirect option.
