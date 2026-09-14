# Automation Template Library (20 ready-made automations)

Add a browsable library of 20 pre-built automations to the Automations page, so users can pick a proven flow instead of building from scratch.

## What the user gets

- A **Browse templates** button next to "Generate with AI" and "Create Automation".
- A full-screen template gallery with:
  - Search box and category filters: Lead follow-up, Nurture, Sales, Booking, E-commerce, Re-engagement, Ads, Admin.
  - Cards showing the template name, what it does, the trigger, channels used (Email / WhatsApp / SMS), and number of steps.
  - A preview panel listing every step in plain English before anything is created.
  - **Use this template** creates the automation as a **draft** in the current workspace and opens it for review, so nothing sends until the user activates it.
- Templates already installed show a "Already added" hint but can still be added again.

## The 20 templates

1. New lead instant welcome (Email + WhatsApp)
2. New subscriber nurture, 7 days multi-channel (existing seed, folded into the library)
3. Facebook lead ad follow-up (existing seed, folded in)
4. Form submission thank-you and qualify
5. Lead magnet delivery and upsell
6. Webinar registration reminders (24h, 1h, follow-up)
7. Appointment booked confirmation and reminders
8. No-show recovery and rebook
9. Hot lead alert to sales (score threshold)
10. Quote/proposal follow-up chase
11. Abandoned checkout recovery
12. New customer onboarding and welcome
13. Post-purchase review and referral request
14. Cold lead re-engagement win-back
15. Birthday / anniversary goodwill message
16. Newsletter subscriber onboarding
17. Free trial to paid conversion
18. WhatsApp reply fast-response routing
19. ROI calculator submission follow-up
20. Lead tagged VIP — white-glove handling

Each template uses only triggers, actions, conditions and delays the automation engine already supports, includes sensible exit criteria (purchase, unsubscribe, do-not-contact), and ships with editable copy using the usual `{{first_name}}` style placeholders.

## Technical notes

- New `src/lib/automations/templates/` module: one file per template exporting a definition of the same shape as `SUBSCRIBER_NURTURE_DEFINITION` (`name`, `description`, `trigger_type`, `trigger_config`, `exit_criteria`, `steps`), plus an `index.ts` exporting `AUTOMATION_TEMPLATES` with added metadata: `slug`, `category`, `channels`, `stepCount`.
- Reuse the existing seed definitions for the nurture and Meta lead-ad templates rather than duplicating them.
- New `src/components/automations/AutomationTemplateLibraryDialog.tsx`: search + category tabs, card grid, detail/preview pane, install button calling the existing `useCreateAutomation` with `{ workspace_id, ...definition }`; status forced to draft (current default), then toast and open the automation drawer via the existing `?edit=<id>` URL param.
- Step preview rendered from the step config using the existing `ACTION_OPTIONS` / `phraseCondition` helpers so the wording matches the editor.
- `DashboardAutomations.tsx`: replace the two one-off seed buttons with a single "Browse templates" button opening the dialog; keep AI generator and Create Automation unchanged.
- Styling follows the existing navy/gold tokens; no new colour values.
- No database or edge function changes — templates are code-defined and installed through the existing automations tables.
