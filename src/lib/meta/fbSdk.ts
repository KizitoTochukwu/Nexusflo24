// Lazy-load Facebook JS SDK and expose a small promise-based wrapper around
// FB.login() for Meta Embedded Signup. Public App ID + Config ID are fetched
// from our backend (the VITE_ prefix is reserved on this platform).
//
// Docs: https://developers.facebook.com/docs/whatsapp/embedded-signup

export { META_REDIRECT_URI } from "../../../supabase/functions/_shared/meta.ts";
import { META_REDIRECT_URI } from "../../../supabase/functions/_shared/meta.ts";

declare global {
  interface Window {
    // deno-lint-ignore no-explicit-any
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

let sdkPromise: Promise<void> | null = null;

const SDK_LOAD_TIMEOUT_MS = 15000;
const LOGIN_TIMEOUT_MS = 120000;

const BLOCKED_SDK_MESSAGE =
  "Couldn't load Facebook (connect.facebook.net). It's likely blocked by an ad-blocker, tracking protection (Brave Shields / Safari ITP), or your network. Disable those for this site and try again.";

export function loadFbSdk(appId: string): Promise<void> {
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("window unavailable"));
    }

    const finishOk = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    const finishErr = (err: Error) => {
      clearTimeout(timeoutId);
      // allow retry after failure
      sdkPromise = null;
      reject(err);
    };

    const timeoutId = setTimeout(() => {
      finishErr(new Error(BLOCKED_SDK_MESSAGE));
    }, SDK_LOAD_TIMEOUT_MS);

    // Already initialized
    if (window.FB) return finishOk();

    // Script tag already exists from a previous attempt: poll for FB readiness
    const existing = document.getElementById("facebook-jssdk");
    if (existing) {
      const start = Date.now();
      const poll = setInterval(() => {
        if (window.FB) {
          clearInterval(poll);
          finishOk();
        } else if (Date.now() - start > SDK_LOAD_TIMEOUT_MS) {
          clearInterval(poll);
          finishErr(new Error(BLOCKED_SDK_MESSAGE));
        }
      }, 200);
      return;
    }

    window.fbAsyncInit = () => {
      try {
        window.FB!.init({
          appId,
          cookie: true,
          xfbml: false,
          version: "v21.0",
        });
        finishOk();
      } catch (e: any) {
        finishErr(new Error(e?.message || "Facebook SDK init failed"));
      }
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => finishErr(new Error(BLOCKED_SDK_MESSAGE));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export interface EmbeddedSignupResult {
  code: string;
  wabaId: string;
  phoneNumberId: string;
}

/**
 * Launches FB.login() with the Embedded Signup config and listens for the
 * companion postMessage that carries the WABA + Phone Number IDs.
 */
export function launchEmbeddedSignup(
  configId: string,
): Promise<EmbeddedSignupResult> {
  return new Promise((resolve, reject) => {
    if (!window.FB) return reject(new Error("Facebook SDK not loaded"));

    let wabaId = "";
    let phoneNumberId = "";
    let settled = false;
    let metaError: string | null = null;

    const cleanup = () => {
      settled = true;
      window.removeEventListener("message", messageHandler);
      clearTimeout(timeoutId);
    };

    const messageHandler = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      if (!event.origin.endsWith("facebook.com")) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type !== "WA_EMBEDDED_SIGNUP") return;
        if (data.event === "FINISH") {
          wabaId = data?.data?.waba_id || wabaId;
          phoneNumberId = data?.data?.phone_number_id || phoneNumberId;
        } else if (data.event === "CANCEL") {
          metaError =
            "You closed the Meta popup before finishing. Click Connect again and complete every step (Business → WABA → Phone number).";
        } else if (data.event === "ERROR") {
          const reason =
            data?.data?.error_message ||
            data?.data?.current_step ||
            "Meta rejected the onboarding request.";
          metaError = `Meta error: ${reason}. The NexusFlo24 Meta App likely isn't fully approved for WhatsApp Embedded Signup yet — see the setup checklist below.`;
          if (!settled) {
            cleanup();
            reject(new Error(metaError));
          }
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("message", messageHandler);

    const timeoutId = setTimeout(() => {
      if (settled) return;
      cleanup();
      reject(
        new Error(
          metaError ||
            "Meta didn't respond. The popup may have been blocked — allow popups for this site, disable any ad-blocker, and try again.",
        ),
      );
    }, LOGIN_TIMEOUT_MS);

    try {
      console.info("[Meta Embedded Signup] launching FB.login without redirect_uri (SDK-managed)");

      window.FB.login(
        (response: { authResponse?: { code?: string }; status?: string }) => {
          if (settled) return;
          cleanup();
          if (response?.authResponse?.code) {
            const code = response.authResponse.code;
            if (metaError && (!wabaId || !phoneNumberId)) {
              reject(new Error(metaError));
              return;
            }
            resolve({ code, wabaId, phoneNumberId });
          } else {
            reject(new Error(metaError || "Connection cancelled."));
          }
        },
        {
          config_id: configId,
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {} },
        },
      );
    } catch (e: any) {
      cleanup();
      reject(new Error(e?.message || "Failed to open Meta popup"));
    }
  });
}
