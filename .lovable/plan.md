# Unify Nexus AI with AI Sales Closer Brand Voice

Make the public website chatbot (`nexus-ai-chat`) speak with the same tone, product knowledge, and guardrails defined in **Settings → AI Sales Closer → Custom Instructions**, so leads get consistent messaging across the website widget and WhatsApp/Email/SMS replies.

## What changes

**Edge function: `supabase/functions/nexus-ai-chat/index.ts`**
- After resolving the workspace, load that workspace's row from `sales_closer_settings` (already used by `ai-sales-closer`).
- If `system_prompt` is set, prepend it to the existing Nexus AI base prompt so the brand voice / pricing / qualifying questions are applied — while keeping the website-only behaviors intact:
  - Lead capture tag `[LEAD_CAPTURED:...]`
  - Human handoff tag `[HUMAN_HANDOFF]`
  - Website navigation links (`/pricing`, `/features`, `/register`, `/contact`)
- If `system_prompt` is empty, fall back to the current default prompt (no behavior change).
- Respect `is_enabled` only as a soft signal — the public widget should always answer, but if `channels` doesn't include a "web" entry we still allow it (the widget is the marketing site, not a messaging channel). No gating added.

**No frontend changes.** `ChatbotWidget.tsx` already passes `workspaceId`, so the function can resolve the right settings.

**No DB changes.** `sales_closer_settings.system_prompt` already exists.

## Prompt composition order

```
[Sales Closer Custom Instructions] (if present)
---
[Nexus AI base prompt: site context, links, LEAD_CAPTURED + HUMAN_HANDOFF rules]
```

This way the user's brand voice / pricing / objection handlers take priority, but the website-specific lead-capture and handoff tagging logic still fires.

## Out of scope
- Changing the model (stays on `google/gemini-3-flash-preview`).
- Editing the AI Sales Closer settings UI.
- Touching the `ai-sales-closer` function.
