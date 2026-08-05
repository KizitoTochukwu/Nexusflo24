import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { useOnboarding, useGettingStarted, useSaveOnboarding } from "@/hooks/useOnboarding";
import { OPEN_TOUR_EVENT } from "@/components/onboarding/ProductTour";
import { OPEN_CHECKLIST_EVENT } from "@/components/dashboard/GettingStartedChecklist";
import { Sparkles, ListChecks } from "lucide-react";

const OnboardingTab = ({ workspaceId }: { workspaceId: string }) => {
  const { data: record } = useOnboarding(workspaceId);
  const { completed, total, percent } = useGettingStarted(workspaceId);
  const save = useSaveOnboarding(workspaceId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Onboarding</CardTitle>
              <CardDescription>Review or update the answers you gave when setting up your workspace.</CardDescription>
            </div>
            <Badge variant={record?.completed ? "secondary" : "outline"}>
              {record?.completed ? "Completed" : "In progress"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => { save.mutate({ tour_completed: false } as any); window.dispatchEvent(new Event(OPEN_TOUR_EVENT)); }}>
            <Sparkles className="h-4 w-4" /> Replay product tour
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => { save.mutate({ checklist_dismissed: false, checklist_minimized: false } as any); window.dispatchEvent(new Event(OPEN_CHECKLIST_EVENT)); }}>
            <ListChecks className="h-4 w-4" /> Reopen Getting Started ({completed}/{total} · {percent}%)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <OnboardingWizard workspaceId={workspaceId} embedded />
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingTab;
