import { useCreditLedger } from "@/hooks/usePlatformAdmin";
import {
  PageHeader, LoadingBlock, ErrorBlock, EmptyBlock,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PlatformCredits() {
  const { data, isLoading, error, refetch } = useCreditLedger();

  return (
    <div>
      <PageHeader
        title="Usage & Credits"
        description="Append-only ledger of every manual credit grant or deduction made from Platform Admin."
      />

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <LoadingBlock rows={5} />
          ) : error ? (
            <ErrorBlock error={error} onRetry={() => refetch()} />
          ) : !data?.length ? (
            <EmptyBlock
              title="No manual credit adjustments yet"
              description="Adjust credits from the Workspaces screen; every change is recorded here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Workspace</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Change</th>
                    <th className="px-3 py-2 font-medium">Balance</th>
                    <th className="px-3 py-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row: any) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString("en-GB")}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px]">{row.workspace_id?.slice(0, 8)}</td>
                      <td className="px-3 py-3 capitalize">{row.category}</td>
                      <td className="px-3 py-3">
                        <Badge variant={Number(row.quantity) > 0 ? "default" : "destructive"}>
                          {Number(row.quantity) > 0 ? "+" : ""}
                          {row.quantity}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {row.previous_balance} → {row.new_balance}
                      </td>
                      <td className="px-3 py-3 max-w-xs truncate text-xs text-muted-foreground">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
