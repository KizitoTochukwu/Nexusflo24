import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fbqTrack } from "@/lib/analytics/metaPixel";

/**
 * Detects Stripe checkout success redirects (?checkout=success or
 * ?purchase=success) anywhere inside the dashboard and fires a single
 * Meta Pixel `Purchase` event. The query flag is then stripped from the
 * URL and a `sessionStorage` guard prevents duplicate fires on refresh.
 */
const PurchaseTracker = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const isPlanSuccess = params.get("checkout") === "success";
    const isCreditSuccess = params.get("purchase") === "success";
    if (!isPlanSuccess && !isCreditSuccess) return;

    const guardKey = `nf_purchase_fired:${pathname}:${search}`;
    if (sessionStorage.getItem(guardKey)) return;
    sessionStorage.setItem(guardKey, "1");

    fbqTrack("Purchase", {
      currency: "USD",
      content_type: isPlanSuccess ? "subscription" : "credit_pack",
    });

    // Clean the success flag from the URL so refreshes don't re-fire.
    params.delete("checkout");
    params.delete("purchase");
    const cleaned = params.toString();
    navigate(`${pathname}${cleaned ? `?${cleaned}` : ""}`, { replace: true });
  }, [pathname, search, navigate]);

  return null;
};

export default PurchaseTracker;
