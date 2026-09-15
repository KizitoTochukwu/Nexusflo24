# AfarHome enquiry form → NexusFlo24 webhook spec

The external AfarHome website form posts each enquiry to the NexusFlo24 intake endpoint. This is the exact contract the site developer should follow.

## Endpoint

```
POST https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/ingest-leads
```

## Headers

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `x-crm-webhook-secret` | the webhook secret (treat it like a password) |
| `X-Workspace-Id` | `95bc7e99-798e-49ef-a5c3-ab68bbc08950` |

## Body (JSON)

```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+447700900123",
  "source": "Website Enquiry",
  "tags": ["AfarHome", "Website Enquiry", "<service selected>", "<timeframe selected>"],
  "notes": "How can we help? (free text from the form)",
  "afarhome": true,
  "fields": {
    "country_of_residence": "United Kingdom",
    "service_interest": "Home and welfare checks",
    "service_location": "Lagos",
    "service_urgency": "Within 48 hours",
    "enquiry_details": "Mum needs someone to check in twice a week...",
    "preferred_channel": "WhatsApp",
    "marketing_consent": true
  }
}
```

### Field rules

- `email` is required. `phone` (the WhatsApp number) should be E.164 (`+234…`, `+44…`); it is stored on the contact but not used for duplicate matching — matching is email first, then phone.
- `tags`: always include `AfarHome` and `Website Enquiry`, then append the exact service and timeframe the visitor selected.
- `service_interest` must be one of: Home and welfare checks, Groceries and essential supplies, Property inspection and maintenance, Transportation and appointment assistance, Event and occasion support, Documentation or administrative assistance, Verified errands, Other family-support request.
- `service_urgency` must be one of: As soon as possible, Within 48 hours, Within 7 days, Within 30 days, I am still planning.
- `preferred_channel`: `Email`, `WhatsApp` or `Phone call`.
- `marketing_consent`: `true` only when the marketing consent box was ticked.

## What happens on receipt

1. Contact created or updated (email-first duplicate check), custom fields written, tags applied.
2. An opportunity named `[Full name] – [Service]` opens in the **AfarHome Enquiries** pipeline at **New Enquiry** (repeat enquiries reuse the existing open opportunity and add a note instead).
3. The **AfarHome – New Enquiry Follow-Up** workflow fires: instant email + WhatsApp acknowledgement, team alert, then day 1/3/7/14 follow-ups until the person replies, books a call, or opts out.

## Response

`200 { "success": true, "lead_id": "...", "duplicate": false }` — treat any non-200 as a failure and retry.
