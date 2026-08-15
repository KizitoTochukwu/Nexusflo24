import { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Info, Minus, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AD_PROVIDERS, type AdProvider } from "@/lib/ads/constants";

export function MetricHint({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={text} className="text-muted-foreground/60 transition-colors hover:text-foreground">
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px] text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function KpiCard({
  label, value, hint, change, icon: Icon, loading, invertChange = false,
}: {
  label: string;
  value: string;
  hint?: string;
  change?: number | null;
  icon?: LucideIcon;
  loading?: boolean;
  /** When true, a decrease is good (e.g. cost per lead). */
  invertChange?: boolean;
}) {
  const positive = change != null && (invertChange ? change < 0 : change > 0);
  const negative = change != null && (invertChange ? change > 0 : change < 0);

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {Icon && <Icon className="h-3.5 w-3.5 text-accent" />}
            <span className="truncate">{label}</span>
            {hint && <MetricHint text={hint} />}
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        )}
        {!loading && change != null && (
          <p className={`flex items-center gap-1 text-xs font-medium ${
            positive ? "text-emerald-600" : negative ? "text-destructive" : "text-muted-foreground"
          }`}>
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : negative ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            {Math.abs(change).toFixed(1)}% vs previous period
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ProviderBadge({ provider }: { provider: AdProvider | string | null }) {
  const meta = provider ? AD_PROVIDERS[provider as AdProvider] : undefined;
  if (!meta) return <Badge variant="outline" className="text-[11px]">Unknown</Badge>;
  return (
    <Badge variant="outline" className="gap-1 border-border/70 text-[11px] font-medium">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
      {meta.shortLabel}
    </Badge>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  paused: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  draft: "bg-muted text-muted-foreground border-border",
  ended: "bg-muted text-muted-foreground border-border",
  connected: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  needs_attention: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  disconnected: "bg-muted text-muted-foreground border-border",
  pending: "bg-sky-500/10 text-sky-700 border-sky-500/30",
};

export function StatusPill({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <Badge variant="outline" className={`text-[11px] capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
      {label}
    </Badge>
  );
}

export function AdsEmptyState({
  icon: Icon, title, description, action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed border-border/70">
      <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export function CardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
