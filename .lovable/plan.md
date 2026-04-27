# Workspace-Level Tracking Pixels (Meta + Google)

Let each subscriber paste their own tracking IDs **once** in their workspace settings. Those pixels will then auto-fire on every public page that workspace owns: **funnels** (`/f/:slug`), **forms** (`/forms/:slug`), and **booking pages** (`/book/:slug`).

## What the user gets

A new **"Tracking & Pixels"** card inside Dashboard → Settings → Channels (or its own tab — see Technical), with three fields:

1. **Meta Pixel ID** — e.g. `4520045111651647`
2. **Google Analytics 4 Measurement ID** — e.g. `G-XXXXXXXXXX` (bonus, since the same plumbing covers it)
3. **Google Tag Manager ID** — e.g. `GTM-XXXXXX` (bonus)

Each field has:
- A toggle to enable/disable
- A "Test" button that fires a `PageView` and shows confirmation
- Help text linking to where to find the ID

When saved, those pixels load automatically on every public-facing page the workspace owns and fire:
- `PageView` on every page load / route change
- `Lead` on form/funnel/booking submission
- `Schedule` on booking confirmation

## Scope

| Surface | Pixel fires? |
|---|---|
| Public funnel `/f/:slug` + `/f/:slug/:stepPath` | ✅ |
| Public hosted form `/forms/:slug` | ✅ |
| Embedded form `/embed/form` | ✅ |
| Public booking `/book/:slug` | ✅ |
| Reschedule `/reschedule/:token` | ✅ (PageView only) |
| Marketing site (`/`, `/pricing`, dashboard, etc.) | ❌ — those stay on the platform's own NexusFlo24 pixel |

## Technical Plan

### 1. Database

New table `workspace_tracking_pixels` (one row per workspace):

```text
- workspace_id        uuid PK, FK workspaces
- meta_pixel_id       text
- meta_enabled        boolean default true
- ga4_measurement_id  text
- ga4_enabled         boolean default true
- gtm_id              text
- gtm_enabled         boolean default true
- updated_at          timestamptz
```

**RLS:**
- `SELECT` — public (so unauthenticated visitors on `/f/:slug` etc. can read the pixel IDs to load)
- `INSERT/UPDATE/DELETE` — workspace admins only via `is_workspace_admin(auth.uid(), workspace_id)`

Pixel IDs are not secrets — they're embedded on the public page anyway, so public read is correct.

### 2. New helper: `src/lib/analytics/workspacePixels.ts`

- `loadWorkspacePixels(workspaceId)` — fetches the row, returns config
- `injectMetaPixel(id)` — appends Meta Pixel script + fires PageView, idempotent (skips if already loaded)
- `injectGA4(id)` — appends gtag.js, idempotent
- `injectGTM(id)` — appends GTM, idempotent
- `wsTrack(event, params)` — calls `fbq('track', ...)` and `gtag('event', ...)` if loaded
- All calls are no-ops when IDs missing or disabled

### 3. New component: `src/components/analytics/WorkspacePixelLoader.tsx`

Mounts inside each public page wrapper. Takes a `workspaceId` prop, loads pixels on mount, fires `PageView` on route change. Multiple workspaces never collide because we tag injected scripts with `data-nf24-ws-pixel="<workspaceId>"` and remove them on unmount/workspace change.

Wired into:
- `src/pages/PublicFunnel.tsx` — uses funnel's `workspace_id`
- `src/pages/PublicForm.tsx` — uses form's `workspace_id`
- `src/pages/EmbedForm.tsx` — uses form's `workspace_id`
- `src/pages/PublicBooking.tsx` — uses booking page's `workspace_id`
- `src/pages/RescheduleBooking.tsx` — uses booking's `workspace_id`

### 4. Conversion event wiring

- `PublicFormRenderer` & funnel `FormBlock` (`PublicBlockRenderer.tsx`): after successful submit, call `wsTrack('Lead')` in addition to the existing platform `fbqTrack('Lead')`.
- `PublicBooking` after successful `book-appointment`: `wsTrack('Schedule')` and `wsTrack('Lead')`.

### 5. Settings UI

New file `src/components/settings/TrackingPixelsTab.tsx`:
- Three sections (Meta / GA4 / GTM), each with input + enable switch + Test button
- Save → upsert into `workspace_tracking_pixels`
- Visible to workspace admins only (uses existing `useWorkspaceRole` / `is_workspace_admin` pattern)

Add a new tab **"Tracking & Pixels"** to `src/pages/dashboard/DashboardSettings.tsx` between "Channels" and "Branding".

### 6. Validation

- Meta Pixel ID: 15–16 digit numeric
- GA4 ID: matches `^G-[A-Z0-9]+$`
- GTM ID: matches `^GTM-[A-Z0-9]+$`

Show inline errors; "Test" button is disabled until format is valid and saved.

### 7. Documentation

Add a small "Where do I find my Pixel ID?" inline help drawer with a link to Meta Events Manager.

## Files to create

- `src/components/settings/TrackingPixelsTab.tsx`
- `src/components/analytics/WorkspacePixelLoader.tsx`
- `src/lib/analytics/workspacePixels.ts`
- One DB migration (table + RLS)

## Files to edit

- `src/pages/dashboard/DashboardSettings.tsx` (add tab)
- `src/pages/PublicFunnel.tsx`
- `src/pages/PublicForm.tsx`
- `src/pages/EmbedForm.tsx`
- `src/pages/PublicBooking.tsx`
- `src/pages/RescheduleBooking.tsx`
- `src/components/forms/PublicFormRenderer.tsx` (add `wsTrack('Lead')`)
- `src/components/funnels/PublicBlockRenderer.tsx` (add `wsTrack('Lead')` on form submit)

## Out of scope (can add later)

- Per-funnel / per-form pixel overrides
- Server-side Conversions API (CAPI) for Meta — would need an edge function and access tokens
- TikTok / LinkedIn / X pixels (same pattern, easy to extend once the workspace_tracking_pixels table exists)

Approve and I'll build it.