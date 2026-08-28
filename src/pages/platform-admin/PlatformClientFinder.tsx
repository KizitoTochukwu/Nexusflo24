import { useState } from "react";
import PlatformAdminLayout from "@/components/platform-admin/PlatformAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  usePlatformClientFinderHealth,
  useSetCfWorkspaceControl,
  useUpdateCfPlanLimits,
} from "@/hooks/useClientFinderReports";

const LIMIT_FIELDS = [
  { key: "max_campaigns", label: "Campaigns" },
  { key: "max_mailboxes", label: "Mailboxes" },
  { key: "monthly_emails", label: "Emails / month" },
  { key: "monthly_ai_ops", label: "AI ops / month" },
  { key: "monthly_verifications", label: "Verifications / month" },
  { key: "monthly_discoveries", label: "Prospects / month" },
] as const;

export default function PlatformClientFinder() {
  const { data, isLoading, error } = usePlatformClientFinderHealth();
  const updateLimits = useUpdateCfPlanLimits();
  const setControl = useSetCfWorkspaceControl();

  const [draft, setDraft] = useState<Record<string, Record<string, any>>>({});
  const [wsId, setWsId] = useState("");
  const [reason, setReason] = useState("");

  const plans: any[] = data?.plan_limits ?? [];
  const controls: any[] = data?.controls ?? [];
  const top: any[] = data?.top_workspaces ?? [];

  const valueFor = (plan: any, key: string) =>
    draft[plan.plan]?.[key] ?? plan[key];

  return (
    <PlatformAdminLayout title="AI Client Finder" description="Plan allowances, workspace access and module health.">
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Could not load Client Finder health. {(error as any).message}
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Workspaces using it", value: data.totals.workspaces_using },
              { label: "Active campaigns", value: data.totals.active_campaigns },
              { label: "Connected mailboxes", value: data.totals.mailboxes },
              { label: "Prospect companies", value: data.totals.prospect_companies },
              { label: "Emails sent (30d)", value: data.emails_30d.sent },
              { label: "Emails failed (30d)", value: data.emails_30d.failed },
              { label: "Replies (30d)", value: data.replies_30d },
              { label: "Sends due now", value: data.queue.due_now },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value ?? 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Plan allowances</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    {LIMIT_FIELDS.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
                    <TableHead>Exports</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => (
                    <TableRow key={p.plan}>
                      <TableCell className="font-medium capitalize">{p.plan}</TableCell>
                      {LIMIT_FIELDS.map((f) => (
                        <TableCell key={f.key}>
                          <Input
                            type="number"
                            className="w-24"
                            value={valueFor(p, f.key)}
                            aria-label={`${p.plan} ${f.label}`}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                [p.plan]: { ...d[p.plan], [f.key]: Number(e.target.value) },
                              }))
                            }
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Switch
                          checked={Boolean(valueFor(p, "exports_enabled"))}
                          aria-label={`${p.plan} exports enabled`}
                          onCheckedChange={(v) =>
                            setDraft((d) => ({
                              ...d,
                              [p.plan]: { ...d[p.plan], exports_enabled: v },
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          disabled={!draft[p.plan] || updateLimits.isPending}
                          onClick={() => updateLimits.mutate({ plan: p.plan, ...draft[p.plan] })}
                        >
                          Save
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="pt-3 text-xs text-muted-foreground">
                Limits are enforced by the server on every send, AI call and mailbox connection. No code change is
                needed to adjust them.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Workspace access</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                <div className="space-y-1">
                  <Label htmlFor="cf-ws">Workspace ID</Label>
                  <Input id="cf-ws" placeholder="00000000-0000-0000-0000-000000000000" value={wsId} onChange={(e) => setWsId(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cf-reason">Reason</Label>
                  <Input id="cf-reason" placeholder="Why is this being changed?" value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <Button
                  variant="destructive"
                  disabled={!wsId || !reason || setControl.isPending}
                  onClick={() => setControl.mutate({ workspace_id: wsId, suspended: true, suspension_reason: reason })}
                >
                  Suspend
                </Button>
                <Button
                  variant="outline"
                  disabled={!wsId || setControl.isPending}
                  onClick={() => setControl.mutate({ workspace_id: wsId, suspended: false, enabled: true, suspension_reason: null })}
                >
                  Restore
                </Button>
              </div>

              {controls.length === 0 ? (
                <p className="text-sm text-muted-foreground">No workspace has a custom Client Finder control.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {controls.map((c) => (
                      <TableRow key={c.workspace_id}>
                        <TableCell>{c.workspace_name || c.workspace_id}</TableCell>
                        <TableCell>
                          {c.suspended ? <Badge variant="destructive">Suspended</Badge>
                            : c.enabled ? <Badge variant="secondary">Enabled</Badge>
                            : <Badge variant="outline">Disabled</Badge>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.suspension_reason || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.updated_at ? new Date(c.updated_at).toLocaleString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Busiest workspaces (30 days)</CardTitle></CardHeader>
            <CardContent>
              {top.length === 0 ? (
                <p className="text-sm text-muted-foreground">No outbound activity recorded in the last 30 days.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Failed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top.map((t) => (
                      <TableRow key={t.workspace_id}>
                        <TableCell>{t.workspace_name || t.workspace_id}</TableCell>
                        <TableCell>{t.sent}</TableCell>
                        <TableCell className={Number(t.failed) > 0 ? "text-destructive" : undefined}>{t.failed}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PlatformAdminLayout>
  );
}
