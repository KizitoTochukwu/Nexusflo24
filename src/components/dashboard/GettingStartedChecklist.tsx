import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Rocket, Loader2 } from "lucide-react";
import { useGettingStarted, useOnboarding, useSaveOnboarding } from "@/hooks/useOnboarding";

export const OPEN_CHECKLIST_EVENT = "nexusflo:open-checklist";

const GettingStartedChecklist = ({ workspaceId }: { workspaceId: string }) => {
  const { items, completed, total, percent, isLoading } = useGettingStarted(workspaceId);
  const { data: record } = useOnboarding(workspaceId);
  const save = useSaveOnboarding(workspaceId);

  const [dismissed, setDismissed] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || !record) return;
    setDismissed(Boolean(record.checklist_dismissed));
    setMinimized(Boolean(record.checklist_minimized));
    setHydrated(true);
  }, [record, hydrated]);

  useEffect(() => {
    const reopen = () => {
      setDismissed(false);
      setMinimized(false);
      save.mutate({ checklist_dismissed: false, checklist_minimized: false } as any);
    };
    window.addEventListener(OPEN_CHECKLIST_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CHECKLIST_EVENT, reopen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const update = (patch: { checklist_dismissed?: boolean; checklist_minimized?: boolean }) => {
    save.mutate(patch as any);
  };

  if (dismissed) return null;

  return (
    <section
      data-tour="getting-started"
      className="mb-6 overflow-hidden rounded-2xl border bg-background shadow-sm"
      aria-label="Getting started checklist"
    >
      <div className="flex flex-wrap items-center gap-3 border-b bg-gradient-to-r from-primary/5 to-accent/10 px-4 py-3 sm:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Rocket className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-foreground sm:text-base">Getting started</h2>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Checking your setup…" : `${completed} of ${total} complete · ${percent}%`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setMinimized((m) => !m); update({ checklist_minimized: !minimized }); }}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={minimized ? "Expand checklist" : "Minimise checklist"}
          >
            {minimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            onClick={() => { setDismissed(true); update({ checklist_dismissed: true }); }}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="w-full">
          <Progress value={percent} className="h-1.5" />
        </div>
      </div>

      {!minimized && (
        <div className="divide-y">
          {isLoading && (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-5">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your progress…
            </div>
          )}
          {!isLoading && items.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
              {item.done
                ? <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                : <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Button asChild size="sm" variant={item.done ? "ghost" : "outline"} className="w-full sm:w-auto">
                <Link to={item.to ?? "#"}>{item.done ? "Review" : item.actionLabel}</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default GettingStartedChecklist;
