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
import logoFull from "@/assets/brand-logo-full.png.asset.json";
import CurrencySwitcher from "@/components/layout/CurrencySwitcher";

const navLinks = [
  { label: "Features", to: "/features" },
  { label: "Store", to: "/automations" },
  { label: "Pricing", to: "/pricing" },
  { label: "Referral", to: "/referral" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const resourcesLinks = [
  { label: "Automation Finder", to: "/automation-finder" },
  { label: "Automation Bundles", to: "/automation-bundles" },
  { label: "Academy", to: "/academy" },
  { label: "Blog", to: "/blog" },
  { label: "ROI Savings Calculator", to: "/tools/roi-savings-calculator" },
  { label: "Compare Alternatives", to: "/compare/nexusflo24-vs-gohighlevel-vs-hubspot" },
];

const solutionsLinks = [
  { label: "For Coaches & Creators", to: "/coaches-creators" },
  { label: "For Marketing Agencies", to: "/marketing-agencies" },
  { label: "For SMEs / Local Businesses", to: "/small-business" },
  { label: "AI Receptionist", to: "/ai-receptionist" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<"solutions" | "resources" | null>(null);
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
          <img alt="NexusFlo24" width={174} height={48} className="h-10 w-auto object-contain sm:h-11" src={logoFull.url} />
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
        <div className="border-t bg-background p-4 md:hidden animate-fade-in max-h-[calc(100dvh-4rem)] overflow-y-auto">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full">Log In</Button>
            </Link>
            <Link to="/register" onClick={() => setMobileOpen(false)}>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-gold-dark">
                Start Free Trial
              </Button>
            </Link>
          </div>
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <div key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={linkClass(location.pathname === link.to) + " block"}
                >
                  {link.label}
                </Link>
                {(link.to === "/features" || link.to === "/pricing") && (() => {
                  const isRes = link.to === "/pricing";
                  const key = isRes ? "resources" : "solutions";
                  const links = isRes ? resourcesLinks : solutionsLinks;
                  const open = mobileSection === key;
                  return (
                    <div>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setMobileSection(open ? null : key)}
                        className={`${linkClass(isRes ? resourcesActive : solutionsActive)} flex w-full items-center justify-between`}
                      >
                        {isRes ? "Resources" : "Solutions"}
                        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                      {open && links.map((s) => (
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
                  );
                })()}
              </div>
            ))}
            <div className="mt-2 flex justify-center"><CurrencySwitcher /></div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
