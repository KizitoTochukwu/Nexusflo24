# Exit-Intent Helper Popup — Homepage

Add a friendly, conversion-focused popup that triggers when a first-time / inexperienced visitor tries to leave the homepage without engaging (no form submission, no signup, low time-on-page or no meaningful scroll).

## Who it targets

A visitor is considered "naive / unconverted" if ALL of the following are true (stored in `localStorage`):
- Not authenticated (no Supabase session)
- Has not submitted any form / lead capture (`nf24_lead_submitted` flag absent)
- Has not previously dismissed or converted on this popup (`nf24_exit_popup_state` absent)
- Is on `/` (homepage only, per request)

Optional "inexperienced" signal (any one triggers eligibility):
- First-ever visit (no `nf24_visited` flag), OR
- Session time on page < 90s, OR
- Scroll depth < 40%, OR
- No clicks on primary CTAs (`Start Free Trial`, `Book a Demo`, pricing links)

## Trigger

- Desktop: mouse leaves the top of the viewport (`mouseout` with `e.clientY <= 0`)
- Mobile: fast upward scroll near top OR `visibilitychange` to hidden after >15s on page
- Only fires once per visitor (state persisted), 8s minimum delay after page load to avoid accidental fires

## Popup content

Headline: "Not sure where to start?"
Sub: "Get our free 2-minute Quick Start guide — we'll show you how to capture, nurture, and convert your first leads with NexusFlo24."
Single email input + primary CTA "Send me the Quick Start" (Navy/Gold per brand)
Secondary text link: "No thanks, I'll explore on my own" (dismiss)
Trust line: "Free. No credit card. Unsubscribe anytime."

On submit:
- Call existing `useCaptureLead` hook to create a lead in the default/public workspace with source `exit_intent_homepage` and tag `quick-start-guide`
- Set `nf24_lead_submitted=true` and `nf24_exit_popup_state=converted`
- Show success state inside the modal ("Check your inbox — and here's a head start:" + buttons to `/academy` and `/register`)

On dismiss:
- Set `nf24_exit_popup_state=dismissed` so it never shows again for that browser

## Files

New:
- `src/components/home/ExitIntentPopup.tsx` — modal UI + trigger logic, uses existing `Dialog` and `useCaptureLead`
- `src/hooks/useExitIntent.ts` — encapsulates eligibility checks, trigger listeners, localStorage state

Edited:
- `src/pages/Index.tsx` — mount `<ExitIntentPopup />` at the bottom (homepage only)

No backend / schema changes — reuses existing lead capture pipeline and tagging.

## Technical notes

- Uses `Dialog` from `@/components/ui/dialog`, semantic tokens only (primary, accent, muted-foreground)
- Listeners attached in `useEffect`, cleaned up on unmount
- Respects `prefers-reduced-motion`
- Tag `quick-start-guide` already lives in `AUTOMATION_TAG_OPTIONS`, so an automation can be wired to it later to send the actual guide email
