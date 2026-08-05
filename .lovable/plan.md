# Nexus AI — Unified AI System

## Phase 1 — Audit results (verified in code this session)

| Capability | Status | Evidence |
| --- | --- | --- |
| AI email/campaign copy writer | Fully working | `generate-campaign-copy` function, used by `useCampaigns` |
| AI subject-line generator | Partially working | Only produced inside campaign copy; no standalone subject variants |
| AI sales assistant (Sales Closer) | Fully working | `ai-sales-closer` + `useSalesCloser`, CRM timeline |
| AI reply drafting in Messages | Partially working | `AiReplyButton` calls `nexus-ai-chat` (marketing chatbot prompt, no CRM context) |
| AI lead scoring / qualification | Partially working | `qualify-lead` returns a verdict; DB score is rule-based trigger. No factors, data-used, confidence, or last-calculated shown |
| AI workflow generator | Fully working | `generate-workflow` + `AiWorkflowGeneratorDialog` |
| AI automation generator | Fully working | `generate-automation` + `AiAutomationGeneratorDialog` |
| AI landing-page / funnel generator | Fully working | `generate-funnel`, used by funnel create + step editor |
| Global AI assistant (marketing site) | Fully working, but public-only | `nexus-ai-chat` + `ChatbotWidget` — visitor lead capture, not workspace-aware |
| AI blog writer | Missing | Blog Manager has no AI invoke |
| AI social-media writer | Missing | No function or UI |
| AI report / analytics summaries | Missing | `DashboardAnalytics` has no AI |
| AI conversation summaries | Missing | No function |
| AI next-action recommendations | Missing | Not present outside Sales Closer verdicts |
| AI campaign optimiser | Missing | No function |
| AI data-cleaning suggestions | Missing | Dedupe is deterministic only |
| In-app Nexus AI panel | Missing | No header assistant in the dashboard |
| Action safety / approval system | Missing | No proposed-action or audit tables |

No duplicates found among the working generators; they will all be preserved and re-pointed at the shared service rather than rewritten.

## Phase 2 — What gets built

### 1. Shared orchestration service
One Edge Function, `nexus-ai`, is the single AI entry point. It authenticates the caller, verifies workspace membership, loads only authorised workspace data, calls the AI gateway server-side, tracks usage, and returns a structured envelope:

```text
{ facts[], insights[], drafts[], proposedActions[], sources[], dataAsOf }
```

It exposes typed capabilities: `chat`, `email_draft`, `subject_lines`, `lead_score`, `next_actions`, `conversation_summary`, `report_summary`, `campaign_optimiser`, `blog_post`, `social_post`, `landing_page`, `data_cleaning`, `workflow_draft`.

Existing generators (`generate-workflow`, `generate-automation`, `generate-funnel`, `generate-campaign-copy`, `ai-sales-closer`, `qualify-lead`) are kept and refactored to share the same prompt/error/usage helpers in `supabase/functions/_shared/nexus-ai.ts` — no feature is rebuilt from scratch.

### 2. Database (new tables, RLS + grants, workspace-scoped)
- `ai_conversations` — per workspace/user thread, route + record context
- `ai_messages` — role, parts, structured payload, model, tokens
- `ai_feedback` — thumbs up/down per message
- `ai_proposed_actions` — type, target table/record, field diff, status (`suggested`, `awaiting_confirmation`, `confirmed`, `processing`, `completed`, `failed`, `cancelled`), editable payload
- `ai_action_audit` — executed actions, before/after snapshot, undo token
- `ai_lead_scores` — score, factors, data used, confidence, calculated_at (explainability layer on top of existing `leads.score`)
- `ai_usage` — per-workspace request/token accounting and rate-limit counters

### 3. Global Nexus AI panel
Persistent Nexus AI button in the dashboard header (`DashboardLayout`), opening a right-side sheet — desktop, tablet and mobile layouts. Includes chat, route-aware suggested prompts, context chips (current page, selected lead/campaign/conversation), conversation history, copy / regenerate / new chat, thumbs feedback, and loading / empty / success / error states. A small context provider records the active record on CRM, Campaigns, Messages, Funnels, Automations and Analytics pages.

### 4. Feature wiring (in place, no new pages)
- Campaigns / Messages / Automations: email draft + subject-line variants
- CRM contact record: explainable lead score card (score, factors, data used, confidence, last calculated) + next-action recommendations
- Automation Builder: existing generator, now via shared service
- Blog Manager: AI blog writer into the existing editor
- Campaigns / Content: social post writer
- Funnels: existing landing-page generator, plus "improve this page"
- Analytics + campaign reports: report summary and campaign optimiser (recommendation only)
- Messages + CRM timeline: conversation summary
- CRM imports / duplicates: data-cleaning suggestions

### 5. Action safety
Every write goes through propose → preview diff → edit → explicit confirm → execute → result → audit, with optional undo. No silent sends, launches, budget changes, record updates, merges, deletions or workflow activations. AI hard-delete is disabled; archive/soft-delete only.

### 6. Trust labels
Shared badge set: Confirmed platform data (with source + "data as of"), AI insight, AI draft, Suggested action, Awaiting confirmation, Completed action.

## Delivery order
1. Migration + shared service + usage/rate limits
2. Global panel with route/record awareness and history
3. Action safety pipeline and trust badges
4. Feature wiring, batch A: email/subject, lead score, next actions, conversation summary
5. Feature wiring, batch B: report summary, campaign optimiser, blog, social, landing page, data cleaning
6. End-to-end test pass against safe test records, then the final report (audit table, changes, secrets, results, limitations)

## Technical notes
- Model: `openai/gpt-5.6-sol` through the gateway Responses API, streamed; existing `LOVABLE_API_KEY` is already configured, so no new secrets are expected.
- All tables get explicit GRANTs plus workspace-scoped RLS using `is_workspace_member`.
- Frontend never sees provider keys; every call goes through the Edge Function with the user JWT.
- Graceful degradation when the AI service or credits are unavailable (429/402 surfaced as clear UI states).
