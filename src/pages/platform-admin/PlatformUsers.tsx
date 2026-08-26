import { useState } from "react";
import { toast } from "sonner";
import { usePlatformAccess, usePlatformAction, usePlatformUsers } from "@/hooks/usePlatformAdmin";
import {
  PageHeader, LoadingBlock, ErrorBlock, EmptyBlock, HighRiskActionDialog,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, KeyRound, Ban, RotateCcw, Crown } from "lucide-react";

const PAGE_SIZE = 25;

export default function PlatformUsers() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const { can } = usePlatformAccess();
  const action = usePlatformAction();

  const { data, isLoading, error, refetch } = usePlatformUsers({
    search,
    status: status === "all" ? "" : status,
    page,
    pageSize: PAGE_SIZE,
  });

  const [dialog, setDialog] = useState<{ type: "suspend" | "reactivate"; user: any } | null>(null);

  const run = (type: "suspend_user" | "reactivate_user", user: any, reason: string) => {
    action.mutate(
      { action: type, reason, payload: { user_id: user.id } },
      {
        onSuccess: () => {
          toast.success(type === "suspend_user" ? "Account suspended" : "Account reactivated");
          setDialog(null);
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const sendReset = (user: any) => {
    action.mutate(
      { action: "send_password_reset", reason: "Password reset requested from Platform Admin", payload: { email: user.email } },
      {
        onSuccess: () => toast.success("Password reset link generated"),
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Users"
        description="Every account on the platform, with real sign-in, workspace and subscription data."
      />

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">{total} accounts</span>
          </div>

          {isLoading ? (
            <LoadingBlock rows={6} />
          ) : error ? (
            <ErrorBlock error={error} onRetry={() => refetch()} />
          ) : !rows.length ? (
            <EmptyBlock title="No users match this filter" description="Try clearing the search or status filter." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Account</th>
                    <th className="px-3 py-2 font-medium">Subscription</th>
                    <th className="px-3 py-2 font-medium">Workspaces</th>
                    <th className="px-3 py-2 font-medium">Last sign-in</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u: any) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="px-3 py-3">
                        <p className="font-medium">{u.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        {u.is_staff && (
                          <Badge className="mt-1 border border-accent/30 bg-accent/15 text-accent">
                            <Crown className="mr-1 h-3 w-3" />
                            {String(u.platform_role ?? "staff").replace(/_/g, " ")}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={u.account_status === "suspended" ? "destructive" : "secondary"}>
                          {u.account_status}
                        </Badge>
                        {!u.email_confirmed_at && (
                          <p className="mt-1 text-[11px] text-muted-foreground">Email unverified</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {u.plan ? (
                          <>
                            <span className="capitalize">{u.plan}</span>
                            <p className="text-[11px] text-muted-foreground">{u.sub_status}</p>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">No subscription record</span>
                        )}
                      </td>
                      <td className="px-3 py-3">{u.workspaces}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("en-GB") : "Never"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" onClick={() => sendReset(u)}>
                            <KeyRound className="mr-1 h-3.5 w-3.5" /> Reset
                          </Button>
                          {can("platform.users.suspend") &&
                            (u.account_status === "suspended" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDialog({ type: "reactivate", user: u })}
                              >
                                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reactivate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDialog({ type: "suspend", user: u })}
                              >
                                <Ban className="mr-1 h-3.5 w-3.5" /> Suspend
                              </Button>
                            ))}
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
        open={!!dialog}
        onOpenChange={(v) => !v && setDialog(null)}
        title={dialog?.type === "suspend" ? "Suspend this account" : "Reactivate this account"}
        description={
          dialog?.type === "suspend"
            ? `Suspending ${dialog?.user?.email} blocks access immediately and signs out all their sessions.`
            : `This restores access for ${dialog?.user?.email}.`
        }
        confirmLabel={dialog?.type === "suspend" ? "Suspend account" : "Reactivate account"}
        confirmWord={dialog?.type === "suspend" ? "SUSPEND" : undefined}
        pending={action.isPending}
        onConfirm={(reason) =>
          dialog && run(dialog.type === "suspend" ? "suspend_user" : "reactivate_user", dialog.user, reason)
        }
      />
    </div>
  );
}
