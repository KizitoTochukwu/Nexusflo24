## Goal

Create a ready-to-activate **draft** automation in your current workspace called **"New Subscriber Nurture (Email + WhatsApp + SMS)"** with all steps, copy, conditions, delays and lead-score actions pre-filled. You only need to open it, review the copy, and click Activate.

## What gets created

A single record in `automations` (status = `draft`) plus its `automation_steps` rows, scoped to your active workspace (`95bc7e99-798e-49ef-a5c3-ab68bbc08950`).

### Trigger
- **Lead added to folder** (any folder) — also fires on new leads imported via CSV / captured by forms once routed.

### Pre-filled steps

```text
1.  ACTION  Adjust Lead Score  +5            (welcome bump)
2.  ACTION  Send Email         "Welcome to Nexusflo24 — let's automate your growth"
3.  ACTION  Send WhatsApp      "Hey {{first_name}}, welcome to Nexusflo24 👋 ..."
4.  DELAY   1 day
5.  COND    Email opened? (last 1 day)
              ├─ YES → ACTION Adjust Score +10, ACTION Add tag "engaged"
              └─ NO  → ACTION Send SMS  "Hi {{first_name}}, did our welcome email land? ..."
6.  DELAY   2 days
7.  ACTION  Send Email         "3 ways creators use Nexusflo24 to 2× conversions"
8.  DELAY   2 days
9.  COND    Link clicked? (last 4 days, booking link)
              ├─ YES → ACTION Adjust Score +30, ACTION Notify Sales,
              │        ACTION Update Status → "Hot",
              │        ACTION Add tag "ai-closer-handoff"
              └─ NO  → continue
10. DELAY   2 days
11. ACTION  Send Email         "Limited offer: 20% off your first month"
12. DELAY   2 days
13. ACTION  Send WhatsApp      "Quick nudge {{first_name}} — offer ends soon ..."
14. DELAY   2 days
15. COND    Lead score > 40
              ├─ YES → ACTION Notify Sales "Warm lead worth a call"
              └─ NO  → ACTION Send Email "Should we say goodbye?" (break-up),
                       ACTION Adjust Score -10,
                       ACTION Add tag "cold"
```

### Exit criteria (auto-applied)
- Lead unsubscribes
- Lead purchases / marked Won
- Lead tagged `do-not-contact`

## Technical details

- Insert via `useCreateAutomation` programmatically from a one-off seed call, OR (preferred) add a small **"Seed: Subscriber Nurture"** button to `DashboardAutomations.tsx` header that runs the insert once. I'll go with the seed-button approach so it's reproducible and you can re-seed for other workspaces.
- Step `config` shapes match what `execute-automation/index.ts` already understands:
  - actions: `{ action: "send_email"|"send_whatsapp"|"send_sms"|"add_tag"|"adjust_score"|"update_status"|"notify_sales", subject, body/message, tag, score_delta, new_status }`
  - delays: `{ duration, unit: "days" }`
  - conditions: `{ condition: "email_opened"|"link_clicked"|"score_gt", operator, value, time_window_days, yes_action_index, no_action_index }`
- Status set to `draft` so nothing fires until you click Activate.
- Exit criteria written to `automations.exit_criteria` using existing `getDefaultExitCriteria` helpers + the three rules above.

## Files to touch
- `src/pages/dashboard/DashboardAutomations.tsx` — add a "Seed Nurture Template" button (visible only when no automation named "New Subscriber Nurture" exists).
- `src/lib/automations/seedNurtureTemplate.ts` *(new)* — exports the full step array + copy + the seeding function (calls `useCreateAutomation`).

No DB schema changes, no edge function changes — uses the existing automation engine.

## After approval

I'll implement the seed file + button, you click it once, then open the new draft automation in the drawer to review copy and hit **Activate**.
