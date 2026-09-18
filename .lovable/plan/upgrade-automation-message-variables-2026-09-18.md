# Upgrade automation message variables

## Goal
Make the automation editor show only useful, CRM-aware variables and ensure every displayed variable resolves consistently in previews, tests, email, SMS, WhatsApp, and internal notifications.

## Variable menu
Replace the current static list with clear groups:

- **Contact**
  - `{{contact.first_name}}`, `{{contact.last_name}}`, `{{contact.full_name}}`
  - `{{contact.email}}`, `{{contact.phone}}`, `{{contact.whatsapp_number}}`
  - `{{contact.company}}`, `{{contact.source}}`, `{{contact.status}}`, `{{contact.score}}`
  - `{{contact.service_interest}}`, `{{contact.service_urgency}}`, `{{contact.preferred_channel}}`
  - `{{contact.country_of_residence}}`, `{{contact.service_location}}`, `{{contact.enquiry_details}}`, `{{contact.enquiry_date}}`
- **Lead aliases**
  - `{{lead.full_name}}`, `{{lead.email}}`, `{{lead.phone}}`, `{{lead.source}}`, `{{lead.status}}`, `{{lead.score}}`
- **Opportunity / Deal**
  - `{{deal.name}}`, `{{deal.reference_number}}`, `{{deal.stage}}`, `{{deal.pipeline}}`
  - `{{deal.status}}`, `{{deal.priority}}`, `{{deal.amount}}`, `{{deal.currency}}`, `{{deal.expected_close_date}}`
  - Requested AfarHome-friendly aliases: `{{deal.service_required}}`, `{{deal.timeframe}}`, `{{deal.preferred_contact}}`, `{{deal.secure_url}}`
- **Assigned user**
  - `{{assigned_user.name}}`, `{{assigned_user.email}}`, `{{assigned_user.phone}}`
- **Useful links**
  - Booking, funnel, offer, webinar, checkout, and unsubscribe links

Remove the ROI calculator fields from this general automation menu, remove duplicate lead-score entries, and keep old flat variables such as `{{first_name}}` working for existing automations without advertising them as the preferred format.

## Data wiring
- Load the linked contact, its active custom fields, the relevant open opportunity, pipeline/stage names, and assigned user once per automation run.
- Map AfarHome aliases to the existing contact fields:
  - `deal.service_required` → Service required (`service_interest`)
  - `deal.timeframe` → Required timeframe (`service_urgency`)
  - `deal.preferred_contact` → Preferred contact method (`preferred_channel`)
- Generate `deal.secure_url` as an authenticated NexusFlo24 CRM link that selects the exact opportunity. Add URL-based deal selection to the existing Deals page so the link opens the correct record.
- Keep missing optional values safe: use a supplied fallback such as `{{contact.first_name|there}}`, otherwise render an empty value rather than exposing raw braces.

## Editor and delivery consistency
- Use one shared variable catalogue for the Insert menu, autocomplete, preview samples, and test sends.
- Add dotted-variable support to the browser-side preview engine so it matches live delivery.
- Apply the same resolved CRM context to message titles, subjects, bodies, email blocks, WhatsApp template mappings, and notification copy.
- Keep aliases for both `deal.*` and `opportunity.*`, plus legacy flat tokens, to avoid breaking saved automations.

## Verification
- Add tests for every requested variable and alias, fallback handling, unknown values, and messages beginning with a variable.
- Test the exact copy supplied in the request in preview and runtime interpolation.
- Verify the Insert menu contains the new groups, excludes irrelevant ROI variables, and inserts into the active field.
- Verify the secure opportunity link opens the intended record for an authenticated workspace member.
- Confirm the app build and automation delivery functions are clean before completion.
