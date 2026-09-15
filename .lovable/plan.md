# AfarHome CRM structure — readiness check

Short answer: yes, NexusFlo24 can hold everything in your list. Three things need setting up first, and one detail works slightly differently to how you described it.

## What already exists

- Contact records with: full name, email, phone, WhatsApp number, lead source, marketing consent (per channel: email, SMS, WhatsApp), tags, notes.
- Duplicate checking on contacts: email first, then phone.
- Opportunities (called Deals) with name, contact link, pipeline, stage, value, owner, source and tags.
- An "AFarHome Pipeline" already exists, with different stages: New, Contacted, Qualified, Consultation Booked, Requirement Received, Quotation Sent, Won, Nurture, Unqualified, Lost, Safeguarding Review.

## What needs adding

1. Seven custom contact fields (they have no built-in home):
   - Country of residence
   - Service required
   - Nigerian location
   - Required timeframe
   - Enquiry details
   - Preferred contact method
   - Enquiry date
2. Reshape the existing AFarHome pipeline to your eight stages, keeping any deals already in it:
   New Enquiry, Contact Attempted, Responded, Assessment Required, Quote Sent, Awaiting Payment, Confirmed Customer, Closed – Not Proceeding.
3. Tag list seeded with: AfarHome, Website Enquiry, plus one tag per service and one per urgency level.

## One difference to note

Duplicate checking uses email, then phone. The WhatsApp number is stored in its own field and is not used for matching — per your answer, that stays as is. If someone enters a WhatsApp number but no email, and their phone field is empty, they will come through as a new contact.

## Duplicate opportunities

Deals have no built-in "one per submission" rule. To stop repeats, the automation will look for an existing open AfarHome deal for that contact before creating one, and reuse it if found.

## Technical notes

- Custom fields: rows in `crm_custom_field_defs` with `record_type = 'contact'`, values stored in `crm_custom_field_values`.
- Pipeline: rename/insert rows in `crm_pipeline_stages` for the existing AFarHome `crm_pipelines` row; no deals are moved out of the pipeline.
- Contact matching is done by the `crm_upsert_contact` function (external id → email → phone).
- Opportunity idempotency: query `crm_deals` by `contact_id` + pipeline + open status before insert.

## Not included

No automation, messages, or follow-up sequence are built here — this covers only the CRM structure, as you asked.
