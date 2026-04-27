## Custom Head Code — Admin Setting (Site-Wide)

Add an admin-only **Custom Code** tab in Settings where you can paste raw HTML/JS (Meta Pixel, GA4, Hotjar, GTM, etc.). The snippet is injected into the document `<head>` on **every page** of the site (marketing pages, dashboard, public funnels, hosted forms, booking pages).

This replaces the need to ever edit `index.html` again for tracking pixels.

---

### What you get

- **Settings → Custom Code** tab (visible only to admins via existing `useIsAdmin` gate).
- Two textareas:
  1. **Head Code** — injected into `<head>` (for Meta Pixel, GA, GTM, etc.)
  2. **Body End Code** — injected just before `</body>` (for chat widgets, late-loading scripts) — optional, included since it's free to add.
- **Enabled** toggle per slot so you can pause tracking without deleting the code.
- A "Last updated" timestamp and a syntax hint ("Paste the full `<script>...</script>` block from the provider").
- Live preview note: changes apply on next page load (no rebuild needed).

### How it works

- New singleton DB table `site_custom_code` (one row, id = `'global'`) holding `head_code`, `body_code`, `head_enabled`, `body_enabled`, `updated_at`, `updated_by`.
- **Public read** RLS (so the snippet loads for anonymous visitors on marketing pages too); **write only by admins** (`has_role(auth.uid(),'admin')`).
- A new `<SiteCustomCodeInjector />` component mounted once in `App.tsx`:
  - Fetches the row on mount + subscribes to realtime updates.
  - Parses pasted HTML, extracts `<script>` and `<noscript>` tags, and re-creates them as real DOM nodes (you can't just `innerHTML` scripts — they won't execute). Inline scripts run, external `src` scripts load with `async`.
  - Head nodes go into `document.head`; body nodes go just before `</body>`.
  - Tags injected by the system are marked with `data-nf24-custom="head|body"` so re-renders cleanly remove the previous batch before re-injecting.
- The existing hard-coded Meta Pixel block in `index.html` stays put (no need to migrate it). The new system is additive — paste anything else you want, or eventually move the pixel into the DB slot and remove it from `index.html`.

### Files

**New**
- `supabase/migrations/<ts>_create_site_custom_code.sql` — table + RLS + seed empty row
- `src/components/analytics/SiteCustomCodeInjector.tsx` — fetches + injects nodes
- `src/components/settings/CustomCodeTab.tsx` — admin UI (textareas, switches, save)

**Edited**
- `src/App.tsx` — mount `<SiteCustomCodeInjector />` once at app root
- `src/pages/dashboard/DashboardSettings.tsx` — add `Custom Code` tab (admin-only, next to `Integrations`), wire `<TabsTrigger>` + `<TabsContent>`

### Technical notes

- Snippet length cap: 20,000 chars per slot (textarea `maxLength`) to avoid runaway pastes.
- HTML parsing uses `DOMParser` + a manual `<script>` re-creation loop — standard, safe, and works for the exact Meta Pixel snippet you already have.
- No sanitization beyond DOMParser — this is **admin-only** by design (only you/your team with the admin role can write). Documented in the UI: "This code runs on every page. Only paste trusted snippets."
- Realtime subscription means once you save, all open tabs (yours + visitors') pick up the change on next navigation; existing tabs reflect changes via the realtime listener without reload.

### Out of scope

- Per-workspace custom code (you chose Global only).
- A visual "test fire" button — you can verify with Meta Events Manager's Test Events tool as usual.

---

Approve to implement.