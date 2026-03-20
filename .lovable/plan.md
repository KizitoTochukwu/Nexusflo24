

# Phase 4: Referral Program, Team Collaboration, Multi-Channel Inbox, Advanced Analytics

## Overview
Enhance the platform with a functional referral/affiliate system backed by database tracking, granular team permissions with invite flows, a unified multi-channel inbox (email + SMS + WhatsApp), and deeper analytics with cohort analysis and export capabilities.

---

## 1. Referral / Affiliate Program

**Current state**: A static Referral page exists at `/referral` with hardcoded stats (all zeros) and no database backing.

**Changes**:
- **Database**: Create `referrals` table (id, referrer_user_id, referred_user_id, referral_code, status [clicked/signed_up/converted], reward_credits, created_at). Create `referral_rewards` table for tracking payouts.
- **Edge Function** (`track-referral`): Called on registration when `?ref=` param is present. Links the new user to the referrer, updates status.
- **Stripe webhook update**: On first subscription payment, mark referral as "converted" and credit the referrer's `message_credits` balance.
- **Frontend**: Update `Referral.tsx` to fetch real stats from `referrals` table. Add a dashboard widget showing earnings and conversion funnel.
- **Registration flow**: Capture `ref` query param in `Register.tsx` and pass to backend on signup.

## 2. Team Collaboration & Permissions

**Current state**: `workspace_members` table exists with roles (owner, admin, member, viewer). No invite UI or granular permission enforcement.

**Changes**:
- **Database**: Create `workspace_invites` table (id, workspace_id, email, role, invited_by, status [pending/accepted/expired], token, expires_at).
- **Edge Function** (`send-workspace-invite`): Generates invite token, sends email via Resend, stores invite record.
- **Edge Function** (`accept-invite`): Validates token, creates `workspace_members` row, marks invite as accepted.
- **Settings UI**: Add "Team" tab in DashboardSettings with member list (role badges), invite form (email + role picker), and remove/change-role actions.
- **Permission enforcement**: Create `useWorkspaceRole` hook. Gate destructive actions (delete lead, manage settings) behind role checks. Show read-only UI for viewers.
- **Activity feed**: Add `workspace_activity` table and a lightweight feed component in the dashboard sidebar or a dedicated tab.

## 3. Multi-Channel Inbox

**Current state**: WhatsApp-only inbox at `/messages`. No email or SMS conversation view.

**Changes**:
- **Database**: Create `email_logs` table (mirroring `sms_logs` structure but for email: workspace_id, to_email, from_email, subject, body, status, provider_message_id, direction, created_at). Add `direction` column to existing `sms_logs` table.
- **Update send functions**: `email-send` and `sms-send` edge functions to log outbound messages into their respective tables.
- **Frontend**: Refactor `DashboardMessages.tsx` into a tabbed multi-channel inbox:
  - Channel tabs: All | WhatsApp | Email | SMS
  - Unified thread list showing conversations across channels, sorted by most recent
  - Compose/reply panel adapts to selected channel
  - AI-suggested reply button (calls `nexus-ai-chat` with conversation context)
- **Realtime**: Enable realtime on `email_logs` and `sms_logs` for live updates.

## 4. Advanced Analytics Dashboard

**Current state**: Analytics page has 5 tabs (Leads, Campaigns, Funnels, Revenue, Automations) with basic charts.

**Changes**:
- **Cohort analysis**: Add a "Cohorts" sub-tab under Leads showing retention matrix (leads grouped by signup week vs. activity weeks).
- **Revenue attribution**: Connect campaign → lead → subscription data to show which campaigns drive paying customers.
- **Funnel drop-off visualization**: Add a visual funnel diagram showing step-by-step conversion with percentage drop-off between steps.
- **Export**: Add CSV/PDF export buttons to each analytics tab. Use client-side CSV generation and a simple PDF layout via `jsPDF` or similar.
- **Comparative periods**: Add "vs. previous period" toggle showing delta percentages on stat cards.

---

## Technical Details

### Database Migrations (single migration file)
```text
-- referrals table
-- workspace_invites table  
-- email_logs table
-- workspace_activity table
-- Add direction column to sms_logs
-- RLS policies for all new tables (workspace-scoped)
-- Enable realtime on email_logs, sms_logs
```

### New Edge Functions
- `track-referral` (verify_jwt = false) — public endpoint for referral tracking
- `send-workspace-invite` — sends invite email, stores token
- `accept-invite` (verify_jwt = false) — public token validation

### New Frontend Files
- `src/components/settings/TeamTab.tsx` — member management UI
- `src/components/messages/ChannelTabs.tsx` — multi-channel inbox wrapper
- `src/components/messages/EmailThread.tsx` — email conversation view
- `src/components/messages/SmsThread.tsx` — SMS conversation view
- `src/components/messages/AiReplyButton.tsx` — AI-suggested reply
- `src/components/analytics/CohortMatrix.tsx` — retention cohort grid
- `src/components/analytics/FunnelDropoff.tsx` — visual funnel diagram
- `src/components/analytics/ExportButton.tsx` — CSV/PDF export
- `src/hooks/useWorkspaceRole.ts` — role-based permission hook
- `src/hooks/useReferrals.ts` — referral stats hook
- `src/hooks/useWorkspaceInvites.ts` — invite management hook

### Modified Files
- `src/pages/dashboard/DashboardMessages.tsx` — refactor to multi-channel
- `src/pages/dashboard/DashboardAnalytics.tsx` — add cohort, export, comparisons
- `src/pages/dashboard/DashboardSettings.tsx` — add Team tab
- `src/pages/Register.tsx` — capture ref param
- `src/pages/Referral.tsx` — connect to real data
- `supabase/functions/email-send/index.ts` — log outbound emails
- `supabase/functions/sms-send/index.ts` — log outbound SMS
- `supabase/functions/stripe-webhook/index.ts` — referral conversion logic
- `.lovable/plan.md` — document Phase 4

### Implementation Order
1. Database migration (all tables at once)
2. Referral system (tables already exist, wire up frontend + edge functions)
3. Team collaboration (invites, permissions, UI)
4. Multi-channel inbox (email/SMS logging, unified UI, AI replies)
5. Advanced analytics (cohorts, export, comparisons)

