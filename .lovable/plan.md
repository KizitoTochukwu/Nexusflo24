

# Fix WhatsApp Channel Settings Edge Function Errors

## Problem
The `channel-settings-save` and `channel-settings-get` edge functions are not listed in `supabase/config.toml` with `verify_jwt = false`. This means the gateway enforces JWT verification before the request even reaches the function code. When the session token is stale or during edge cases, the request is rejected at the gateway level with a non-2xx error — before the function's own auth logic can run.

All other edge functions already have `verify_jwt = false` in config.toml and handle auth internally.

## Fix
Add both functions to `supabase/config.toml`:

**`supabase/config.toml`** — Add entries:
```toml
[functions.channel-settings-save]
  verify_jwt = false
[functions.channel-settings-get]
  verify_jwt = false
```

No other code changes needed — both functions already validate the user's auth token and workspace admin role internally.

