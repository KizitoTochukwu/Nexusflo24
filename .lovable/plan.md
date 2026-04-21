

## Goal
Make Nexus AI proactively engage visitors instead of waiting silently for a click — pop up automatically when someone lands on the site or scrolls through it.

## What to add to `src/components/ChatbotWidget.tsx`

### 1. Auto-open triggers (whichever fires first)
- **Time-on-page**: opens after **8 seconds** on the marketing site / **15 seconds** inside the dashboard (less intrusive for logged-in users actively working)
- **Scroll depth**: opens after the user scrolls past **40% of the page**
- **Exit intent** (desktop only): opens when the cursor leaves the top of the viewport (classic "are you leaving?" trigger)

All three triggers share a single "has auto-opened" guard so it only auto-opens **once per session**.

### 2. Attention-grabbing pre-open state
Before any auto-open fires, the floating launcher gets:
- A small **gold pulse ring** animation (uses existing `bg-accent` + `animate-pulse`)
- A **"1" notification dot** badge in the corner
- After 4 seconds idle: a small **chat bubble preview** floats above the launcher saying *"👋 Need help getting started?"* — clicking it opens the widget, clicking the X dismisses for the session

### 3. Session-aware behavior (no annoyance)
Stored in `sessionStorage` (clears when tab closes — fresh on next visit, but not spammy mid-session):
- `nexus_ai_auto_opened` — set once auto-open fires, prevents re-triggering
- `nexus_ai_dismissed` — set when user closes the widget after auto-open; suppresses further auto-opens for this session
- The manual launcher button still works at any time regardless of these flags

### 4. Route awareness
- **Skip auto-open** on: `/login`, `/register`, `/auth/callback`, `/embed/*`, `/f/*` (public funnels), `/book/*`, `/unsubscribe` — these are conversion-critical or embedded contexts where a popup would interfere
- **Active on**: homepage, marketing pages (features, pricing, about, blog, etc.) and the authenticated dashboard

### 5. Respect user preferences
- Honors `prefers-reduced-motion` (skips pulse/bubble animations, just opens quietly)
- Mobile (<768px): disables exit-intent trigger (no mouse), keeps time + scroll triggers, hides the floating preview bubble (screen too small)

## Files to change
- **EDIT** `src/components/ChatbotWidget.tsx` — add the trigger effects, session guards, route-skip list, pulse ring + notification dot + preview bubble UI

## Out of scope
- No backend changes, no new dependencies
- No changes to chat conversation logic, lead capture, or human handoff
- No changes to `App.tsx` mount point

