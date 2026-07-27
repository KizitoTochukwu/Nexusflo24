import * as React from "react";
import { cn } from "@/lib/utils";

export type NavItem = { id: string; label: string };

const StickyFeatureNav = ({
  items,
  onSelect,
}: {
  items: NavItem[];
  onSelect?: (id: string) => void;
}) => {
  const [active, setActive] = React.useState(items[0]?.id);

  React.useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-140px 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items]);

  const go = (id: string) => {
    onSelect?.(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  return (
    <nav
      aria-label="Feature categories"
      className="sticky top-16 z-40 border-y border-border bg-background/95 backdrop-blur"
    >
      <div className="container max-w-[1280px]">
        <ul className="no-scrollbar flex gap-1 overflow-x-auto py-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => go(item.id)}
                aria-current={active === item.id ? "true" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  active === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default StickyFeatureNav;
