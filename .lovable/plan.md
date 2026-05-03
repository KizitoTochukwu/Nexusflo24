## Goal

Let automations modify a lead's score (e.g. +5, +10, +20, +30, or a custom delta). Surface it as both a normal action and as one-click smart actions on engagement-type conditions (Email opened, Link clicked, Pricing visited, Form submitted, WhatsApp replied, Appointment booked, Purchase happened).

## Changes

### 1. `src/hooks/useAutomations.ts`
- Add new entry to `ACTION_OPTIONS`:
  ```ts
  { value: "adjust_score", label: "Adjust Lead Score", icon: "TrendingUp" }
  ```
- Add `suggestedActions` entries to high-intent conditions in `CONDITION_GROUPS` so users see one-click chips like "+5 score", "+10 score", "+20 score", "+30 score" with `defaults: { score_delta: N }`. Apply to: `email_opened`, `link_clicked`, `pricing_visited`, `form_submitted`, `whatsapp_replied`, `appointment_booked`, `purchase_happened`.

### 2. `src/components/automations/AutomationStepEditor.tsx`
- Register icon: `adjust_score: <TrendingUp className="h-4 w-4" />` in `ACTION_ICONS`.
- In the action editor, when `step.config.action === "adjust_score"`, render a compact stepper:
  - Quick chips: `-10`, `-5`, `+5`, `+10`, `+20`, `+30` (set `score_delta`)
  - A `+ / -` numeric input (range -100 to +100, default `+5`) bound to `config.score_delta`.

### 3. `supabase/functions/execute-automation/index.ts`
- In the action switch (after `notify_sales`), add:
  ```ts
  } else if (actionType === "adjust_score") {
    const delta = parseInt(String(config.score_delta ?? config.delta ?? 0), 10) || 0;
    const newScore = Math.max(0, Number(lead.score || 0) + delta);
    await supabase.from("leads").update({ score: newScore }).eq("id", lead_id);
    details = { delta, newScore };
  }
  ```

## Out of scope
- No DB migration needed (`leads.score` already exists).
- No changes to the condition `Lead score` operator behavior.
