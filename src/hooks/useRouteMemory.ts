import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  extractWorkspaceId,
  isPersistablePath,
  persistLastRouteRemote,
  readLastRouteLocal,
  saveLastRoute,
  stripVolatile,
  type LastRoute,
} from "@/lib/routeMemory";

/**
 * Tracks the user's current location and persists it to localStorage
 * (instant) + Supabase profile (debounced) so we can restore on next visit.
 * Also restores scroll position once per matched path.
 */
export function useRouteMemory() {
  const { user } = useAuth();
  const location = useLocation();
  const lastRemoteWriteRef = useRef(0);
  const remoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredForPathRef = useRef<string | null>(null);

  // Save on every path change
  useEffect(() => {
    if (!user) return;
    const fullPath = stripVolatile(location.pathname + location.search + location.hash);
    if (!isPersistablePath(fullPath)) return;

    const wsId = extractWorkspaceId(fullPath);
    if (!wsId) return;

    const route: LastRoute = {
      workspace_id: wsId,
      path: fullPath,
      scrollY: 0,
      saved_at: new Date().toISOString(),
    };
    saveLastRoute(user.id, route);

    // Debounce remote write (5s)
    if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
    remoteTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastRemoteWriteRef.current < 4000) return;
      lastRemoteWriteRef.current = now;
      persistLastRouteRemote(user.id, route).catch(() => {});
    }, 5000);

    return () => {
      if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
    };
  }, [user, location.pathname, location.search, location.hash]);

  // Capture scroll on unload
  useEffect(() => {
    if (!user) return;
    const handler = () => {
      const fullPath = stripVolatile(location.pathname + location.search + location.hash);
      if (!isPersistablePath(fullPath)) return;
      const wsId = extractWorkspaceId(fullPath);
      if (!wsId) return;
      saveLastRoute(user.id, {
        workspace_id: wsId,
        path: fullPath,
        scrollY: window.scrollY,
        saved_at: new Date().toISOString(),
      });
    };
    window.addEventListener("beforeunload", handler);
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("pagehide", handler);
    };
  }, [user, location.pathname, location.search, location.hash]);

  // Scroll restoration once per path
  useEffect(() => {
    if (!user) return;
    const fullPath = stripVolatile(location.pathname + location.search + location.hash);
    const wsId = extractWorkspaceId(fullPath);
    if (!wsId) return;
    if (restoredForPathRef.current === fullPath) return;
    const stored = readLastRouteLocal(user.id, wsId);
    if (stored && stored.path === fullPath && typeof stored.scrollY === "number" && stored.scrollY > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, stored.scrollY!);
        });
      });
    }
    restoredForPathRef.current = fullPath;
  }, [user, location.pathname, location.search, location.hash]);
}
