// Lazy-load Facebook JS SDK and expose a small promise-based wrapper around
// FB.login() for Meta Embedded Signup. Public App ID + Config ID are fetched
// from our backend (the VITE_ prefix is reserved on this platform).
//
// Docs: https://developers.facebook.com/docs/whatsapp/embedded-signup

declare global {
  interface Window {
    // deno-lint-ignore no-explicit-any
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

let sdkPromise: Promise<void> | null = null;

export function loadFbSdk(appId: string): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("window unavailable"));
    if (window.FB) return resolve();

    window.fbAsyncInit = () => {
      window.FB!.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
      resolve();
    };

    const existing = document.getElementById("facebook-jssdk");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => reject(new Error("Failed to load Facebook SDK"));
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
export function launchEmbeddedSignup(configId: string): Promise<EmbeddedSignupResult> {
  return new Promise((resolve, reject) => {
    if (!window.FB) return reject(new Error("Facebook SDK not loaded"));

    let wabaId = "";
    let phoneNumberId = "";

    const messageHandler = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      // Meta sends WA signup events as JSON strings from facebook.com.
      if (!event.origin.endsWith("facebook.com")) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP" && data.event === "FINISH") {
          wabaId = data?.data?.waba_id || wabaId;
          phoneNumberId = data?.data?.phone_number_id || phoneNumberId;
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("message", messageHandler);

    window.FB.login(
      (response: { authResponse?: { code?: string }; status?: string }) => {
        window.removeEventListener("message", messageHandler);
        if (response?.authResponse?.code) {
          const code = response.authResponse.code;
          if (!wabaId || !phoneNumberId) {
            reject(
              new Error(
                "Connected, but Meta didn't return your WhatsApp Business Account. Make sure you complete the WhatsApp setup steps in the popup before closing it.",
              ),
            );
            return;
          }
          resolve({ code, wabaId, phoneNumberId });
        } else {
          reject(new Error("Connection cancelled."));
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: { } },
      },
    );
  });
}
