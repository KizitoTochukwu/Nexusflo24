import { usePlatformPlans } from "@/hooks/usePlatformAdmin";
import {
  PageHeader, LoadingBlock, ErrorBlock, EmptyBlock,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PlatformPlans() {
  const { data, isLoading, error, refetch } = usePlatformPlans();

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Versioned plan catalogue. Prices shown are the current published version of each plan."
      />

      {isLoading ? (
        <LoadingBlock rows={4} />
      ) : error ? (
        <ErrorBlock error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyBlock title="No plans defined" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.map((plan: any) => {
            const versions = (plan.platform_plan_versions ?? []) as any[];
            const current = versions.find((v) => v.is_current) ?? versions[0];
            return (
              <Card key={plan.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <Badge variant={plan.status === "active" ? "default" : "secondary"}>{plan.status}</Badge>
                  </div>
                  <CardDescription>{plan.description || plan.code}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {current ? (
                    <>
                      <p className="text-2xl font-semibold">
                        {current.currency === "GBP" ? "£" : "$"}
                        {Number(current.monthly_price ?? 0).toFixed(0)}
                        <span className="text-xs font-normal text-muted-foreground">/mo</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Annual {current.currency === "GBP" ? "£" : "$"}
                        {Number(current.annual_price ?? 0).toFixed(0)} · v{current.version}
                        {current.trial_days ? ` · ${current.trial_days}-day trial` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {versions.length} version{versions.length === 1 ? "" : "s"} recorded
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No published version</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Plan pricing is versioned: editing prices creates a new version so existing subscribers keep the terms they
        signed up on. Editing from this screen is not enabled yet — changes are made through a migration.
      </p>
    </div>
  );
}
