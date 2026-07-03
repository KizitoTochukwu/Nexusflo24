# ROI Savings Calculator — Build Plan

A production-ready interactive lead-gen calculator that estimates revenue lost to poor follow-up and manual work, gated by a lead capture form that writes into the existing CRM.

## Routes

- `/tools/roi-savings-calculator` — public page (new)
- `/dashboard/:workspaceId/roi-calculator-submissions` — admin view (new, workspace-scoped like other dashboard routes)

## Files to create

- `src/pages/tools/RoiSavingsCalculator.tsx` — the full public page (hero → calculator → gated form → results → solution cards → CTA → FAQ), using existing `Header`, `Footer`, `Seo`, shadcn `Card`/`Input`/`Button`/`Accordion`/`Checkbox`/`Select`/`Progress`.
- `src/lib/roi/calculator.ts` — pure calculation helpers, currency formatting (GBP/USD/EUR/NGN via `Intl.NumberFormat`), NGN threshold config, and recommendation logic.
- `src/hooks/useRoiSubmission.ts` — wraps the `roi-calculator-submit` edge function call, captures UTM params, tracks analytics events.
- `src/pages/dashboard/DashboardRoiSubmissions.tsx` — admin table + filters + row actions (open CRM contact, export CSV, update status, book appointment link).
- `supabase/functions/roi-calculator-submit/index.ts` — public (verify_jwt=false) edge function that: validates input with zod, inserts into `roi_calculator_submissions`, upserts a `leads` row by email (workspace = platform default via `OWNER_USER_ID`'s workspace), attaches tags `roi-calculator-lead` + intent tags, writes a `lead_activities` note, and creates a `notifications` row for high-intent leads.
- `supabase/functions/roi-calculator-submit/index.ts` also fires the existing `email-send` / `whatsapp-send` hooks for result delivery when configured.

## Files to change

- `src/App.tsx` — add the two new routes (public + workspace-scoped, guarded by `AdminGuard` for the submissions list).
- `src/components/layout/Footer.tsx` — add a "Free Tools → ROI Savings Calculator" link.
- `src/components/dashboard/DashboardLayout.tsx` sidebar — add admin-only "ROI Calculator" entry under the existing admin section.

## Database migration

Create `public.roi_calculator_submissions` exactly as specified, with:

- Indexes on `email`, `workspace_id`, `created_at`, `lead_status`, `estimated_monthly_opportunity`.
- `GRANT INSERT ON public.roi_calculator_submissions TO anon, authenticated;`
- `GRANT SELECT, UPDATE ON public.roi_calculator_submissions TO authenticated;`
- `GRANT ALL ON public.roi_calculator_submissions TO service_role;`
- RLS enabled with:
  - INSERT policy `WITH CHECK (true)` for anon + authenticated (public submissions).
  - SELECT policy `USING (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id)) OR public.has_role(auth.uid(),'admin')`.
  - UPDATE policy for workspace admins + platform admin.
  - No public SELECT/UPDATE/DELETE.
- `update_updated_at_column` trigger.

## Calculation formulas (in `src/lib/roi/calculator.ts`)

```text
current_customers          = leads_per_month * conversion_rate/100
current_monthly_revenue    = current_customers * average_customer_value
missed_leads               = leads_per_month * missed_follow_up_percentage/100
recoverable_customers      = missed_leads * conversion_rate/100
recoverable_revenue        = recoverable_customers * average_customer_value
manual_admin_cost          = manual_follow_up_hours * staff_cost_per_hour
estimated_monthly_opp      = recoverable_revenue + manual_admin_cost + monthly_software_cost
estimated_annual_opp       = estimated_monthly_opp * 12
```

Threshold config (per currency, NGN uses ~1900x GBP as the configurable equivalent):
`HIGH_OPP_THRESHOLD = { GBP:1000, USD:1000, EUR:1000, NGN:1_900_000 }`
`HIGH_ADMIN_THRESHOLD = { GBP:500, USD:500, EUR:500, NGN:950_000 }`

## Lead capture + CRM wiring

Gate the full results behind: full_name, email, phone, business_name, business_type (dropdown as specified), preferred_contact_method, required consent checkbox. Preview numbers show before gating.

The `roi-calculator-submit` edge function:

1. Inserts into `roi_calculator_submissions`.
2. Looks up an existing `leads` row by lowercase email (matches existing dedup rule).
3. Upserts the lead with tags `['roi-calculator-lead', ...intent tags]`, source `ROI Savings Calculator`, `assigned_owner_id` via `assign_next_round_robin`.
4. Inserts a `lead_activities` note with the calculator summary and a `notifications` row titled "New High-Value ROI Calculator Lead" when high-intent.
5. Fires internal sales notification via existing patterns; queues result email through `email-send` when Resend/SendGrid configured (best-effort, never blocks response).

## Recommendation logic

Runs client-side and is stored on the submission:

- Missed follow-up ≥ 25% → follow-up gap message.
- Manual admin cost ≥ threshold → automation message.
- Conversion rate < 10% → conversion process message.
- Monthly opportunity ≥ threshold → book audit message.

## Booking CTA

Reuses the existing discovery-call slug: `/book/30-minute-discovery-call-9f5d5f` (same URL used across the rest of the site's "Book a Demo" buttons). Exposed as `ROI_CALCULATOR_BOOKING_URL` constant in `src/lib/roi/calculator.ts` for easy override.

## Analytics events

Fired via existing analytics/pixel helpers (`workspacePixels`, Meta Pixel route tracker already global). Events: `roi_calculator_page_viewed`, `_started`, `_completed`, `_preview_viewed`, `_lead_submitted`, `_full_report_viewed`, `_booking_clicked`, `_whatsapp_clicked`. Only non-PII props sent (currency, business_type, buckets for leads/opportunity, UTM).

## SEO

`Seo` component with the specified title, meta description, canonical `/tools/roi-savings-calculator`, FAQPage JSON-LD built from the FAQ items.

## Admin submissions view

Reuses `DashboardLayout`, gated by `AdminGuard` (same pattern as other admin routes). Table + filter bar + CSV export + row actions that deep-link into the existing lead drawer (`/dashboard/:workspaceId/leads?leadId=…`) so all messaging/booking actions reuse existing flows — no duplicate messaging UI.

## Items requiring manual configuration after build

- Marketing consent copy sign-off (uses the exact wording provided).
- SendGrid/Resend must already be configured in Settings → Channels for automated result delivery emails; otherwise the submission still saves and the in-app notification still fires.
- Optional: adjust `ROI_CALCULATOR_BOOKING_URL` if you want a dedicated "Automation Audit" booking page instead of the shared discovery call slug.
- Optional: tune NGN thresholds in `src/lib/roi/calculator.ts` once you have a preferred FX assumption.
