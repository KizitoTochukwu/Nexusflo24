import { Link, useLocation } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const STORE_PREFIXES = ["/automations", "/automation-finder", "/automation-bundles", "/build-my-automation"];

/** Floating cart button shown only across Automation Store pages. */
export default function CartLauncher() {
  const { pathname } = useLocation();
  const { count } = useCart();

  const onStore = STORE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!onStore || pathname.startsWith("/automations/cart") || pathname.startsWith("/automations/checkout")) {
    return null;
  }
  if (count === 0) return null;

  return (
    <Link
      to="/automations/cart"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg transition-transform hover:scale-105"
      aria-label={`View cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <ShoppingBag className="h-5 w-5" />
      <span className="text-sm font-semibold">Cart</span>
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground">
        {count}
      </span>
    </Link>
  );
}
