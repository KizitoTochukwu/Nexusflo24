# CRM webhook spec — no code changes

## Decision

Keep the existing shared-secret header scheme on `ingest-leads`. No code, migration, or deployment changes.

## Exact spec for `sendLeadToCrm`

```text
POST https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/ingest-leads
Headers:
  Content-Type: application/json
  x-crm-webhook-secret: <CRM_WEBHOOK_SECRET>   (the 64-char hex secret already saved)
Body (JSON): at least one of email or phone; optional full_name, source,
             status, notes, tags[], score, meta, utm, event
```

- Phone should be E.164 (`+44...`).
- Optional `X-Workspace-Id` header; otherwise the owner's first workspace is used.
- Responses: `200 {ok, action, lead_id, workspace_id}`, `401` wrong secret, `400` validation, `409` duplicate.

## Optional follow-up (only if requested later)

- HMAC-SHA256 payload signing for replay/tamper protection.
- A dedicated `/crm-webhook` endpoint separate from lead intake.
