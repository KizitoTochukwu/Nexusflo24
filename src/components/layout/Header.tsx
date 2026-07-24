import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import logoFull from "@/assets/nexusflo24-logo-full.png";
import CurrencySwitcher from "@/components/layout/CurrencySwitcher";

const navLinks = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "Referral", to: "/referral" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const resourcesLinks = [
  { label: "Academy", to: "/academy" },
  { label: "Blog", to: "/blog" },
  { label: "ROI Savings Calculator", to: "/tools/roi-savings-calculator" },
];

const solutionsLinks = [
  { label: "For Coaches & Creators", to: "/coaches-creators" },
  { label: "For Marketing Agencies", to: "/marketing-agencies" },
  { label: "For SMEs / Local Businesses", to: "/small-business" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const solutionsActive = solutionsLinks.some((l) => l.to === location.pathname);
  const resourcesActive = resourcesLinks.some((l) => l.to === location.pathname);

  const linkClass = (active: boolean) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
      active ? "text-accent" : "text-muted-foreground"
    }`;

  // Insert Solutions after Features, Resources after Pricing
  const desktopNav: Array<{ type: "link" | "solutions" | "resources"; label?: string; to?: string }> = [];
  navLinks.forEach((link) => {
    desktopNav.push({ type: "link", ...link });
    if (link.to === "/features") desktopNav.push({ type: "solutions" });
    if (link.to === "/pricing") desktopNav.push({ type: "resources" });
  });

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <img alt="NexusFlo24" className="h-11 w-auto object-contain rounded" src={logoFull} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {desktopNav.map((item, idx) => {
            if (item.type === "solutions" || item.type === "resources") {
              const isResources = item.type === "resources";
              const links = isResources ? resourcesLinks : solutionsLinks;
              const active = isResources ? resourcesActive : solutionsActive;
              const label = isResources ? "Resources" : "Solutions";
              return (
                <DropdownMenu key={item.type}>
                  <DropdownMenuTrigger
                    className={`${linkClass(active)} inline-flex items-center gap-1 outline-none`}
                  >
                    {label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[14rem]">
                    {links.map((s) => (
                      <DropdownMenuItem key={s.to} asChild>
                        <Link
                          to={s.to}
                          className={location.pathname === s.to ? "text-accent" : ""}
                        >
                          {s.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to!}
                className={linkClass(location.pathname === item.to)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <CurrencySwitcher variant="compact" />
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Log In
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold">
              Start Free Trial
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-background p-4 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <div key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={linkClass(location.pathname === link.to) + " block"}
                >
                  {link.label}
                </Link>
                {link.to === "/features" && (
                  <div className="mt-1">
                    <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                      Solutions
                    </div>
                    {solutionsLinks.map((s) => (
                      <Link
                        key={s.to}
                        to={s.to}
                        onClick={() => setMobileOpen(false)}
                        className={`block rounded-md pl-6 pr-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                          location.pathname === s.to ? "text-accent" : "text-muted-foreground"
                        }`}
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                )}
                {link.to === "/pricing" && (
                  <div className="mt-1">
                    <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                      Resources
                    </div>
                    {resourcesLinks.map((s) => (
                      <Link
                        key={s.to}
                        to={s.to}
                        onClick={() => setMobileOpen(false)}
                        className={`block rounded-md pl-6 pr-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                          location.pathname === s.to ? "text-accent" : "text-muted-foreground"
                        }`}
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex justify-center pb-1"><CurrencySwitcher /></div>
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full">Log In</Button>
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-gold-dark">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
