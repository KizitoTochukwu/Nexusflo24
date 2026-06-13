## Update Meta Embedded Signup Config ID

Set the WhatsApp Embedded Signup Configuration ID to `945252895216570` so `FB.login()` initializes with the correct config.

### Change

**`supabase/functions/whatsapp-embedded-config/index.ts`** — currently has a broken expression where `configId` is hardcoded and the env fallback is a dead statement:

```ts
const configId = "945252895216570";
Deno.env.get("META_EMBEDDED_SIGNUP_CONFIG_ID") || "";
```

Replace with a single clean line that prefers the env secret (already set in Supabase) and falls back to the new ID:

```ts
const configId = Deno.env.get("META_EMBEDDED_SIGNUP_CONFIG_ID") || "945252895216570";
```

Then redeploy the `whatsapp-embedded-config` edge function so the frontend receives the new value.

### Note

The `META_EMBEDDED_SIGNUP_CONFIG_ID` secret already exists. If you also want that secret's value updated to `945252895216570` (so env wins), let me know and I'll update it; otherwise the hardcoded fallback covers it.

### Out of scope

No change to `META_REDIRECT_URI` or the redirect_uri mismatch issue — that still needs the Meta App console fix discussed earlier.