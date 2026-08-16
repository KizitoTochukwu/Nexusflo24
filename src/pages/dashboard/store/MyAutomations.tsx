import { Link } from "react-router-dom";
import { ArrowRight, PackageOpen } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useMyStoreProjects, projectStatusLabel } from "@/hooks/useStoreOrders";

export default function MyAutomations() {
  const workspaceId = useWorkspaceId();
  const { data: projects = [], isLoading } = useMyStoreProjects();

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Automations</h1>
            <p className="text-sm text-muted-foreground">
              Every automation you have purchased, with live build progress.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/automations/all">Browse the store</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center">
            <PackageOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No automation projects yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Purchases from the Automation Store appear here with their delivery progress.
            </p>
            <Button asChild className="mt-6">
              <Link to="/automations">Explore the Automation Store</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((p) => (
              <div key={p.id} className="rounded-2xl border bg-card p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{p.name}</h2>
                  <Badge variant={p.status === "live" ? "default" : "secondary"}>
                    {projectStatusLabel(p.status)}
                  </Badge>
                </div>
                <Progress value={p.progress} className="mt-4" />
                <p className="mt-2 text-xs text-muted-foreground">{p.progress}% complete</p>
                {!p.onboarding_completed_at && (
                  <p className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
                    Onboarding outstanding — we need a few details before the build starts.
                  </p>
                )}
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link to={`/dashboard/${workspaceId}/my-automations/${p.id}`}>
                    View project <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
