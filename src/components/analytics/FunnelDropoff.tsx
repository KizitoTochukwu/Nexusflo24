interface FunnelStep {
  name: string;
  visitors: number;
  conversions: number;
}

interface FunnelDropoffProps {
  steps: FunnelStep[];
  funnelName: string;
}

export default function FunnelDropoff({ steps, funnelName }: FunnelDropoffProps) {
  if (!steps.length) return null;

  const maxVisitors = steps[0]?.visitors || 1;

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium text-muted-foreground mb-3">Step-by-Step Drop-off</h4>
      {steps.map((step, i) => {
        const widthPct = Math.max((step.visitors / maxVisitors) * 100, 8);
        const prevVisitors = i > 0 ? steps[i - 1].visitors : step.visitors;
        const dropoff = prevVisitors > 0 ? Math.round(((prevVisitors - step.visitors) / prevVisitors) * 100) : 0;

        return (
          <div key={i} className="space-y-0.5">
            {i > 0 && dropoff > 0 && (
              <p className="text-[10px] text-destructive pl-2">↓ {dropoff}% drop-off</p>
            )}
            <div className="flex items-center gap-3">
              <div
                className="h-8 rounded-md bg-primary/80 flex items-center px-3 transition-all"
                style={{ width: `${widthPct}%` }}
              >
                <span className="text-[11px] font-medium text-primary-foreground truncate">
                  {step.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                {step.visitors} visitors · {step.conversions} converted
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
