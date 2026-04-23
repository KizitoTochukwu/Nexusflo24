

## Upgrade "Add Condition" with grouped categories

### What changes
The "Add Condition" picker becomes a **grouped dropdown** organized by behaviour category, exposing 12 condition types. Selecting a condition reveals only the input field(s) it needs (text input, number, tag chip, or none for boolean checks). Each condition is wired to the automation engine so it actually evaluates against real lead data at runtime.

### Grouped condition catalog (in order)

```text
Identity / Data
  • Email is known            → no input  (lead.email present)
  • Phone is known            → no input  (lead.phone present)
  • Source equals             → text       (matches lead.source)
  • Tag contains              → text       (substring match in lead.tags)

Email behaviour
  • Email opened              → no input  (any open in email_logs)
  • Link clicked              → no input  (any click in lead_activities)

Funnel behaviour
  • Form submitted            → text (optional funnel slug, blank = any)
  • Checkout visited          → no input  (lead_activities type=checkout_visit)

Messaging behaviour
  • WhatsApp replied          → no input  (inbound WA in sales_conversations)

Lead scoring
  • Lead score greater than   → number     (lead.score > value)

Purchase / Conversion
  • Appointment booked        → no input  (any row in bookings)
  • Purchase happened         → no input  (lead_activities type=purchase)
```

### Files touched

1. **`src/hooks/useAutomations.ts`** — replace `CONDITION_OPTIONS` with a grouped structure:
   ```ts
   export const CONDITION_GROUPS = [
     { label: "Identity / Data", options: [
       { value: "email_known",  label: "Email is known",      input: "none" },
       { value: "phone_known",  label: "Phone is known",      input: "none" },
       { value: "source_equals",label: "Source equals",       input: "text" },
       { value: "tag_contains", label: "Tag contains",        input: "text" },
     ]},
     { label: "Email behaviour", options: [
       { value: "email_opened", label: "Email opened",        input: "none" },
       { value: "link_clicked", label: "Link clicked",        input: "none" },
     ]},
     { label: "Funnel behaviour", options: [
       { value: "form_submitted",   label: "Form submitted",   input: "text" },
       { value: "checkout_visited", label: "Checkout visited", input: "none" },
     ]},
     { label: "Messaging behaviour", options: [
       { value: "whatsapp_replied", label: "WhatsApp replied", input: "none" },
     ]},
     { label: "Lead scoring", options: [
       { value: "score_gt", label: "Lead score greater than", input: "number" },
     ]},
     { label: "Purchase / Conversion", options: [
       { value: "appointment_booked", label: "Appointment booked", input: "none" },
       { value: "purchase_happened",  label: "Purchase happened",  input: "none" },
     ]},
   ];
   ```
   Keep legacy `reply_status` handling untouched (used by the existing reply-stage router).

2. **`src/components/automations/AutomationStepEditor.tsx`** — condition block:
   - Replace the flat `<SelectItem>` list with `<SelectGroup>` + `<SelectLabel>` per category (shadcn already supports this).
   - Drive the secondary input from the selected option's `input` field: `text` → `<Input>`, `number` → `<Input type="number">`, `none` → render nothing.
   - Keep the existing "reply_status" branch (the two-row replied / no-reply selector) as-is.

3. **`supabase/functions/execute-automation/index.ts`** — extend the `case "condition":` switch (lines 296–347) with handlers for the new types:
   - `email_known` / `phone_known` → check `lead.email` / `lead.phone` truthiness.
   - `source_equals` → already exists, keep.
   - `tag_contains` → `lead.tags.some(t => t.toLowerCase().includes(value.toLowerCase()))`.
   - `email_opened` → `select count from email_logs where lead_id=… and status='opened'`.
   - `link_clicked` → `select count from lead_activities where lead_id=… and type='link_click'`.
   - `form_submitted` → `select count from lead_activities where type='form_submit'` (filter by `meta->>funnel_slug` if value provided).
   - `checkout_visited` → `select count from lead_activities where type='checkout_visit'`.
   - `whatsapp_replied` → `select count from sales_conversations where direction='inbound' and channel='whatsapp'`.
   - `score_gt` → already exists, keep.
   - `appointment_booked` → `select count from bookings where lead_id=…`.
   - `purchase_happened` → `select count from lead_activities where type='purchase'`.
   - When `passed` is false, the existing `skipRemaining = true` logic stops downstream steps (unchanged).

### Backward compatibility
Old saved automations using `has_tag`, `score_gt`, `source_equals`, `reply_status` continue to work — those condition values are preserved in the executor switch. Only the picker UI is reorganised; existing rows show their stored value as long as it matches one of the new options (the three legacy values listed all map 1:1 to the new catalog).

### Out of scope
- No DB migration (conditions read from existing tables: `leads`, `email_logs`, `lead_activities`, `sales_conversations`, `bookings`).
- No changes to triggers, actions, or delays.
- No changes to the workflow-builder (admin-only) — its `evaluateCondition` already covers similar logic separately.

### Verification after deploy
1. Open an automation → Add Condition → confirm the dropdown shows the six grouped categories with all 12 conditions.
2. Pick "Email is known" → no input field appears. Pick "Tag contains" → text field appears. Pick "Lead score greater than" → number field appears.
3. Save and trigger the automation on a test lead that satisfies the condition → automation continues. On a lead that fails → run is logged as `condition_failed` and downstream steps are skipped.

