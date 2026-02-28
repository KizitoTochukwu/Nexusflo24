import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookTemplate, Layers } from "lucide-react";
import { FUNNEL_TEMPLATES } from "@/lib/funnelTemplates";
import { OBJECTIVE_OPTIONS, useCreateFunnel } from "@/hooks/useFunnels";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useNavigate } from "react-router-dom";

const DashboardTemplates = () => {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const createFunnel = useCreateFunnel();

  const objectiveLabel = (v: string) =>
    OBJECTIVE_OPTIONS.find((o) => o.value === v)?.label || v;

  const handleUse = (tpl: (typeof FUNNEL_TEMPLATES)[number]) => {
    createFunnel.mutate(
      {
        workspace_id: workspaceId,
        name: tpl.name,
        description: tpl.description,
        objective: tpl.objective,
        steps: tpl.steps.map((s) => ({
          step_type: s.step_type,
          page_content: s.page_content as Record<string, unknown>,
        })),
      },
      {
        onSuccess: (data: any) => {
          navigate(`/dashboard/${workspaceId}/funnels/${data.id}`);
        },
      }
    );
  };

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with a proven funnel layout. Click "Use template" to create an editable copy.
        </p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FUNNEL_TEMPLATES.map((tpl) => (
          <Card key={tpl.id} className="flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{tpl.name}</CardTitle>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {objectiveLabel(tpl.objective)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{tpl.description}</p>
              <div className="flex items-center gap-1.5 text-xs">
                <Layers className="h-3.5 w-3.5" />
                {tpl.steps.length} step{tpl.steps.length > 1 ? "s" : ""}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full gap-2"
                onClick={() => handleUse(tpl)}
                disabled={createFunnel.isPending}
              >
                <BookTemplate className="h-4 w-4" />
                {createFunnel.isPending ? "Creating…" : "Use template"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default DashboardTemplates;
