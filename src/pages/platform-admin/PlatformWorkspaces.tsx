import { useState } from "react";
import { toast } from "sonner";
import {
  usePlatformAccess, usePlatformAction, usePlatformWorkspaces, useSupportSessions,
} from "@/hooks/usePlatformAdmin";
import {
  PageHeader, LoadingBlock, ErrorBlock, EmptyBlock, HighRiskActionDialog,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, LifeBuoy, Coins } from "lucide-react";

const PAGE_SIZE = 25;

export default function PlatformWorkspaces() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const { can } = usePlatformAccess();
  const action = usePlatformAction();
  const sessions = useSupportSessions();
  const { data, isLoading, error, refetch } = usePlatformWorkspaces({ search, page, pageSize: PAGE_SIZE });

  const [support, setSupport] = useState<any | null>(null);
  const [credit, setCredit] = useState<any | null>(null);
  const [category, setCategory] = useState("email");
  const [quantity, setQuantity] = useState("100");

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const activeSessions = new Set(
    (sessions.data ?? [])
      .filter((s: any) => !s.ended_at && new Date(s.expires_at) > new Date())
      .map((s: any) => s.workspace_id),
  );

  return (
    <div>
      <PageHeader
        title="Workspaces"
        description="Every workspace on the platform with owner, membership and plan context."
      />

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search workspace name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <span className="ml-auto text-xs text-muted-foreground">{total} workspaces</span>
          </div>

          {isLoading ? (
            <LoadingBlock rows={6} />
          ) : error ? (
            <ErrorBlock error={error} onRetry={() => refetch()} />
          ) : !rows.length ? (
            <EmptyBlock title="No workspaces match this search" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Workspace</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium">Members</th>
                    <th className="px-3 py-2 font-medium">Leads</th>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((w: any) => (
                    <tr key={w.id} className="border-b last:border-0">
                      <td className="px-3 py-3">
                        <p className="font-medium">{w.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Created {new Date(w.created_at).toLocaleDateString("en-GB")}
                        </p>
                        {activeSessions.has(w.id) && (
                          <Badge className="mt-1 border border-accent/30 bg-accent/15 text-accent">
                            Support session active
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">{w.owner_email ?? "—"}</td>
                      <td className="px-3 py-3">{w.members}</td>
                      <td className="px-3 py-3">{w.leads}</td>
                      <td className="px-3 py-3">
                        {w.plan ? (
                          <>
                            <span className="capitalize">{w.plan}</span>
                            <p className="text-[11px] text-muted-foreground">{w.sub_status}</p>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">No subscription</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {can("platform.support.access") && (
                            <Button size="sm" variant="outline" onClick={() => setSupport(w)}>
                              <LifeBuoy className="mr-1 h-3.5 w-3.5" /> Support access
                            </Button>
                          )}
                          {can("platform.credits.adjust") && (
                            <Button size="sm" variant="outline" onClick={() => setCredit(w)}>
                              <Coins className="mr-1 h-3.5 w-3.5" /> Credits
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={(page + 1) * PAGE_SIZE >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <HighRiskActionDialog
        open={!!support}
        onOpenChange={(v) => !v && setSupport(null)}
        title="Start a support access session"
        description={`Grants you a time-limited, read-only support session on ${support?.name}. The session is recorded in the audit log.`}
        confirmLabel="Start 60-minute session"
        pending={action.isPending}
        onConfirm={(reason) =>
          action.mutate(
            { action: "start_support_session", reason, payload: { workspace_id: support.id, minutes: 60, read_only: true } },
            {
              onSuccess: () => {
                toast.success("Support session started");
                setSupport(null);
              },
              onError: (e: any) => toast.error(e.message),
            },
          )
        }
      />

      <HighRiskActionDialog
        open={!!credit}
        onOpenChange={(v) => !v && setCredit(null)}
        title="Adjust message credits"
        description={`Manually grant or deduct credits for ${credit?.name}. Every adjustment is written to the credit ledger.`}
        confirmLabel="Apply adjustment"
        pending={action.isPending}
        onConfirm={(reason) =>
          action.mutate(
            {
              action: "adjust_credits",
              reason,
              payload: { workspace_id: credit.id, category, quantity: Number(quantity) },
            },
            {
              onSuccess: (res: any) => {
                toast.success(`Balance updated: ${res.previous_balance} → ${res.new_balance}`);
                setCredit(null);
              },
              onError: (e: any) => toast.error(e.message),
            },
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Credit type</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Quantity (negative to deduct)</label>
            <Input className="mt-1" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
        </div>
      </HighRiskActionDialog>
    </div>
  );
}
