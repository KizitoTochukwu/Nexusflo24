# Ads Hub — premium advertising module

A new workspace module that connects ad channels, tracks paid performance, attributes CRM revenue back to campaigns, and auto-follows-up on ad leads.

Sidebar gets a single **Ads** item between Campaigns and Automations, opening a unified Ads workspace with an internal tab bar — the same shell pattern already used by CRM and Bookings.

## Pages

Route base: `/dashboard/:workspaceId/ads`

| Tab | Route | Contents |
| --- | --- | --- |
| Overview | `ads/overview` | Date range (Today, 7d, 30d, This month, Custom), channel/account/status filters, 11 KPI cards with previous-period deltas, spend-by-channel and leads-by-channel charts, campaign performance table, best performers, campaigns needing attention, recent ad leads, attribution funnel (Impressions → Clicks → Leads → Qualified → Appointments → Won → Revenue) |
| Accounts | `ads/accounts` | Connection cards for Meta (FB+IG), Google Ads, LinkedIn Ads: status chip (Connected / Needs attention / Disconnected), business name, last sync, linked ad-account count, Connect/Manage and Sync now |
| Campaigns | `ads/campaigns` | Unified sortable table (all requested columns), search, filters, pagination, CSV export; row click opens detail view |
| Attribution | `ads/attribution` | Per-lead attribution table + model switcher (First touch, Last touch, Linear, Lead creation source) |
| Automations | `ads/automations` | Five prebuilt ad-lead templates, one-click install into the existing Automations engine |
| Settings | `ads/settings` | Default pipeline/owner for ad leads, UTM capture rules, qualified-lead definition, sync frequency, currency, admin-only access |

Campaign detail (`ads/campaigns/:campaignId`): trend charts, budget vs spend, ad sets/groups, creatives, audience summary, lead activity, attribution and revenue, Nexus AI recommended next actions, and action buttons (View on platform, Pause, Resume, Adjust budget, Duplicate). Until a channel is authorised, write actions render disabled with an "Available after channel authorisation" tooltip rather than faking API calls.

## Connection flow

Each platform gets a modal that explains the exact permissions requested, runs a secure OAuth redirect (no passwords ever collected), and shows loading / success / failure / reconnect states. After authorisation the user picks which ad accounts to import and which workspace pipeline receives imported ad leads. Tokens are written and read only server-side, encrypted at rest with the same AES-GCM pattern already used for channel credentials — nothing token-shaped reaches the browser.

Because live Meta/Google/LinkedIn app review is a separate step, phase 1 ships the full connection UI plus the server-side OAuth callback scaffolding; a channel stays in "Disconnected — authorisation pending" until its app credentials are supplied.

## Data model

New workspace-scoped tables, all with row-level security and grants: `ad_connections`, `ad_accounts`, `ad_campaigns`, `ad_ad_sets`, `ad_creatives`, `ad_metrics_daily`, `ad_lead_attribution`, `ad_sync_logs`, `ad_audience_syncs`.

Access rules: every member of a workspace can read advertising data; only workspace owners/admins can create, edit, or remove connections and accounts. Encrypted token columns are readable only by server-side functions, never by the browser.

`ad_lead_attribution` links each CRM lead to source, channel, campaign, ad set, creative, UTM source/medium/campaign, landing page, first and latest touch dates, cost per lead, and attributed revenue — populated from UTM parameters already captured on funnels, forms, and booking pages.

## Ad lead automations

The five templates (Meta lead form, LinkedIn Lead Gen, Google Ads lead form, high-intent paid lead, unqualified paid lead) are seeded as installable definitions built from the existing automation step vocabulary (create/update contact, add to pipeline, email, WhatsApp/SMS, notify owner, create task, escalate, nurture, tag). New enrollment triggers are added to the trigger catalogue: Ad lead captured, Campaign clicked, Landing page form submitted, Qualified lead created, Appointment booked, Deal won, Deal lost.

## Demo data

Ads Hub ships with realistic seeded demo campaigns, metrics, and attribution rows scoped to the workspace and clearly labelled as sample data, so the dashboard, tables, and charts look complete before any live integration exists. One click clears the samples.

## UI

Navy/gold premium SaaS styling consistent with CRM and Bookings: sticky tab bar, rounded cards, loading skeletons, empty states ("Connect your first ad account"), metric tooltips, sync-status and error banners, accessible contrast, fully responsive with a mobile section selector. Platform icons used only for identification — no imitation of the platforms' own dashboards.

## Technical notes

- Shell: `src/lib/ads/nav.ts` + `src/components/ads/AdsWorkspaceLayout.tsx` mirroring `CrmWorkspaceLayout`, wrapped in `DashboardLayout`, `max-w-[1400px]`.
- Routes nested under `ads` in `App.tsx` with an index redirect to `overview`.
- Hooks: `useAdConnections`, `useAdAccounts`, `useAdCampaigns`, `useAdMetrics`, `useAdAttribution`, `useAdSyncLogs` (React Query, workspace-scoped).
- Edge functions: `ads-oauth-start`, `ads-oauth-callback`, `ads-sync` (per-provider adapters writing `ad_metrics_daily` and `ad_sync_logs`), `ads-seed-demo`.
- Metric aggregation and previous-period comparison computed in a shared `src/lib/ads/metrics.ts`, charts via the existing Recharts setup.
- Module is gated for Pro and above through `usePlanGating`, with admin bypass.

## Build order

1. Migration for the nine tables, RLS, grants, demo seeding function.
2. Shell, routing, sidebar entry, hooks.
3. Overview dashboard with KPIs, charts, funnel.
4. Connected Accounts + OAuth scaffolding and modals.
5. Campaigns table and campaign detail view.
6. Lead Attribution page and attribution models.
7. Ad Lead Automations templates and new triggers.
8. Ad Settings, empty/loading/error polish, mobile pass.
