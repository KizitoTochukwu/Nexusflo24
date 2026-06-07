## Plan

1. **Update the Meta signup request payload**
   - Include the current app origin as `redirectUri` when calling the `whatsapp-embedded-signup` backend function.
   - This ensures the backend can exchange Meta’s verification code using the exact same redirect URI used by the OAuth popup.

2. **Update the WhatsApp embedded signup backend**
   - Accept an optional `redirectUri` field.
   - Pass `redirect_uri` into Meta’s `/oauth/access_token` exchange when it is provided.
   - Keep the existing recovery flow for missing WABA/phone IDs.

3. **Validate the function behavior**
   - Redeploy the `whatsapp-embedded-signup` function.
   - Test that the old required-field error stays gone.
   - Confirm the backend now reaches Meta with the corrected code exchange parameters.

## Technical details

The visible error says:

```text
Error validating verification code. Please make sure your redirect_uri is identical to the one you used in the OAuth dialog request
```

That means Meta accepted the popup flow, but rejected the backend code exchange because `/oauth/access_token` did not include the same `redirect_uri`. The fix is to send `window.location.origin` from the frontend and include it in the backend token exchange request.