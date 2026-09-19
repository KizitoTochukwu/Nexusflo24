# Webinar Lead to Booking or Sale

Connect the registration form on webinar.nexusflo24.com to NexusFlo24, then run one follow-up sequence that drives either a booked audit call or a purchase of the WhatsApp Lead Follow-Up System.

## What already exists (checked in your live account)

- A secure intake endpoint the external site can post to, already used by the AfarHome site (secret + workspace header, spam and validation checks).
- A pipeline named **Whatsapp Lead Follow Up Webinar** with stages: New Lead, Contact Attempted, Engaged, Call Booked, Offer Sent, Customer Won, Nurture, Closed Lost.
- Contact fields for webinar registration, marketing consent and WhatsApp consent.
- The product **WhatsApp Lead Follow-Up System** in the Automation Store, with its own order and payment records.
- Bookings, email, WhatsApp, lead scoring, tasks, notifications, unsubscribe and suppression all working.
- An existing active automation **"Nigeria WhatsApp Sales Webinar — Registration to Follow-Up"** plus a draft **"Recorded Webinar Lead Follow-Up"**. These overlap with what you are asking for.

Missing and to be added: stages **Webinar Accessed**, **Qualified**, **Unqualified**; contact fields **business_type** and **whatsapp_enquiry_volume**; the webinar intake path itself; the reporting view.

## Open point to confirm during build

The two existing webinar automations would double-message the same people. Plan: switch both off and replace them with the new one. Say if you'd rather keep one.

## Stage 1 — Intake, CRM and instant webinar delivery

- Give you a ready-to-paste submission URL, secret and exact field list for the webinar site (written into a spec document, as we did for AfarHome).
- Server side: validate every field, reject bots and abusive rates, normalise Nigerian numbers to +234 format, match on email then phone, update the existing person rather than creating a second one, and never blank out a filled field.
- Record: first name, email, WhatsApp number, business name (as a company record, linked), business type, monthly enquiry volume, both consent answers with wording and timestamps, lead source Webinar, campaign, source URL, landing page, UTM values, first and latest source.
- Tags: `webinar-lead`, `whatsapp-followup-interest`, plus `marketing-consent` only when the optional box was ticked.
- Add the three missing pipeline stages, then open one opportunity per registrant at **New Webinar Lead**, reusing an open one on repeat submissions.
- Write a timeline entry with the full submission and attribution.
- Immediately: send the webinar access email, send the WhatsApp access message where allowed, return the recording link to the site, and notify the owner with the lead summary you specified.
- Repeat registration within 30 days updates the record but does not restart the sequence.

## Stage 2 — Follow-up sequence and behaviour branches

Built as one automation, **Webinar Lead to Booking or Sale**, using the existing automation builder so you can pause, edit, version and manually enrol people.

- Day 0 delivery, then 24h, 48h, day 3, day 5, day 7 messages using your exact copy, with the booking link and product link.
- Only people who ticked the optional marketing box receive the sales-oriented messages. Webinar-only registrants get webinar messages and nothing else.
- Sends held to 9am–6pm in the workspace timezone (West Africa Time unless yours is already set), with safe retries and permanent failures logged rather than retried forever.
- Volume segmentation (0–20 / 21–50 / 51–100 / 100+) drives lead score and a priority task for the owner on medium and high volumes.
- Branches: booking made → stop promotion, move to Call Booked, confirm and remind at 24h and 1h, mark Qualified on attendance, up to two reschedule messages on a no-show; purchase confirmed by the store payment record → stop all sales messages, Customer – Won, lifecycle Customer, `whatsapp-system-customer` tag, order details stored, confirmation and owner alert; reply on any channel → pause 48 hours, log it, notify owner, create a task due within an hour; clicks without conversion → score up, move to Engaged, staff task after two booking-page visits, one objection message after two product-page visits; unsubscribe or consent withdrawal → immediate stop, suppression updated, no automatic re-entry.
- Payment and form events are handled once only, so duplicates cannot create duplicate records.

## Stage 3 — Reporting

A performance view for this workflow showing only real data: submissions, new vs updated contacts, webinar deliveries, email delivery/open/click, WhatsApp delivery/read/reply, booking-page visits, calls booked and attended, product-page visits, purchases, revenue, lead-to-booking and lead-to-customer rates, unsubscribes and failed actions. Filterable by date, source, business type, enquiry volume, owner and stage.

## Technical notes

- New edge function `webinar-register` (public, secret-authenticated, CORS for the webinar domain) reusing `canonicalContact`, `phone`, `validation` and `triggerDispatch` shared modules; emits a `form_submitted` trigger event so the automation enrols through the existing matcher.
- Additive migrations only: new `crm_pipeline_stages` rows, two `crm_custom_field_defs` rows, a `webinar_registrations` dedupe/idempotency table (workspace-scoped, RLS, grants), and click/visit tracking reuse of `lead_activities` and `track-click`/`track-event`.
- Purchase detection extends the existing store order webhook handler (`store-notify` / payment webhook) with an idempotent conversion write keyed on order id; no new payment system.
- Booking detection reuses `book-appointment`, `cancel-booking`, `reschedule-booking` dispatch events.
- All reads and writes stay workspace-scoped behind existing RLS; secrets stay server-side.
- Tests: submission, deduplication, phone normalisation, consent gating, booking stop, purchase stop, reply pause, unsubscribe, and provider-failure paths.

## Still needed from you

- Confirm the owner who should receive staff notifications (defaults to the workspace owner).
- The WhatsApp access template must be approved by Meta before WhatsApp delivery can run; email works regardless.
