/**
 * Meta Pixel (Facebook Pixel) helpers.
 *
 * The pixel script is loaded inline in `index.html` and gated by the user's
 * marketing-cookie consent (managed by `CookieConsentBanner`). All calls
 * here are no-ops when `window.fbq` is unavailable (ad blockers, no consent,
 * SSR, etc.) so it's always safe to call.
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

const isAvailable = () => typeof window !== "undefined" && typeof window.fbq === "function";

/** Fire a standard or custom Meta Pixel `track` event (optionally with an eventID for dedup). */
export const fbqTrack = (event: string, params?: Record<string, any>, eventId?: string) => {
  if (!isAvailable()) return;
  try {
    if (eventId) window.fbq!("track", event, params, { eventID: eventId });
    else window.fbq!("track", event, params);
  } catch (err) {
    console.warn("[meta-pixel] track failed", event, err);
  }
};

/** Fire an event at most once per browser (survives refreshes). */
export const fbqTrackOnce = (key: string, event: string, params: Record<string, any>, eventId?: string) => {
  try {
    const k = `nf24_px_${key}`;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
  } catch { /* storage blocked: still fire */ }
  fbqTrack(event, params, eventId);
};

/** Fire a custom (non-standard) Meta Pixel event. */
export const fbqTrackCustom = (event: string, params?: Record<string, any>) => {
  if (!isAvailable()) return;
  try {
    window.fbq!("trackCustom", event, params);
  } catch (err) {
    console.warn("[meta-pixel] trackCustom failed", event, err);
  }
};

/** Grant or revoke consent for the pixel to track. */
export const fbqSetConsent = (granted: boolean) => {
  if (!isAvailable()) return;
  try {
    window.fbq!("consent", granted ? "grant" : "revoke");
  } catch (err) {
    console.warn("[meta-pixel] consent toggle failed", err);
  }
};
