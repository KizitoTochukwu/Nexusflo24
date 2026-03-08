

## Plan: AI Lead Qualification Engine

### What it does
Adds an AI-powered qualification feature that analyzes a lead's full engagement history (activities, score, source, recency) using Lovable AI and returns a structured qualification verdict with reasoning, recommended next action, and an AI confidence score. This goes beyond the existing rule-based scoring by understanding engagement *patterns* (e.g., "visited pricing page 3 times in 2 days then booked a call" = high purchase intent).

### Architecture

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Lead Details    │────▶│  qualify-lead         │────▶│  Lovable AI     │
│  Drawer (UI)    │     │  Edge Function        │     │  (Gemini Flash) │
│  "Qualify" btn  │◀────│  - fetches lead +     │◀────│  Tool calling   │
│  + AI card      │     │    activities from DB  │     │  structured out  │
└─────────────────┘     │  - sends to LLM       │     └─────────────────┘
                        │  - writes result to DB │
                        └──────────────────────┘
```

### Changes

**1. Database migration** — Add `ai_qualification` JSONB column to `leads` table
- Stores: `{ verdict, confidence, reasoning, recommended_action, qualified_at }`
- Nullable, no structural change to existing flows

**2. New edge function: `supabase/functions/qualify-lead/index.ts`**
- Accepts `{ lead_id, workspace_id }`
- Authenticates user via `supabase.auth.getUser()`
- Fetches lead record + last 50 activities from DB
- Sends engagement summary to Lovable AI (`google/gemini-3-flash-preview`) with tool calling for structured output
- Returns `{ verdict: "hot"|"warm"|"cold"|"not_qualified", confidence: 0-100, reasoning: string, recommended_action: string }`
- Writes result back to `leads.ai_qualification`
- Handles 429/402 errors gracefully

**3. Update `supabase/config.toml`** — Register `qualify-lead` with `verify_jwt = false`

**4. Frontend hook: `src/hooks/useQualifyLead.ts`**
- Mutation that calls `qualify-lead` edge function
- Invalidates lead queries on success

**5. Update `LeadDetailsDrawer.tsx`**
- Add "AI Qualify" button below the score section
- Show AI qualification card when result exists: verdict badge, confidence bar, reasoning text, recommended action
- Loading state while qualifying

**6. Update `DashboardLeads.tsx`**
- Show small AI verdict badge in the leads table next to score (if `ai_qualification` exists)

### Technical details
- Uses Lovable AI tool calling to extract structured JSON (verdict, confidence, reasoning, action)
- System prompt instructs the LLM to analyze engagement velocity, channel diversity, high-intent signals (pricing visits, call bookings), and recency
- AI qualification is on-demand (user clicks button), not automatic, to control AI credit usage
- Result is persisted so it doesn't need re-qualification unless user requests it

