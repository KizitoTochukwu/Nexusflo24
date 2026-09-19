# Enrolment trigger: audit findings and upgrade

I inspected the trigger picker, the saved trigger data in your live database, and every place in the system that starts an automation or workflow. There are real gaps that can cause both misfires and silent non-firing. Below is what I confirmed, then what I propose to change.

## Confirmed problems

1. **Scope boxes accept free text, so scoped triggers silently never match.**
   The Scope section (Pipeline, Stage, Owner, Form, Tags…) is a plain text box. Two live automations are saved with a form *name* ("AfarHome – Talk to a Coordinator", "Recorded Webinar Access") where the system compares against the form's internal ID. Those triggers can never match.

2. **Some scope choices are never checked at all.**
   Pipeline, Stage, Owner, Lead source, Tags, Campaign, Calendar, Booking type and Funnel page/step are offered in the picker but no part of the engine reads them. A trigger narrowed to "Tags: Facebook Ad" (one live automation) fires for every lead — a genuine misfire.

3. **Website-webhook leads never start Automations.**
   Leads arriving through the intake webhook (the AfarHome website form) only start Workflows. Automations built on the Automations page with "New lead created" or "Form submitted" are never started by that route.

4. **Only one engine gets each event.**
   If any legacy automation matches an event, workflows with the same trigger are deliberately skipped. Two teams building on the two pages will see one of them never run.

5. **Non-scope settings break matching.**
   Anything saved into the trigger settings that is not a scope value (the AfarHome booking link, for example) is treated as an unmatched scope condition and can disqualify the automation entirely.

6. **Trigger names do not all line up.**
   "Any tag added" is stored as one name while the app fires another; contact created/updated and appointment booked events are fired by the app but are not offered in the picker at all.

7. **Events in the picker that nothing can send.**
   Email opened / link clicked, WhatsApp reply, SMS reply, campaign completed, webhook received, LinkedIn and Google lead forms, appointment cancelled/completed are selectable but no part of the system emits them today. Choosing one produces a trigger that never fires.

8. **Enrolment methods that do nothing.**
   "When filter criteria are met", "On a schedule", "When a webhook is received" and "Manual enrolment" can be selected and saved, but only "When an event occurs" is implemented.

9. **Re-enrolment gaps.** "Re-enroll when conditions become true again" behaves as "never". Re-enrolment rules are not applied on the Automations engine at all, only on Workflows.

10. **Additional filters can silently drop everyone.** The suggested property "name" does not exist on a lead record (it is the full name field), so a filter on it excludes every record. The "Run test" button also uses a different comparison set than the live engine, so a test can pass while the real run filters the record out.

11. **Record types that cannot enrol.** The picker lets you choose Deal, Booking, Payment, Subscription and Conversation, but enrolment only ever runs on lead records.

## What I propose to build

**A. Make scope real (fixes 1, 2, 5)**
- Replace every free-text scope box with a proper picker that loads the real records (forms, funnels, pipelines, stages, owners, tags, calendars, booking types, campaigns, stores, products), storing the ID plus a readable label.
- Migrate the existing saved text values to the matching record where a confident match exists; flag the rest as needing attention rather than leaving them silently broken.
- Enforce every scope value in both engines, so a scoped trigger only fires within its scope.
- Keep non-scope settings (like the booking link) out of scope matching.

**B. One reliable dispatch path (fixes 3, 4)**
- Route every lead intake path — website webhook, hosted/embedded forms, funnels, imports, bookings, commerce — through a single dispatcher that offers the event to both Automations and Workflows.
- Keep each (automation/workflow, record, event) pair to a single run using the existing duplicate guard, so nothing double-fires.

**C. Honest trigger catalogue (fixes 6, 7, 8, 11)**
- Align every trigger name with what the system actually emits, and add the missing ones (contact created, contact updated, appointment booked, any tag added).
- Mark events with no emitter as "Coming soon" and prevent saving them, instead of letting people build a trigger that can never fire.
- Do the same for enrolment methods: keep event-based active, label the others clearly, and implement "Manual enrolment" (enrol selected records from the CRM) since it is the most requested and cheapest to support.
- Restrict the record-type choice to what can actually enrol today.

**D. Re-enrolment and filters (fixes 9, 10)**
- Implement "conditions become true again" properly and apply re-enrolment rules on both engines.
- Use the real record field names in the filter builder, and make "Run test" evaluate with exactly the same logic as the live engine, showing which condition failed.

**E. Safety and visibility**
- Block activation when a trigger is incomplete or points at a deleted/renamed record, with a clear explanation.
- Add a "Recent trigger activity" panel on each automation showing fired / no match / filtered out / duplicate skipped, so a non-firing trigger is diagnosable without support.

## Technical notes

- Frontend: `src/lib/workflows/triggerCatalog.ts`, `EnrollmentTriggerDrawer.tsx`, `EnrollmentTriggerCard.tsx`, `FilterGroupBuilder.tsx`, plus new scope picker components and option hooks.
- Backend: `enroll-workflow-leads` (scope enforcement, re-enrolment modes, shared filter evaluation), a shared `_shared/triggerMatch.ts` used by both engines and by `test-workflow-trigger`, dispatch added to `ingest-leads`, and removal of the exclusive-dispatch switch in `src/lib/automations/fireTriggers.ts`.
- Data: one-off normalisation of existing `trigger_config` text values into `{id,label}` form; no rows deleted.
- Tests: scope matching, filter parity between test and runtime, re-enrolment modes, duplicate-event guard.
