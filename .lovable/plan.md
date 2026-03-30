

## Fix: Logo Size Settings Not Applied in Sent Emails

**Problem**: The Template Settings panel lets you adjust logo `width`, `height`, and `autoHeight`, but the email layout (`email-layout.ts`) only reads `logo.size` (defaults to 56px) and uses it for both width and height. Your size changes are saved but completely ignored when the email is actually rendered.

### Changes

**File: `supabase/functions/_shared/email-layout.ts`**

1. Update the `TemplateOptions.logo` interface to include `width`, `height`, and `autoHeight` fields (matching what the UI saves)
2. Update the `wrapEmailTemplate` function to:
   - Read `logo.width` (fallback to `logo.size`, then 120)
   - If `autoHeight` is true (or height not set), use `height="auto"` on the img tag
   - Otherwise use `logo.height` (fallback to `logo.size`, then 56)
   - Remove the forced square aspect ratio (`width="${logo.size}" height="${logo.size}"`)
3. Also pass through the header bar color (currently ignored — the header color setting from the UI has no effect either)

**File: `supabase/functions/execute-automation/index.ts`** and **`supabase/functions/email-send/index.ts`**
- No changes needed — they already pass `ts?.logo` through, which includes the width/height fields. The fix is entirely in `email-layout.ts`.

**After code changes**: Redeploy edge functions (`email-send`, `execute-automation`) so the fix takes effect on sent emails.

### Result
- Logo width/height sliders in Template Settings will actually control the logo size in sent emails
- Auto-height toggle will work as expected
- Header bar color will render in the email

