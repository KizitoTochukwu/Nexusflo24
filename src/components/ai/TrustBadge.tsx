import { Badge } from "@/components/ui/badge";
import { Database, Lightbulb, PenLine, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrustLevel = "confirmed" | "insight" | "draft" | "action";

const CONFIG: Record<
  TrustLevel,
  { label: string; icon: typeof Database; className: string; title: string }
> = {
  confirmed: {
    label: "Confirmed data",
    icon: Database,
    className: "border-primary/30 bg-primary/10 text-primary",
    title: "Read directly from your workspace database.",
  },
  insight: {
    label: "AI insight",
    icon: Lightbulb,
    className: "border-accent/40 bg-accent/10 text-accent-foreground",
    title: "An AI interpretation of your data — review before acting.",
  },
  draft: {
    label: "AI draft",
    icon: PenLine,
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
    title: "Generated content. Nothing is sent or saved until you approve it.",
  },
  action: {
    label: "Needs your approval",
    icon: ShieldCheck,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    title: "Nexus AI will not change anything until you confirm.",
  },
};

export default function TrustBadge({
  level,
  className,
  label,
}: {
  level: TrustLevel;
  className?: string;
  label?: string;
}) {
  const cfg = CONFIG[level];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      title={cfg.title}
      className={cn("gap-1 rounded-full px-2 py-0 text-[10px] font-medium", cfg.className, className)}
    >
      <Icon className="h-3 w-3" />
      {label ?? cfg.label}
    </Badge>
  );
}
