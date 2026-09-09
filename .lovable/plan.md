# Lead intake: workspace check and 500 diagnosis

## What I confirmed

- Workspace `95bc7e99-798e-49ef-a5c3-ab68bbc08950` exists: "Kizito Tochukwu's Workspace", created 20 Feb 2026.
- Its owner is the account `kizzyadichie@gmail.com` (user `afd12255-...`), who is also listed as `owner` in the workspace members table. A second account (`coataling@gmail.com`) is an admin there.
- The `CRM_WEBHOOK_SECRET`, `CRM_WEBHOOK_URL`, `LEADS_INGEST_TOKEN` and `OWNER_USER_ID` secrets are all present. Secret values cannot be read back, so I could not verify that `OWNER_USER_ID` equals `afd12255-...` — that is the one thing still unverified.
- No lead has been created by the external CRM: the newest lead in that workspace is from 6 Sep (Facebook Ad). Nothing from the webhook.
- The intake function's recent logs contain only boot/shutdown lines — no request or error entry for the failing call is retained, so the 500 cause is **not yet confirmed**.

## Likely causes of the 500 "internal error"

The function returns that generic message for any unhandled database error. Two candidates fit:

1. `OWNER_USER_ID` does not match a real auth user. Every new lead is written with `user_id = OWNER_USER_ID`, and that column has a foreign key to auth users — a stale or wrong id fails the insert and surfaces as a generic 500 rather than a clear message.
2. The workspace is being sent in the JSON body instead of the `X-Workspace-Id` header. The function only reads the header, so it silently falls back to "the owner's first workspace" — which, if `OWNER_USER_ID` has no membership row, ends in an error too.

## Proposed work (nothing built yet)

1. Verify `OWNER_USER_ID`: run one live authenticated test post against the endpoint and read the fresh function log to capture the real error text, then compare the configured owner id against the workspace owner. If it is stale, update the secret to `afd12255-...`.
2. Fix the workspace lookup in the intake function:
   - Accept the workspace from `X-Workspace-Id`, and also from a `workspace_id` field in the JSON body, so either style works.
   - Resolve the writing user from the target workspace's owner (via its members) instead of relying on `OWNER_USER_ID`, falling back to the secret only when no workspace was given.
   - Reject an unknown or non-member workspace with a clear 400 message naming the problem.
3. Replace generic 500s with specific messages for the known failure modes (unknown workspace, no owner resolvable, bad payload) so the CRM side gets an actionable response.
4. Re-test end to end with a throwaway lead, confirm it lands in workspace `95bc7e99-...`, then delete the test lead.

## Technical notes

- File: `supabase/functions/ingest-leads/index.ts`. No schema migration required; no changes to existing lead data.
- Auth scheme stays exactly as it is today (`x-crm-webhook-secret`, or the secret as a bearer token, or the legacy ingest token).
