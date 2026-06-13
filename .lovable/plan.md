## Diagnosis

The latest backend logs confirm the frontend and backend are both sending/expecting:

```text
https://nexusflo24.com/auth/callback
```

But Meta still returns:

```text
error_subcode: 36008
Error validating verification code. Please make sure your redirect_uri is identical to the one you used in the OAuth dialog request
```

That means the mismatch is no longer between NexusFlo24 frontend and backend. The likely issue is the Facebook JavaScript SDK `FB.login()` flow: Meta often binds the returned code to its internal SDK redirect URI:

```text
https://www.facebook.com/connect/login_success.html
```

So the backend is exchanging the code with the wrong `redirect_uri` value.

## Plan

1. **Patch the WhatsApp embedded signup backend exchange**
   - Keep the app-side canonical redirect as `https://nexusflo24.com/auth/callback` for domain checks and diagnostics.
   - Change the Meta token exchange request to use the JavaScript SDK redirect URI:

   ```text
   https://www.facebook.com/connect/login_success.html
   ```

   - Add clear logs that show:
     - redirect URI received from frontend
     - expected app redirect URI
     - redirect URI used for Meta code exchange

2. **Redeploy and test the affected backend function**
   - Deploy `whatsapp-embedded-signup` after the patch.
   - Keep `whatsapp-embedded-config` as-is unless the returned `appId/configId` proves wrong.

3. **Credential sanity check**
   - Confirm these three belong to the same Meta app:
     - `META_APP_ID`
     - `META_APP_SECRET`
     - `META_EMBEDDED_SIGNUP_CONFIG_ID = 945252895216570`
   - If they are from different Meta apps, the same Meta error can persist even after the redirect fix.

4. **Manual configuration checklist for you**
   - In Meta Developer settings for the same app:
     - App Domain: `nexusflo24.com`
     - Site URL: `https://nexusflo24.com`
     - Valid OAuth Redirect URI: `https://nexusflo24.com/auth/callback`
     - Facebook Login for Business / WhatsApp Embedded Signup config uses config ID `945252895216570`
   - In backend auth redirect allow-list:
     - `https://nexusflo24.com/auth/callback`
     - `https://nexusflo24.com`
     - `https://www.nexusflo24.com`

5. **Expected result**
   - The popup can finish.
   - The backend exchanges the code successfully.
   - The WhatsApp card changes from `Not connected` to connected with the selected phone number.