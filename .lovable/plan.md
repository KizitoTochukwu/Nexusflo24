

## Fix Unsubscribe Flow — Encoding Issues and Reliability

**Problem**: The unsubscribe page renders garbled characters (`â€"` instead of `—`, `Â©` instead of `©`) because the Edge Function uses Unicode characters in template literals that get mangled during Deno's response encoding. The unsubscribe logic itself works (tags are added, activities logged), but the user experience is broken.

### Changes

**File: `supabase/functions/unsubscribe/index.ts`**

1. Replace all Unicode special characters with HTML entities in `renderPage`:
   - `©` → `&copy;`
   - `·` → `&middot;`
   - `—` (em dash in title) → `&mdash;`
2. This fixes the garbled text on the unsubscribe confirmation page

**Redeploy**: The `unsubscribe` Edge Function must be redeployed after the fix.

### What is already working correctly
- The unsubscribe URL is properly constructed with `lid` and `wid` params in both `email-send` and `execute-automation`
- The `email-layout.ts` correctly renders the unsubscribe link in the email footer
- The Edge Function correctly adds the `unsubscribed` tag and logs the activity
- Campaigns and automations already skip leads with the `unsubscribed` tag
- The `EmailTemplateSettings` UI lets users toggle and customize the unsubscribe text

No database or client-side changes needed — this is a single Edge Function fix.

