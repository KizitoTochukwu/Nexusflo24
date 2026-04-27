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

/** Fire a standard or custom Meta Pixel `track` event. */
export const fbqTrack = (event: string, params?: Record<string, any>) => {
  if (!isAvailable()) return;
  try {
    window.fbq!("track", event, params);
  } catch (err) {
    console.warn("[meta-pixel] track failed", event, err);
  }
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
