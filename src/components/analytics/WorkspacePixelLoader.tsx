import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  loadWorkspacePixels,
  injectMetaPixel,
  injectGA4,
  injectGTM,
  clearWorkspacePixels,
  wsPageView,
} from "@/lib/analytics/workspacePixels";

interface Props {
  workspaceId: string | null | undefined;
}

/**
 * Mounts inside any public-facing page (funnel, form, booking) and loads the
 * workspace-owner's tracking pixels. Fires PageView on every route change.
 *
 * Renders nothing.
 */
export default function WorkspacePixelLoader({ workspaceId }: Props) {
  const { pathname, search } = useLocation();
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    (async () => {
      const cfg = await loadWorkspacePixels(workspaceId);
      if (cancelled || !cfg) return;

      // Clear any previously-injected pixels for a different workspace
      if (loadedRef.current && loadedRef.current !== workspaceId) {
        clearWorkspacePixels(loadedRef.current);
      }
      loadedRef.current = workspaceId;

      if (cfg.meta_enabled && cfg.meta_pixel_id) {
        injectMetaPixel(cfg.meta_pixel_id, workspaceId);
      }
      if (cfg.ga4_enabled && cfg.ga4_measurement_id) {
        injectGA4(cfg.ga4_measurement_id, workspaceId);
      }
      if (cfg.gtm_enabled && cfg.gtm_id) {
        injectGTM(cfg.gtm_id, workspaceId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Fire PageView on every route change after the pixel is loaded.
  // Skip the initial load — injectMetaPixel already fires its first PageView.
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (loadedRef.current) wsPageView();
  }, [pathname, search]);

  return null;
}
