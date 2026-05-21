## Current status vs. your requirements


| Requirement                         | Status           | Notes                                                                                        |
| ----------------------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| Save lead to CRM                    | ✅ Wired          | `capture-lead` inserts/dedups, assigns round-robin, routes to "Contact Form" folder          |
| **+10 lead score**                  | ✅ Already active | `capture-lead` sets `score: 10` on new leads                                                 |
| **Welcome email to lead**           | ✅ Already active | `notify-form-submission` sends branded Navy/Gold confirmation email via Resend               |
| **Notify internal team/admin**      | ✅ Already active | Email to `admin@nexusflo24.com` + WhatsApp to `+447517327597`                                |
| Folder-based automations            | ✅ Active         | "Contact Form" folder auto-created; fires any active `lead_added_to_folder` automation       |
| **Tag: `contact-lead**`             | ❌ Missing        | Today only `website-signup`, `contact-form`, `contact-{subject}`, `industry-…`, `interest-…` |
| **Tag: `demo-interest**`            | ❌ Missing        | Need to derive from "Interested in" = Demo Request                                           |
| **Tag: `support-request**`          | ❌ Missing        | Need to derive from "Interested in" = Support                                                |
| **WhatsApp follows up on the lead** | ❌ Missing        | Today WA only goes to admin, not to the submitter                                            |


## Plan to close the 2 gaps

### 1. Add the three required tags (frontend — `src/pages/Contact.tsx`)

Append to the existing `tags` + `lead_destination.apply_tags` arrays:

- Always add `contact-lead`
- If `form.interest === "Demo Request"` → add `demo-interest`
- If `form.interest === "Support"` → add `support-request`

This keeps the existing `industry-…` / `interest-…` slug tags AND gives you the canonical tags you listed. Any automation in the Automation Builder using trigger `lead_tagged` with tag `demo-interest` / `support-request` / `contact-lead` will fire automatically (folder trigger already fires too).

### 2. Send WhatsApp follow-up to the lead (when phone exists)

In `supabase/functions/notify-form-submission/index.ts`, add a new branch (mirrors the confirmation-email branch):

- Trigger when `body.send_lead_whatsapp === true` AND a valid lead phone is present.
- Call existing `whatsapp-send` edge function with the lead's phone and a short personalised message (e.g. "Hi {firstName}, thanks for contacting NexusFlo24! We've received your request and a specialist will reach out within 24h. — Team NexusFlo24").
- Respect the WA 24h-window rule already standardized in the project: if `whatsapp-send` returns `success:false + fallback:true`, log it and skip silently (don't send `hello_world`). Result recorded in `result.lead_whatsapp`.

Then in `Contact.tsx`, pass `lead_phone: form.phone` and `send_lead_whatsapp: true` in the `notify-form-submission` body (only when a phone was entered).

### Files touched

- `src/pages/Contact.tsx` — add 3 conditional tags + pass lead phone / `send_lead_whatsapp` flag.
- `supabase/functions/notify-form-submission/index.ts` — add lead-WhatsApp branch.
- Deploy `notify-form-submission`.

### Verification after build

- Submit the contact form with "Demo Request" + a phone → check `leads.tags` contains `contact-lead` + `demo-interest`, `score=10`, lead lands in "Contact Form" folder, confirmation email arrives, admin email + WA arrive, and lead receives WA (if within 24h window).
- Submit with "Support" + no phone → tags include `contact-lead` + `support-request`, no lead WA attempted.

### Note on automations

The platform fires automations automatically on:

- `lead_added_to_folder` ("Contact Form" — already wired)
- `lead_tagged` (specific tag) — so to wire "send welcome email + WA on demo interest" as a Builder automation, you create one in the Automation Builder with trigger `lead_tagged` = `demo-interest`. The tags this plan adds will make those triggers fire correctly.