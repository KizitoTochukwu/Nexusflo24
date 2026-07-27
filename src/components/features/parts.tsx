import * as React from "react";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Reveal-on-scroll wrapper. Respects prefers-reduced-motion. */
export const Reveal = ({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: React.ElementType;
}) => {
  const ref = React.useRef<HTMLElement | null>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      style={shown && delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        "motion-safe:opacity-0",
        shown && "motion-safe:animate-fade-up",
        className,
      )}
    >
      {children}
    </Tag>
  );
};

/** Section shell used by every feature block. */
export const FeatureSection = ({
  id,
  eyebrow,
  heading,
  description,
  children,
  tone = "default",
  className,
}: {
  id: string;
  eyebrow?: string;
  heading: string;
  description?: string;
  children?: React.ReactNode;
  tone?: "default" | "muted";
  className?: string;
}) => (
  <section
    id={id}
    className={cn(
      "scroll-mt-32 py-16 md:py-24",
      tone === "muted" ? "bg-surface" : "bg-background",
      className,
    )}
  >
    <div className="container max-w-[1280px]">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
          {heading}
        </h2>
        {description && (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  </section>
);

/** Two-column capability checklist. */
export const CapabilityList = ({ items }: { items: string[] }) => (
  <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/90">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

/** Bordered mock panel used for the lightweight product visuals. */
export const MockPanel = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) => (
  <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
    <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="h-4 w-4 text-accent" aria-hidden="true" />}
        <span>{title}</span>
      </div>
      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Sample data
      </span>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

export type StatusLabel = "Available" | "Beta" | "Coming Soon";

export const StatusBadge = ({ status }: { status: StatusLabel }) => (
  <span
    className={cn(
      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
      status === "Available" &&
        "border-accent/40 bg-accent/10 text-accent-foreground",
      status === "Beta" && "border-border bg-secondary text-secondary-foreground",
      status === "Coming Soon" &&
        "border-border bg-background text-muted-foreground",
    )}
  >
    {status}
  </span>
);
