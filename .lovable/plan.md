# AfarHome – Talk to a Coordinator (simple automation)

One automation on the Automations page that handles every enquiry from the AfarHome form: acknowledge, assign, alert, follow up twice, then stop.

## What it does

**Trigger:** the AfarHome enquiry form is submitted.

**Straight away**
1. Contact created or updated (email match first, then phone) with all enquiry fields saved.
2. Opportunity created in the AfarHome Enquiries pipeline at stage New Enquiry, named "[Full name] – [Service]", with a short reference number shown on the record.
3. The full enquiry text saved to the contact timeline.
4. Tags applied: AfarHome, Website Enquiry, the chosen service, the chosen timeframe.
5. Enquiry assigned to Kizito (kizzyadichie@gmail.com) as coordinator.
6. Acknowledgement sent to the customer on their preferred contact method (email or WhatsApp; email is used if WhatsApp is not available or outside the 24-hour messaging window).
7. Internal notification to the assigned coordinator (in-app + email).
8. Task created: "Review and contact this enquiry within one working day", due next working day.

**Re-entry:** the same person can enter again on a genuinely new enquiry. A new opportunity is only created when the earlier one is closed or the new enquiry is for a different service; otherwise the existing opportunity is reused and the new enquiry is added to the timeline.

**Safeguarding branch (manual):** when a coordinator adds the tag `Safeguarding Priority` to a contact, the automation immediately reassigns to the safeguarding officer (Kizito), marks the opportunity high priority, sends email + dashboard + WhatsApp alerts that contain no sensitive detail (just the reference and a link), and creates an urgent task with a 2-hour deadline. All automated follow-ups for that enquiry pause.

**Follow-ups** (only if nobody has replied, booked, or been contacted)
- After 1 working day: first follow-up with the booking link.
- 2 days later: final follow-up, then the automation stops and the contact is tagged for long-term nurture.

**Stops immediately when** the customer replies on any channel, an appointment is booked, the opportunity reaches Assessment Required or later, the contact unsubscribes, the enquiry is closed, or communication consent is withdrawn. A coordinator can also mark contact made manually.

## Messages

The three messages use your wording exactly, with the customer's name, service, location, preferred channel, reference number and coordinator name filled in automatically. Booking link: `https://nexusflo24.com/book/afarhome-family-support-consultation-db8c7d`. Sender: AfarHome Coordination Team, support@afarhome.com. The acknowledgement keeps the line pointing people to local emergency services, and nothing in the flow presents AfarHome as an emergency service.

Only the acknowledgement and the two follow-ups are sent without marketing consent (they are service messages about the person's own enquiry). The long-term nurture tag only leads to further marketing if the marketing-consent box was ticked.

## The existing flow

The current 5-touch "AfarHome – New Enquiry Follow-Up" workflow is switched off and removed so nobody receives two sets of follow-ups.

## Technical notes

- New automation row (`automations` + `automation_steps`) with `trigger_type: form_submitted`, `trigger_config.form_id = f8894d39-98cb-49c8-8193-24b7a4489596`, executed by the existing `execute-automation` engine. No new engine.
- Re-use the shared `_shared/afarhomeIntake.ts` module for contact/custom fields/tags/opportunity. Extend its deal idempotency: reuse an open deal only when `service_interest` matches; otherwise create a new one. Add a short `reference_number` (e.g. AFH-7K2D9) stored on the deal.
- `execute-automation` gains four action types it currently lacks: `create_task` (writes `crm_tasks`), `add_note` (writes `crm_notes` + `crm_activities`), `update_deal_stage` / `set_deal_priority` (open deal for the contact in the AfarHome pipeline), and `send_preferred_channel` (reads the contact's `preferred_channel`, falls back to email on WhatsApp failure/window-closed).
- Safeguarding branch is a second automation on `trigger_type: lead_tagged`, `tag = Safeguarding Priority`, so it fires the moment a coordinator tags. Alert copy is reference-only, no enquiry detail.
- Exit criteria: existing `unsubscribed`, `appointment_booked`, `tag_added` plus two new criterion types — `deal_stage_reached` (Assessment Required or later / closed) and `consent_withdrawn` — added to `exitCriteria.ts` and honoured by the engine's exit check.
- Reply/manual-contact detection uses the engine's existing `has_replied` / `no_reply` condition over email, SMS and WhatsApp inbound, plus a `Contacted` tag a coordinator can apply.
- Migration only for `crm_deals.reference_number` (nullable text) and `priority` if absent; automation rows are seeded as data, not migration.
- Verify with a live test submission end to end, then delete the test records.
