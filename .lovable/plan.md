# Conditions & Branching — audit and upgrade

## What I found

Looking at the two screenshots and the code behind them:

1. **An unset condition silently sends everyone down the "If NO" path.** A condition step with nothing chosen is treated as "false", so in your screenshots every enquiry would take the red branch — "Stop automation". Nothing in the builder warns you, and the automation can still be switched on.
2. **A condition row with a blank value behaves the same way** (e.g. "Tag" chosen but no tag typed) — it quietly fails instead of telling you it is incomplete.
3. **The condition menu is missing most of your CRM.** Today it only offers: email/phone known, source, tag, email opened, link clicked, form submitted, checkout visited, pricing visited, WhatsApp replied, lead score, appointment booked, purchase happened. There is nothing for replies on SMS or email, opportunity stage/pipeline/value, owner, consent or unsubscribe, lifecycle/status, the AfarHome contact fields (service, urgency, preferred channel, country, location, enquiry date), or "days since".
4. **Some conditions that already work in delivery are not in the menu at all** — "has replied" / "no reply" and exact "has tag" can run but cannot be chosen.
5. **The branching panel gives no preview.** You can't see at a glance which path a typical contact would take, and an empty custom branch just says "add steps below".

## What I will build

**Safety and clarity**
- Mark incomplete conditions in the builder: an amber warning on the step, plus a banner listing them, and block activating an automation with an unfinished condition.
- An unset or incomplete condition at run time no longer counts as "false": the step is recorded as "not configured", both branches are skipped and the automation continues to the next step rather than silently stopping people.
- Each condition row shows a plain-English sentence of what it checks, and the branching panel shows a one-line summary of the whole rule above the YES/NO rows.

**A much bigger condition catalogue** (grouped in the dropdown)
- Contact: status, lifecycle stage, owner assigned, country, service interest, service location, urgency, preferred channel, enquiry date, plus any custom field you add in CRM settings.
- Tags: has tag / does not have tag (exact), tag contains.
- Messaging: replied on any channel, replied on WhatsApp, on SMS, by email; email opened; link clicked; email bounced; unsubscribed; marketing consent given.
- Opportunity: stage, pipeline, status, priority, value (greater/less/between), has an open opportunity.
- Timing: days since created, days since last activity, days since last message.
- Existing behaviour and scoring conditions stay, unchanged.

**Better logic controls**
- Keep the AND/OR switch, make it explicit ("match all" / "match any") with the phrase updating live.
- Allow "otherwise" to be clearer: the NO row states where it goes (next step number, custom branch, or stop).
- Nested conditions inside a branch get an indent and a small "inside YES branch" label so deep flows stay readable.

**Delivery side**
- The automation runner gains matching support for every new condition, reusing the contact/opportunity/owner data it already loads for message variables, so the builder preview and real runs agree.
- Every condition evaluation keeps logging what it checked and why it passed or failed, visible in the execution timeline.

## Technical notes

- `src/hooks/useAutomations.ts`: extend `CONDITION_GROUPS` with the new groups/operators; add `requiresValue` metadata and an `isConditionRowComplete` / `validateConditionStep` helper; extend `phraseCondition`.
- `src/components/automations/AutomationStepEditor.tsx`: incompleteness badges, rule summary line, branch indentation, workspace-driven selects (stages, pipelines, tags, custom fields, members) via existing `useAutomationOptions` / `useCrmCustomFields` / `useDeals` hooks.
- Automation save/activate path (`DashboardAutomations.tsx` / `CreateAutomationDialog.tsx`): block activation on validation errors with a toast naming the step.
- `supabase/functions/execute-automation/index.ts`: in the `condition` case, add evaluators for the new types against the CRM context already fetched by `loadCrmExtras` (contact custom fields, latest open deal + stage/pipeline names, owner); treat unconfigured rows as `null` (skip branches, continue) rather than `false`.
- Unit tests for row completeness, phrasing, and the AND/OR evaluation; deploy `execute-automation` and check the build.

No existing automation changes behaviour except that previously-broken empty conditions stop dropping people into the NO path.
