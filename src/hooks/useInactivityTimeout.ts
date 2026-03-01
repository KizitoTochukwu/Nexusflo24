import { useEffect, useRef, useCallback, useState } from "react";
import { useLocation } from "react-router-dom";

const TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
const WARNING_MS = 55 * 60 * 1000; // 55 minutes
const CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds
const STORAGE_KEY = "nexusflo_last_activity";
const LOGOUT_KEY = "nexusflo_force_logout";

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown", "scroll", "touchstart", "click",
] as const;

interface UseInactivityTimeoutOptions {
  isAuthenticated: boolean;
  onLogout: () => Promise<void>;
}

export function useInactivityTimeout({ isAuthenticated, onLogout }: UseInactivityTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const loggingOut = useRef(false);
  const location = useLocation();

  const updateActivity = useCallback(() => {
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // storage full – ignore
    }
    setShowWarning(false);
  }, []);

  const triggerLogout = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    setShowWarning(false);
    try {
      localStorage.setItem(LOGOUT_KEY, String(Date.now()));
    } catch { /* ignore */ }
    await onLogout();
  }, [onLogout]);

  // Reset on route change
  useEffect(() => {
    if (isAuthenticated) updateActivity();
  }, [location.pathname, isAuthenticated, updateActivity]);

  // Listen to user activity events
  useEffect(() => {
    if (!isAuthenticated) return;
    updateActivity();

    // Throttle updates to once per 5 seconds
    let lastUpdate = Date.now();
    const handler = () => {
      const now = Date.now();
      if (now - lastUpdate > 5000) {
        lastUpdate = now;
        updateActivity();
      }
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handler));
    };
  }, [isAuthenticated, updateActivity]);

  // Interval checker
  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = setInterval(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const elapsed = Date.now() - Number(raw);

      if (elapsed >= TIMEOUT_MS) {
        triggerLogout();
      } else if (elapsed >= WARNING_MS) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, triggerLogout]);

  // Cross-tab sync via storage events
  useEffect(() => {
    if (!isAuthenticated) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === LOGOUT_KEY && e.newValue) {
        triggerLogout();
      }
      if (e.key === STORAGE_KEY && e.newValue) {
        // Another tab had activity – dismiss warning
        setShowWarning(false);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isAuthenticated, triggerLogout]);

  // Clean up on unmount / logout
  useEffect(() => {
    if (!isAuthenticated) {
      loggingOut.current = false;
    }
  }, [isAuthenticated]);

  const stayLoggedIn = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  const logoutNow = useCallback(() => {
    triggerLogout();
  }, [triggerLogout]);

  return { showWarning, stayLoggedIn, logoutNow };
}
