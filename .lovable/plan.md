# CRM webhook URL and secret

## The two values to paste

**CRM_WEBHOOK_URL**

```text
https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/ingest-leads
```

**CRM_WEBHOOK_SECRET**

```text
2884a5b689923ed2ec23a4ce43e05e27cecd7b483532cec340aec9cf9dd7614f
```

Paste the same secret into whichever outside system will be sending leads in, so both sides match. Treat it like a password.

## What happens after you save them

Right now the lead intake endpoint accepts calls but does not check this shared secret, so saving the two values alone changes nothing. To make the secret actually protect the endpoint:

1. Read the incoming request's signature/secret header in the lead intake function.
2. Compare it against the stored `CRM_WEBHOOK_SECRET` using a constant-time comparison.
3. Reject anything that does not match with a 401, and log the rejection.
4. Keep the existing behaviour unchanged for calls that do match, so current lead capture keeps working.

## Notes

- No database changes.
- Only the lead intake function is touched, and only to add the secret check.
- If you would rather have a separate, dedicated CRM webhook endpoint instead of reusing lead intake, say so and I will plan that instead.
