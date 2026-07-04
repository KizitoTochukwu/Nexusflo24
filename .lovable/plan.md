## Goal

Send Facebook Meta Ads leads into your NexusFlo24 CRM via a Make.com scenario — no code changes required. Your platform already exposes a public lead-capture webhook that accepts JSON, dedupes by email/phone, and fires any matching automations.

## Webhook endpoint (paste into Make.com HTTP module)

- **Method:** `POST`
- **URL:**
  ```
  https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/capture-lead
  ```
- **Headers:**
  - `Content-Type: application/json`
  - `apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>` (the public anon key from your project — safe to embed)
- **No Authorisation / Bearer token required** (public capture endpoint, protected by workspace scoping).

## JSON body Make.com should send

Map Facebook Lead Ads fields into these keys:

```json
{
  "workspace_id": "95bc7e99-798e-49ef-a5c3-ab68bbc08950",
  "full_name": "{{full_name}}",
  "email": "{{email}}",
  "phone": "{{phone_number}}",
  "source": "Facebook Lead Ads",
  "tags": ["facebook-ads", "{{form_name}}"],
  "notes": "Ad: {{ad_name}} | Campaign: {{campaign_name}}",
  "meta": {
    "campaign_name": "{{campaign_name}}",
    "adset_name": "{{adset_name}}",
    "ad_name": "{{ad_name}}",
    "form_id": "{{form_id}}",
    "leadgen_id": "{{leadgen_id}}"
  },
  "utm": {
    "utm_source": "facebook",
    "utm_medium": "paid",
    "utm_campaign": "{{campaign_name}}"
  }
}
```

Required: `email` (valid format). `phone` must be international format (e.g. `+447517327597`) — the endpoint will normalize `07…` UK numbers automatically. `workspace_id` is **required** so leads land in your NexusFlo24 workspace (the ID above is your current workspace).

## Make.com scenario shape

```text
[Facebook Lead Ads: Watch Leads]
        │
        ▼
[HTTP: Make a request]  ── POST to capture-lead URL with JSON body above
        │
        ▼
[Router → error branch]  (optional: log 4xx/5xx to Google Sheet or email)
```

## What happens on the NexusFlo24 side

1. Lead is created (or matched by email → phone) in the CRM under your workspace.
2. Tags, source, notes, UTM, and Meta ad metadata are stored on the lead.
3. Any active automation with trigger `lead_captured` / `lead_added_to_folder` matching the tags fires — email / WhatsApp / SMS follow-ups run automatically.
4. Lead appears in `/dashboard/<workspace>/leads` in real time.

## No code changes

This plan is configuration-only. Nothing in the repo needs to change — I'll deliver the exact URL, headers, JSON template, and Make.com wiring notes when you approve. If you'd like me to also add a dedicated `?source=facebook-ads` shortcut, a signed webhook secret, or a pre-built Make.com blueprint file, tell me and I'll extend the plan.