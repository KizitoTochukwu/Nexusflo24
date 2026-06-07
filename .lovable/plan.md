## Plan

Meta is rejecting the code exchange because `redirect_uri` in the token request doesn't match the one implicitly used by the FB.login popup. Fix by aligning both sides on `window.location.origin`.

1. **Frontend (`src/hooks/useWhatsAppConnection.ts`)**
   - Add `redirectUri: window.location.origin` to the body sent to `whatsapp-embedded-signup`.

2. **Backend (`supabase/functions/whatsapp-embedded-signup/index.ts`)**
   - Read optional `redirectUri` from request body.
   - Pass `redirect_uri: redirectUri ?? ""` into the `/oauth/access_token` query (instead of the hardcoded empty string).

3. **Deploy & verify**
   - Redeploy `whatsapp-embedded-signup`.
   - Retry Connect WhatsApp on the published URL; confirm the "Error validating verification code" message disappears and connection persists.

## Technical details

`FB.login({ response_type: "code", override_default_response_type: true })` uses the current page origin as the implicit redirect URI. Meta's `/oauth/access_token` requires the exact same value. Passing `""` only works in narrow cases; sending `window.location.origin` from the browser and forwarding it through guarantees a match across preview and published domains.
