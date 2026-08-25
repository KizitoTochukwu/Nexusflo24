import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, User } from "lucide-react";
import type { PublicStore } from "@/hooks/useStorefront";

export default function StorefrontShell({
  store,
  basketCount = 0,
  children,
}: {
  store: PublicStore;
  basketCount?: number;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <Link to={`/s/${store.slug}`} className="flex items-center gap-3">
            {store.logo_url
              ? <img src={store.logo_url} alt={`${store.name} logo`} className="h-9 w-9 rounded-lg object-cover" />
              : <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: store.primary_color }}>
                  {store.name.slice(0, 1).toUpperCase()}
                </span>}
            <span className="font-semibold">{store.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to={`/s/${store.slug}/account`}
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:flex"
            >
              <User className="h-4 w-4" /> My purchases
            </Link>
            <Link
              to={`/s/${store.slug}/checkout`}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <ShoppingCart className="h-4 w-4" />
              {basketCount > 0 ? basketCount : "Basket"}
            </Link>
          </div>

        </div>
      </header>

      <main className="container mx-auto px-4 py-10">{children}</main>

      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-8 text-center text-xs text-muted-foreground">
          <p>{store.footer_text || `© ${new Date().getFullYear()} ${store.business_name || store.name}`}</p>
          {store.business_email && <p className="mt-1">{store.business_email}</p>}
          <p className="mt-3">Powered by NexusFlo24</p>
        </div>
      </footer>
    </div>
  );
}
