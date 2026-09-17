# Visitor Entry Popup for NexusFlo24

## What we're building

A popup that appears shortly after a first-time visitor lands on the homepage, capturing their email in exchange for a free Quick Start guide — the same offer as the existing exit-intent popup, but triggered on **entry** instead of on exit. This complements (does not replace) the exit-intent popup: if the visitor already submitted or dismissed the entry popup, the exit-intent popup stays suppressed.

## Defaults used (you skipped the questions)

- **Goal:** Email capture / lead magnet — free Quick Start guide
- **Trigger:** After a short delay (~4 seconds) on page load
- **Frequency:** Once per browser session (re-shows after the browser session ends)
- **Pages:** Homepage (`/`) only

## How it works

```text
Visitor lands on /
      |
   4s delay
      |
  Session-seen? ── yes ──► no popup
      | no
  Show entry popup
      |
  Submit  ─► capture lead (source: entry_popup_homepage)
  Dismiss ─► mark seen, exit-intent popup also suppressed
```

## Technical approach

1. **New hook `useEntryPopup`** (`src/hooks/useEntryPopup.ts`)
   - Mirrors `useExitIntent` eligibility logic (skip if logged in, skip if already a captured lead, skip if already seen this session).
   - Triggers after a configurable delay (`OPEN_DELAY_MS = 4000`) via `setTimeout`.
   - Session-only frequency: `sessionStorage` key `nf24_entry_popup_state`.
   - On dismiss or submit, also sets `localStorage` `nf24_exit_popup_state` so the existing exit-intent popup does **not** also fire for the same visitor.

2. **New component `EntryPopup`** (`src/components/home/EntryPopup.tsx`)
   - Reuses the visual design of `ExitIntentPopup` (Navy/Gold header, icon badge, value pills, email input, gradient CTA, success state) so the two popups look consistent.
   - Calls `useCaptureLead` with `source: "entry_popup_homepage"`, tags `["quick-start-guide", "entry-popup"]`.
   - Success state links to `/register` and `/academy`, matching the exit popup.

3. **Wire into the homepage** (`src/pages/Index.tsx`)
   - Render `<EntryPopup />` alongside `<ExitIntentPopup />`.

## Non-goals

- No changes to the exit-intent popup beyond suppression coordination.
- No backend/schema changes — lead capture reuses the existing `useCaptureLead` pipeline.
- No popup on dashboard or auth pages.
