## What's happening

Clicking **Follow-up** on a lead calls the `ai-sales-closer` backend function, which returns "Edge Function returned a non-2xx status code".

Verified from the edge request logs: both recent calls returned **401 Unauthorized** in under 120ms — the request is rejected by the function's own auth check before any AI work runs. The AI Sales Closer is enabled for this workspace (`is_enabled = true`, mode `auto_send`), so settings are not the problem.

## Root cause

In `supabase/functions/ai-sales-closer/index.ts` the auth check does:

```ts
const authedClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
  global: { headers: { Authorization: authHeader } },
});
const { data: claims } = await authedClient.auth.getClaims();  // no token passed
```

`getClaims()` with no argument reads the client's own stored session, which doesn't exist in a stateless function, so `claims?.sub` is undefined and the function returns 401. Every other function in this project passes the token explicitly (`getClaims(token)`) — this one is the outlier. It also depends on `SUPABASE_ANON_KEY`, which isn't a guaranteed env var here.

The same pattern exists in `generate-campaign-copy/index.ts` (line 26) and will fail the same way.

## Fix

1. **`ai-sales-closer`** — extract the bearer token and pass it: `await supabase.auth.getClaims(bearer)`, using the existing service-role client (as `integration-status`, `sms-send`, `whatsapp-send` all do). Keep the internal service-role bypass intact. Also log and return the specific claims error so future auth failures are visible.
2. **`generate-campaign-copy`** — apply the same one-line correction so the AI copy assistant doesn't hit the identical 401.
3. **Front-end error surfacing** — in `useGenerateFollowUp` / `useProcessInbound` (`src/hooks/useSalesCloser.ts`), read the function's JSON error body and show that message in the toast instead of the generic "Edge Function returned a non-2xx status code".
4. Redeploy both functions and re-test the Follow-up button on a lead.

## Technical details

- No database or schema changes.
- Files touched: `supabase/functions/ai-sales-closer/index.ts`, `supabase/functions/generate-campaign-copy/index.ts`, `src/hooks/useSalesCloser.ts`.
- Workspace membership enforcement (`is_workspace_member`) stays exactly as-is; only the token-reading step changes.
