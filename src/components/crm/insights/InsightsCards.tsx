import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const InsightsStat = ({
  label, value, hint, icon: Icon,
}: { label: string; value: string; hint?: string; icon?: React.ComponentType<{ className?: string }> }) => (
  <Card className="rounded-2xl">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </CardContent>
  </Card>
);

export const InsightsCard = ({
  title, description, action, children,
}: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <Card className="rounded-2xl">
    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
      <div>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </CardHeader>
    <CardContent className="pt-0">{children}</CardContent>
  </Card>
);

export const EmptyHint = ({ children }: { children: React.ReactNode }) => (
  <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>
);

/** Horizontal bar list — used for stage funnels, sources, leaderboards. */
export const BarList = ({
  items, formatValue, emptyLabel,
}: {
  items: { label: string; value: number; caption?: string; color?: string | null }[];
  formatValue?: (n: number) => string;
  emptyLabel: string;
}) => {
  const max = useMemo(() => Math.max(1, ...items.map((i) => i.value)), [items]);
  if (!items.length) return <EmptyHint>{emptyLabel}</EmptyHint>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{item.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatValue ? formatValue(item.value) : item.value}
              {item.caption ? ` · ${item.caption}` : ""}
            </span>
          </div>
          <Progress value={(item.value / max) * 100} className="h-2" />
        </div>
      ))}
    </div>
  );
};

export const CountRow = ({ label, value, tone }: { label: string; value: number; tone?: "danger" | "warn" | "ok" }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
    <span className="truncate text-sm">{label}</span>
    <Badge
      variant="outline"
      className={
        tone === "danger" ? "border-destructive/40 text-destructive"
          : tone === "warn" ? "border-amber-500/40 text-amber-600"
            : tone === "ok" ? "border-emerald-500/40 text-emerald-600" : ""
      }
    >
      {value}
    </Badge>
  </div>
);
