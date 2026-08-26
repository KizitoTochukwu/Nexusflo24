import { useState } from "react";
import { toast } from "sonner";
import {
  usePlatformAction, usePlatformStaffRoles, usePlatformUsers,
} from "@/hooks/usePlatformAdmin";
import {
  PageHeader, LoadingBlock, ErrorBlock, EmptyBlock, HighRiskActionDialog,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLES = [
  { value: "super_admin", label: "Super Admin", hint: "Full control, including roles and settings" },
  { value: "operations_admin", label: "Operations Admin", hint: "Users, workspaces, automations, integrations" },
  { value: "billing_admin", label: "Billing Admin", hint: "Plans, subscriptions, credits, refunds" },
  { value: "support_agent", label: "Support Agent", hint: "Read-only support access sessions" },
  { value: "content_manager", label: "Content Manager", hint: "Blog, pages, academy content" },
  { value: "read_only_analyst", label: "Read-only Analyst", hint: "Metrics and reporting only" },
];

export default function PlatformStaff() {
  const staff = usePlatformStaffRoles();
  const action = usePlatformAction();
  const [search, setSearch] = useState("");
  const users = usePlatformUsers({ search, pageSize: 10 });

  const [assign, setAssign] = useState<any | null>(null);
  const [role, setRole] = useState("support_agent");
  const [revoke, setRevoke] = useState<any | null>(null);

  const emailById = new Map((users.data?.rows ?? []).map((u: any) => [u.id, u.email]));

  return (
    <div>
      <PageHeader title="Platform Staff" description="Granular platform roles. Staff cannot change their own roles." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current assignments</CardTitle>
            <CardDescription>Active and revoked platform role grants</CardDescription>
          </CardHeader>
          <CardContent>
            {staff.isLoading ? (
              <LoadingBlock />
            ) : staff.error ? (
              <ErrorBlock error={staff.error} onRetry={() => staff.refetch()} />
            ) : !staff.data?.length ? (
              <EmptyBlock title="No platform staff assigned yet" />
            ) : (
              <ul className="divide-y text-sm">
                {staff.data.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{emailById.get(a.user_id) ?? a.user_id}</p>
                      <p className="text-[11px] capitalize text-muted-foreground">
                        {String(a.role).replace(/_/g, " ")} · {a.is_active ? "active" : "revoked"}
                      </p>
                    </div>
                    {a.is_active ? (
                      <Button size="sm" variant="destructive" onClick={() => setRevoke(a)}>
                        Revoke
                      </Button>
                    ) : (
                      <Badge variant="secondary">Revoked</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Grant a role</CardTitle>
            <CardDescription>Search an account, then assign a platform role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search by email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {users.isLoading ? (
              <LoadingBlock rows={3} />
            ) : !users.data?.rows?.length ? (
              <EmptyBlock title="No matching accounts" />
            ) : (
              <ul className="divide-y text-sm">
                {users.data.rows.map((u: any) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="truncate">{u.email}</span>
                    <Button size="sm" variant="outline" onClick={() => setAssign(u)}>
                      Assign role
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <HighRiskActionDialog
        open={!!assign}
        onOpenChange={(v) => !v && setAssign(null)}
        title="Assign a platform role"
        description={`Grant elevated platform permissions to ${assign?.email}.`}
        confirmLabel="Grant role"
        confirmWord="GRANT"
        pending={action.isPending}
        onConfirm={(reason) =>
          action.mutate(
            { action: "assign_platform_role", reason, payload: { user_id: assign.id, role } },
            {
              onSuccess: () => {
                toast.success("Role granted");
                setAssign(null);
              },
              onError: (e: any) => toast.error(e.message),
            },
          )
        }
      >
        <div>
          <label className="text-xs font-medium">Role</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {ROLES.find((r) => r.value === role)?.hint}
          </p>
        </div>
      </HighRiskActionDialog>

      <HighRiskActionDialog
        open={!!revoke}
        onOpenChange={(v) => !v && setRevoke(null)}
        title="Revoke platform role"
        description="This removes elevated platform access. The last active Super Admin cannot be removed."
        confirmLabel="Revoke role"
        confirmWord="REVOKE"
        pending={action.isPending}
        onConfirm={(reason) =>
          action.mutate(
            { action: "revoke_platform_role", reason, payload: { user_id: revoke.user_id, role: revoke.role } },
            {
              onSuccess: () => {
                toast.success("Role revoked");
                setRevoke(null);
              },
              onError: (e: any) => toast.error(e.message),
            },
          )
        }
      />
    </div>
  );
}
