## Goal
Make the cookie consent banner more compact on mobile so it doesn't dominate the screen, while keeping it fully compliant with GDPR/UK/CCPA requirements.

## Why keep the banner
The cookie banner is legally required under GDPR (EU), PECR (UK), and CCPA (California) before storing non-essential cookies (analytics, marketing). Removing it would expose NexusFlo24 to fines and contradict the existing Cookie Policy, Privacy Policy, and GDPR Rights pages. It only shows once per visitor — after Accept/Reject, it disappears permanently for that user.

## Mobile compactness changes
File: `src/components/CookieConsentBanner.tsx`

1. **Container padding** — Reduce from `py-4` to `py-2` on mobile (`sm:py-4` keeps desktop unchanged), and add tighter `px-3` horizontal padding.
2. **Message text** — Reduce from `text-sm` to `text-xs` on mobile (`sm:text-sm` desktop).
3. **Button labels** — Shorten on every screen for clarity:
   - "Reject Non-Essential" → "Reject"
   - "Manage Preferences" → "Manage"
   - "Accept All" stays
4. **Button sizing** — On mobile: `h-8`, `text-xs`, `flex-1` so the three buttons share one row evenly. On desktop (`sm:`): restore `h-9`, `text-sm`, natural width.
5. **Gap spacing** — Tighter `gap-1.5` between buttons on mobile, `sm:gap-2` on desktop.

## What stays the same
- Banner position (fixed bottom), backdrop blur, border, shadow.
- "Manage Preferences" detailed view (categories: Necessary / Functional / Analytics / Marketing).
- localStorage persistence under `nexusflo_cookie_consent`.
- Link to the Cookie Policy page.
- Full desktop layout — only mobile is tightened.

## Result
On a 384px-wide phone, the banner shrinks to roughly half its current height, sits unobtrusively at the bottom, and the three buttons fit on one tidy row instead of stacking and pushing the screen.
