# AfarHome – New Enquiry Follow-Up

Build the full follow-up workflow: the enquiry form (in NexusFlo24 plus webhook intake for the existing AfarHome website), contact + opportunity creation, instant acknowledgement, team alert, and a 5-touch chase sequence.

## 1. Correct the CRM data seeded earlier

- Update the `service_interest` custom field to a dropdown with the real services: Home and welfare checks, Groceries and essential supplies, Property inspection and maintenance, Transportation and appointment assistance, Event and occasion support, Documentation or administrative assistance, Verified errands, Other family-support request.
- Update `service_urgency` to a dropdown: As soon as possible, Within 48 hours, Within 7 days, Within 30 days, I am still planning.
- Replace the guessed service/urgency tags in `crm_tags` with tags matching the real options. Tags for service and urgency are also applied dynamically from each submission, so new options never break the flow.

## 2. The form (both routes)

- **NexusFlo24 form**: create "AfarHome – Website Enquiry" in the Forms module for workspace `95bc7e99…`, mirroring the screenshot: Full name*, Email*, WhatsApp number*, Country of residence*, Service dropdown*, Nigerian location (town/city + state)*, Timeframe dropdown*, Request description (long text, with the "no passwords/banking/medical records" help text)*, Preferred contact method (Email / WhatsApp / Phone call)*, Privacy Policy consent checkbox*, marketing consent checkbox (optional). Submit button "Send My Enquiry". Each field maps to its contact field or custom field.
- **External site**: the existing AfarHome website form POSTs to the existing `ingest-leads` webhook with header `x-crm-webhook-secret`. We document the exact payload format for the site developer.

## 3. Intake handling (contact + opportunity)

Extend the intake path (shared by the hosted form and the webhook) so an AfarHome enquiry:

1. Creates/updates the contact via `crm_upsert_contact` (email match first, then phone). Stores WhatsApp number in the WhatsApp field too.
2. Writes the seven custom fields (country, service, location, urgency, enquiry details, preferred channel, enquiry date).
3. Applies tags: `AfarHome`, `Website Enquiry`, the submitted service, the submitted urgency (tags created on the fly if missing).
4. Sets lead source to "Website Enquiry" and records marketing consent per channel.
5. Creates the opportunity `[Full Name] – [Service]` in pipeline **AfarHome Enquiries**, stage **New Enquiry** — but only if that contact has no open deal in the pipeline (idempotent: re-submissions reuse the existing deal and log a note instead).

## 4. The workflow: "AfarHome – New Enquiry Follow-Up"

Trigger: new AfarHome enquiry (tag `Website Enquiry` applied / form submission event).

Steps:

1. **Instant acknowledgement** — email always, plus WhatsApp when a number was given (uses the approved-template path so the 24-hour window is respected). Content references their service, location and timeframe.
2. **Team alert** — email + in-app notification to the workspace owner(s) with the enquiry summary and a link to the contact.
3. **Follow-up sequence** — 5 touches over two weeks (Day 0, 1, 3, 7, 14) on email + WhatsApp, each with a book-a-call link.
4. **Exit conditions** (checked before every send): contact replied on any channel, a booking was made, the deal moved past New Enquiry/Contact Attempted, or the contact opted out / unsubscribed. On exit, stop the sequence.
5. **Stage automation**: when a reply is detected, move the deal to **Responded**; when the sequence ends with no response, move to **Nurture**-style handling via tag (stage left in place for the team).

Implementation: an `automations` row with `automation_steps`, executed by the existing `execute-automation` engine (delays, conditions, channel fallback and credit deduction all already handled). Replies are detected through the existing inbox/message-linking; opt-outs through the unsubscribe/suppression tables.

## 5. Message copy

Five emails + five WhatsApp messages written for AfarHome (acknowledgement, check-in, "how can we help", booking nudge, final close). Placeholder sender details marked clearly for you to edit before going live.

## Technical notes

- Workspace: `95bc7e99-798e-49ef-a5c3-ab68bbc08950`; pipeline "AfarHome Enquiries" already has the eight stages.
- Webhook: `https://<project>.supabase.co/functions/v1/ingest-leads`, secret header `x-crm-webhook-secret` — a payload spec for the AfarHome developer is included in the deliverable notes.
- WhatsApp sends respect the 24-hour window: outside it, an approved template is required; the acknowledgement uses the template path so first contact never silently fails.
- Every send deducts message credits through the existing atomic RPC; this workspace is unlimited so nothing is blocked.
- No new tables needed; one small extension to the intake edge function plus data rows (form, automation, steps, templates, field/tag corrections).

## Not included

Booking page creation for the "book a call" link (assumes an existing booking page or we point at a placeholder you later swap), and any changes to the external AfarHome website itself beyond the webhook payload spec.
