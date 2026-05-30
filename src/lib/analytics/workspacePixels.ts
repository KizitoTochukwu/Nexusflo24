/**
 * Workspace-level tracking pixels.
 *
 * Each subscriber can paste their own Meta Pixel, Google Analytics 4, and
 * Google Tag Manager IDs in Settings → Tracking & Pixels. Those pixels are
 * then auto-loaded on every public page that workspace owns (funnels, forms,
 * booking pages) and fire conversion events on submissions.
 *
 * Multiple workspaces never collide: every injected <script> is tagged with
 * `data-nf24-ws-pixel="<workspaceId>"` and removed on unmount.
 */

import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export interface WorkspacePixelConfig {
  meta_pixel_id: string | null;
  meta_enabled: boolean;
  ga4_measurement_id: string | null;
  ga4_enabled: boolean;
  gtm_id: string | null;
  gtm_enabled: boolean;
}

const TAG_ATTR = "data-nf24-ws-pixel";

export async function loadWorkspacePixels(workspaceId: string): Promise<WorkspacePixelConfig | null> {
  if (!workspaceId) return null;
  const { data, error } = await supabase.rpc("get_workspace_public_pixels" as any, {
    p_workspace_id: workspaceId,
  });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return row as WorkspacePixelConfig;
}

/** Remove all previously-injected pixels for the given (or any) workspace. */
export function clearWorkspacePixels(workspaceId?: string) {
  const selector = workspaceId ? `[${TAG_ATTR}="${workspaceId}"]` : `[${TAG_ATTR}]`;
  document.querySelectorAll(selector).forEach((el) => el.remove());
}

function tag(el: HTMLElement, workspaceId: string) {
  el.setAttribute(TAG_ATTR, workspaceId);
}

/** Idempotent Meta Pixel loader. Skips init if the same pixel ID is already loaded. */
const initedPixelIds = new Set<string>();
export function injectMetaPixel(pixelId: string, workspaceId: string) {
  if (!pixelId) return;
  // Bootstrap fbq if not already present
  if (typeof window.fbq !== "function") {
    const n: any = function (...args: any[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    };
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    window.fbq = n;
    if (!window._fbq) window._fbq = n;

    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    tag(s, workspaceId);
    document.head.appendChild(s);
  }
  // Skip if already initialized in this session (avoids "Duplicate Pixel ID"
  // warnings when index.html — or a previous call — already booted the same id).
  if (initedPixelIds.has(pixelId)) return;
  const fbqAny = window.fbq as any;
  const existingIds: string[] =
    (fbqAny?._pixelsByID && Object.keys(fbqAny._pixelsByID)) ||
    (Array.isArray(fbqAny?.instance?.pixelsByID) ? fbqAny.instance.pixelsByID : []) ||
    [];
  if (existingIds.includes(pixelId)) {
    initedPixelIds.add(pixelId);
    return;
  }
  try {
    window.fbq!("init", pixelId);
    window.fbq!("track", "PageView");
    initedPixelIds.add(pixelId);
  } catch (err) {
    console.warn("[ws-pixel] meta init failed", err);
  }
}

/** Idempotent GA4 loader. */
export function injectGA4(measurementId: string, workspaceId: string) {
  if (!measurementId) return;
  if (!window.dataLayer) window.dataLayer = [];
  if (typeof window.gtag !== "function") {
    window.gtag = function (...args: any[]) {
      window.dataLayer!.push(args);
    };
    window.gtag("js", new Date());
  }
  // Load the gtag.js script once per measurement id
  const existing = document.querySelector(`script[data-ga4-id="${measurementId}"]`);
  if (!existing) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    s.setAttribute("data-ga4-id", measurementId);
    tag(s, workspaceId);
    document.head.appendChild(s);
  }
  try {
    window.gtag!("config", measurementId, { send_page_view: true });
  } catch (err) {
    console.warn("[ws-pixel] ga4 config failed", err);
  }
}

/** Idempotent GTM loader. */
export function injectGTM(gtmId: string, workspaceId: string) {
  if (!gtmId) return;
  const existing = document.querySelector(`script[data-gtm-id="${gtmId}"]`);
  if (existing) return;
  if (!window.dataLayer) window.dataLayer = [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  s.setAttribute("data-gtm-id", gtmId);
  tag(s, workspaceId);
  document.head.appendChild(s);
}

/** Fire a conversion across whatever pixels the workspace has loaded. */
export function wsTrack(event: string, params?: Record<string, any>) {
  if (typeof window.fbq === "function") {
    try { window.fbq("track", event, params); } catch { /* ignore */ }
  }
  if (typeof window.gtag === "function") {
    try { window.gtag("event", event, params || {}); } catch { /* ignore */ }
  }
  if (Array.isArray(window.dataLayer)) {
    try { window.dataLayer.push({ event, ...(params || {}) }); } catch { /* ignore */ }
  }
}

/** Fire a PageView across loaded pixels (used on SPA route changes). */
export function wsPageView() {
  if (typeof window.fbq === "function") {
    try { window.fbq("track", "PageView"); } catch { /* ignore */ }
  }
  // GA4 auto-tracks via send_page_view on config; skip duplicate.
  if (Array.isArray(window.dataLayer)) {
    try { window.dataLayer.push({ event: "page_view", page_path: window.location.pathname + window.location.search }); } catch { /* ignore */ }
  }
}
