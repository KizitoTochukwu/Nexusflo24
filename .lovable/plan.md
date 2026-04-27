# Meta Pixel Full Integration

Pixel ID: **4520045111651647**

## 1. Base pixel installation (`index.html`)

- Add the Meta Pixel `<script>` block inside `<head>` (init + first PageView).
- Add the `<noscript><img></noscript>` fallback at the **top of `<body>`** (HTML5 disallows `<noscript><img>` inside `<head>`).
- Wrap the script so it respects consent: define `fbq` queue immediately, but only call `fbq('consent', 'grant')` after the user accepts marketing cookies. Default to `fbq('consent', 'revoke')` so no events fire until consent is granted.

## 2. GDPR consent gating (`src/components/CookieConsentBanner.tsx`)

The existing banner already has a `marketing` preference (default off). Hook into save flows:

- On **Accept All** or when `marketing: true` is saved → call `window.fbq?.('consent', 'grant')`.
- On **Reject** or `marketing: false` → call `window.fbq?.('consent', 'revoke')`.
- On app boot, read `nexusflo_cookie_consent` from `localStorage`; if `marketing === true`, grant consent immediately (handled in a tiny inline script in `index.html` so it runs before React mounts).

This keeps the pixel GDPR-compliant — it loads but only tracks after explicit marketing consent.

## 3. SPA route tracking (`src/App.tsx`)

Create `src/lib/analytics/metaPixel.ts` with thin typed helpers:
```ts
export const fbqTrack = (event: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', event, params);
  }
};
```

Add a `<MetaPixelRouteTracker />` component mounted inside the `<BrowserRouter>` that listens to `useLocation()` and fires `fbqTrack('PageView')` on every pathname change (skipping the very first render since the inline script already fired one).

## 4. Conversion events

| Event | Trigger location | Meta event | Params |
|---|---|---|---|
| Signup | `src/pages/Register.tsx` after successful `supabase.auth.signUp` | `CompleteRegistration` | `{ method: 'email' \| 'google' }` |
| Lead capture (public form) | `src/components/forms/PublicFormRenderer.tsx` after successful submission | `Lead` | `{ content_name: form.name }` |
| Lead capture (funnel form) | `src/components/funnels/PublicBlockRenderer.tsx` (or wherever the funnel opt-in submits) | `Lead` | `{ content_name: funnel name }` |
| Embed form lead | `src/pages/EmbedForm.tsx` after submit | `Lead` | `{ content_name: source }` |
| Stripe checkout start | `src/pages/Pricing.tsx` (and `CreditPackCards.tsx`) right before redirecting to Checkout | `InitiateCheckout` | `{ value, currency: 'USD', content_name: planId }` |
| Stripe purchase success | New post-checkout success page handler (or detect `?checkout=success` query param on dashboard redirect) | `Purchase` | `{ value, currency: 'USD', content_name: planId }` |

For the **Purchase** event: Stripe redirects back to a success URL. I'll inspect the existing checkout flow (`create-checkout-session` edge function and where it sends users) and add a one-shot fire when the success param is present, guarded by `sessionStorage` to avoid duplicates on refresh.

## 5. Files to edit / create

- **edit** `index.html` — base pixel + noscript fallback + consent default
- **create** `src/lib/analytics/metaPixel.ts` — typed helpers
- **create** `src/components/analytics/MetaPixelRouteTracker.tsx` — SPA PageView tracker
- **edit** `src/App.tsx` — mount route tracker inside Router
- **edit** `src/components/CookieConsentBanner.tsx` — wire consent grant/revoke
- **edit** `src/pages/Register.tsx` — fire `CompleteRegistration`
- **edit** `src/components/forms/PublicFormRenderer.tsx` — fire `Lead`
- **edit** `src/pages/EmbedForm.tsx` — fire `Lead`
- **edit** `src/components/funnels/PublicBlockRenderer.tsx` — fire `Lead` on opt-in submit
- **edit** `src/pages/Pricing.tsx` and `src/components/pricing/CreditPackCards.tsx` — fire `InitiateCheckout`
- **edit** Stripe success landing handler — fire `Purchase` (location TBD after I read the post-checkout redirect)

## 6. Verification after deploy

1. Install the **Meta Pixel Helper** Chrome extension and load `nexusflo24.com` — should show pixel `4520045111651647` with PageView (only after accepting marketing cookies).
2. Submit a public form → confirm `Lead` event in Events Manager → Test Events.
3. Sign up a new account → confirm `CompleteRegistration`.
4. Click a Pricing plan → confirm `InitiateCheckout`; complete a test checkout → confirm `Purchase`.

## Notes

- No secrets needed — Pixel ID is a public identifier, safe to commit.
- No backend changes required; everything is client-side.
- All `fbq` calls are guarded with `window.fbq?.` so they're no-ops if the script is blocked (ad blockers, no consent).

Approve to proceed.