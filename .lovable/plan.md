## NexusIntel — AI Company Intelligence (MVP inside NexusFlo24)

A new product surface at `/nexusintel` (public) plus a gated dashboard module that lives inside the existing NexusFlo24 workspace dashboard. Reuses existing auth, workspaces, RLS pattern, navy/gold design tokens, and shadcn components.

### Scope (MVP)

**Public**
- `/nexusintel` — landing page (hero, problem, solution, what we analyse, how it works, use cases, sample report preview, pricing, final CTA)
- `/nexusintel/sample` — static sample report

**Gated (under existing `/dashboard/:workspaceId/`)**
- `nexusintel` — Overview (usage, recent companies, quick action, integration status)
- `nexusintel/analyse` — Company analysis form + multi-stage loading animation
- `nexusintel/reports` — Reports library (search/filter)
- `nexusintel/reports/:id` — Full intelligence report (tabbed) with copy/save/export actions
- `nexusintel/companies` — CRM-style table with filters and status pipeline
- `nexusintel/companies/:id` — Company detail (notes, tasks, outreach history, status, score)
- `nexusintel/integrations` — Integration cards (placeholder configure modals)
- `nexusintel/usage` — Plan, usage, upgrade CTA
- Sidebar link "NexusIntel" added to existing `DashboardLayout`

### Data model (Supabase, RLS scoped by `workspace_id` to match existing tenancy)

Tables (all with workspace_id + user_id + RLS via `is_workspace_member`):
- `nexusintel_companies`
- `nexusintel_reports` (jsonb `report_json` + structured columns)
- `nexusintel_notes`
- `nexusintel_tasks`
- `nexusintel_outreach_history`
- `nexusintel_integrations`
- `nexusintel_activity_log`
- `nexusintel_usage` (monthly counter + plan limit per workspace)

GRANTs to `authenticated` + `service_role`. Standard `updated_at` trigger.

### AI report generation (MVP = deterministic mock)

`src/lib/nexusintel/generateReport.ts` — pure function producing realistic structured output from form inputs (company name, domain, industry, what to sell, depth, selected sections). Uses domain heuristics + templated reasoning so reports feel specific, not generic. Returns the full JSON shape that maps 1:1 to the report tabs.

Stub placeholders (typed, throw "not configured"):
- `fetchWebsiteContent`, `analyseWithOpenAI`, `detectTechStack`,
- `fetchGoogleAdsInsights`, `fetchMetaAdsInsights`, `fetchLinkedInAdsInsights`
- `exportToGoogleSheets`, `createGoogleDocReport`, `generatePDFReport`, `sendEmailDraft`, `pushToNexusFlo24CRM`

### Report page (tabs)
Summary · Identity · Business Model · Target Customer · Website Audit · Marketing · Sales Opportunity · Competitors · Tech Stack · Decision-Makers · Outreach (cold email / LinkedIn / WhatsApp / call script / discovery questions, each copyable) · Lead-gen Opps · Automation Opps · Recommended Offer · 5-step Follow-up · CRM Deal Score (radial + sub-scores) · Next Actions.

### Design
Reuses existing tokens (navy `#0B1F3B`, gold `#C9A227`). Rounded cards, soft shadows, score/status badges via existing shadcn Badge variants. No new color hex literals in components.

### Out of scope for MVP
- Real OpenAI / scraping calls (placeholders only, clearly labeled)
- Real PDF export (button shows "coming soon" toast)
- Stripe plan enforcement (uses existing subscription read-only for plan label; usage cap enforced via `nexusintel_usage` row)
- LinkedIn automation (explicitly not built)

### Technical notes
- Lives entirely under existing workspace routing — no new auth.
- Plan/limit: default 5 reports/month for free; checked in `analyse` submit before inserting.
- All mutations via supabase client with RLS; no edge functions required for MVP.
- New nav item gated behind workspace membership (already enforced by `WorkspaceGuard`).
