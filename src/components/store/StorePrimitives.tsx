import { Link } from "react-router-dom";
import {
  ArrowRight, BarChart3, BellRing, CalendarCheck, CreditCard, Database, Feather, FlaskConical,
  Handshake, Headphones, Magnet, Megaphone, MessageCircle, Settings2, ShieldCheck, ShoppingBag,
  Sparkles, Star, TrendingUp, UserPlus, Workflow, Zap, type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LEVELS, TRUST_POINTS, type StoreLevel } from "@/lib/store/constants";

const ICONS: Record<string, LucideIcon> = {
  ArrowRight, BarChart3, BellRing, CalendarCheck, CreditCard, Database, Feather, FlaskConical,
  Handshake, Headphones, Magnet, Megaphone, MessageCircle, Settings2, ShieldCheck, ShoppingBag,
  Sparkles, Star, TrendingUp, UserPlus, Workflow, Zap,
};

export function StoreIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Sparkles;
  return <Icon className={className} />;
}

export function LevelBadge({ level }: { level: StoreLevel }) {
  const meta = LEVELS[level] ?? LEVELS.business;
  return (
    <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
      {meta.badge}
    </Badge>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={`mb-12 ${align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}`}>
      {eyebrow && (
        <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function TrustStrip() {
  return (
    <div className="border-y bg-surface">
      <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-6">
        {TRUST_POINTS.map((point) => (
          <div key={point.label} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <StoreIcon name={point.icon} className="h-4 w-4 text-accent" />
            </span>
            <span className="font-medium">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Elegant connected workflow chain used on product and category pages. */
export function WorkflowChain({ steps }: { steps: string[] }) {
  if (!steps?.length) return null;
  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-stretch">
      {steps.map((step, i) => (
        <div key={`${step}-${i}`} className="flex items-center gap-3 md:flex-1 md:min-w-[150px]">
          <div className="relative w-full rounded-xl border bg-card p-4 shadow-card">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-accent">
              Step {i + 1}
            </span>
            <span className="text-sm font-medium">{step}</span>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight className="hidden h-4 w-4 shrink-0 text-accent md:block" />
          )}
        </div>
      ))}
    </div>
  );
}

export function StoreCta({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
}) {
  return (
    <section className="bg-hero py-16 md:py-20">
      <div className="container text-center">
        <h2 className="text-3xl font-bold text-white md:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/70">{body}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to={primary.to}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-8 py-3 text-sm font-semibold text-accent-foreground shadow-gold transition-colors hover:bg-gold-dark"
          >
            {primary.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {secondary && (
            <Link
              to={secondary.to}
              className="inline-flex items-center justify-center rounded-md border border-white/30 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
