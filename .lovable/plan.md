

# Fix WhatsApp Cloud API Configuration Error

## Problem
The `supabase/config.toml` file has a broken TOML structure. The `channel-settings-save`, `channel-settings-get`, and `execute-campaign` entries are either improperly indented or placed outside the `[functions]` block. This causes the gateway to reject requests to these functions, producing the "non-2xx status code" error.

Current broken structure (lines 54-59):
```toml
  [functions.execute-campaign]
  verify_jwt = false        # ← wrong indentation, not nested
[functions.channel-settings-save]  # ← outside [functions] block entirely
  verify_jwt = false
[functions.channel-settings-get]   # ← same issue
  verify_jwt = false
```

## Fix

**`supabase/config.toml`** — Fix indentation so all entries are properly nested under `[functions]`:

```toml
  [functions.execute-campaign]
    verify_jwt = false
  [functions.channel-settings-save]
    verify_jwt = false
  [functions.channel-settings-get]
    verify_jwt = false
```

All three entries need consistent 2-space indentation for `verify_jwt` and proper nesting under the `[functions]` parent block. No other code changes needed — the edge functions and UI component are correctly wired.

