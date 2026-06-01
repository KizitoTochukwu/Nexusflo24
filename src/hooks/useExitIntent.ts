import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STATE_KEY = "nf24_exit_popup_state";
const LEAD_KEY = "nf24_lead_submitted";
const VISITED_KEY = "nf24_visited";
const MIN_DELAY_MS = 8000;

export function useExitIntent(enabled: boolean = true) {
  const [open, setOpen] = useState(false);
  const [eligible, setEligible] = useState(false);

  // Check eligibility on mount
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem(STATE_KEY)) return;
        if (localStorage.getItem(LEAD_KEY)) return;
        const { data } = await supabase.auth.getSession();
        if (data.session) return;
        if (!cancelled) setEligible(true);
      } catch {
        if (!cancelled) setEligible(true);
      } finally {
        // Mark visit after eligibility check
        try {
          localStorage.setItem(VISITED_KEY, "1");
        } catch {
          /* noop */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Attach triggers once eligible
  useEffect(() => {
    if (!enabled || !eligible) return;

    const loadedAt = Date.now();
    let fired = false;
    let lastY = window.scrollY;

    const trigger = () => {
      if (fired) return;
      if (Date.now() - loadedAt < MIN_DELAY_MS) return;
      if (localStorage.getItem(STATE_KEY)) return;
      fired = true;
      setOpen(true);
    };

    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    };

    const onScroll = () => {
      const y = window.scrollY;
      // Fast upward scroll near top on mobile
      if (y < 100 && lastY - y > 40) trigger();
      lastY = y;
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden" && Date.now() - loadedAt > 15000) {
        trigger();
      }
    };

    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, eligible]);

  const markDismissed = () => {
    try {
      localStorage.setItem(STATE_KEY, "dismissed");
    } catch {
      /* noop */
    }
    setOpen(false);
  };

  const markConverted = () => {
    try {
      localStorage.setItem(STATE_KEY, "converted");
      localStorage.setItem(LEAD_KEY, "1");
    } catch {
      /* noop */
    }
  };

  return { open, setOpen, markDismissed, markConverted };
}
