import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { fbqTrack } from "@/lib/analytics/metaPixel";

/**
 * Fires a Meta Pixel `PageView` on every client-side route change.
 * The very first PageView is already fired by the inline script in
 * `index.html`, so we skip the initial mount to avoid double-counting.
 */
const MetaPixelRouteTracker = () => {
  const { pathname, search } = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    fbqTrack("PageView");
  }, [pathname, search]);

  return null;
};

export default MetaPixelRouteTracker;
