import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  usePlatformAccessReviews, usePlatformAction, usePlatformStaffLastSignIn, usePlatformStaffRoles, usePlatformUsers,
} from "@/hooks/usePlatformAdmin";
import {
  PageHeader, LoadingBlock, ErrorBlock, EmptyBlock, HighRiskActionDialog,
} from "@/components/platform-admin/PlatformPrimitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PlatformSecurity() {
  const staff = usePlatformStaffRoles();
  const reviews = usePlatformAccessReviews(50);
  const users = usePlatformUsers({ pageSize: 100 });
  const signIns = usePlatformStaffLastSignIn();
  const action = usePlatformAction();
  const [review, setReview] = useState<any | null>(null);
  const [outcome, setOutcome] = useState("confirmed");

  const activeStaff = (staff.data ?? []).filter((a: any) => a.is_active);
  const emailById = new Map((users.data?.rows ?? []).map((u: any) => [u.id, u.email]));
  const signInById = new Map((signIns.data ?? []).map((s: any) => [s.user_id, s.last_sign_in_at]));
  const isStale = (userId: string) => {
    const at = signInById.get(userId);
    if (!at) return true; // never signed in
    return Date.now() - new Date(at).getTime() > 90 * 24 * 60 * 60 * 1000;
  };

  return (
    <div>
      <PageHeader
        title="Security"
        description="Review who holds elevated platform access. Every review is permanently recorded."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Active platform access</CardTitle>
          <CardDescription>{activeStaff.length} active staff grant{activeStaff.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {staff.isLoading ? (
            <LoadingBlock rows={3} />
          ) : staff.error ? (
            <ErrorBlock error={staff.error} onRetry={() => staff.refetch()} />
          ) : !activeStaff.length ? (
            <EmptyBlock title="No active platform staff" />
          ) : (
            <ul className="divide-y text-sm">
              {activeStaff.map((a: any) => {
                const lastSignIn = signInById.get(a.user_id);
                const stale = isStale(a.user_id);
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {emailById.get(a.user_id) ?? a.user_id}
                        {stale && (
                          <Badge variant="outline" className="ml-2 border-amber-500/40 text-amber-600">
                            Stale — recommend review
                          </Badge>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {String(a.role).replace(/_/g, " ")} · granted {format(new Date(a.created_at), "MMM d, yyyy")}
                        {a.reason ? ` · ${a.reason}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Last sign-in: {lastSignIn ? format(new Date(lastSignIn), "MMM d, yyyy HH:mm") : signIns.isLoading ? "…" : "Never"}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setReview(a)}>
                      Mark reviewed
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Access review history</CardTitle>
          <CardDescription>Immutable record of periodic access reviews</CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.isLoading ? (
            <LoadingBlock rows={3} />
          ) : reviews.error ? (
            <ErrorBlock error={reviews.error} onRetry={() => reviews.refetch()} />
          ) : !(reviews.data ?? []).length ? (
            <EmptyBlock title="No reviews recorded yet" description="Use “Mark reviewed” above to start an audit trail." />
          ) : (
            <ul className="divide-y text-sm">
              {(reviews.data ?? []).map((r: any) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {r.target_email ?? emailById.get(r.target_user_id) ?? r.target_user_id}
                    </p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {String(r.reviewed_role).replace(/_/g, " ")} · {format(new Date(r.created_at), "MMM d, yyyy HH:mm")}
                      {r.notes ? ` · ${r.notes}` : ""}
                    </p>
                  </div>
                  <Badge variant={r.outcome === "confirmed" ? "default" : "secondary"} className="capitalize">
                    {String(r.outcome).replace(/_/g, " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Policies & access model</CardTitle>
          <CardDescription>Checked-in documentation — a summary, not a live scan. Full version: docs/platform-security-notes.md</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Platform access is granted via staff assignments with granular role permissions; only super-admins can change grants.</li>
            <li>Every consequential platform action requires a typed reason and is appended to the immutable audit log before executing.</li>
            <li>Workspace data is read cross-tenant only through staff-guarded, security-definer RPCs — never via direct table access.</li>
            <li>Platform-internal tables are RLS-locked; the only public exception is the maintenance banner flag.</li>
            <li>Access reviews are recorded here and grants inactive for 90+ days are flagged as stale above.</li>
          </ul>
        </CardContent>
      </Card>

      <HighRiskActionDialog
        open={!!review}
        onOpenChange={(v) => !v && setReview(null)}
        title="Record access review"
        description={`Record the outcome of reviewing ${review ? String(review.role).replace(/_/g, " ") : ""} access for ${emailById.get(review?.user_id) ?? review?.user_id}.`}
        confirmLabel="Record review"
        pending={action.isPending}
        onConfirm={(reason) =>
          action.mutate(
            {
              action: "record_access_review",
              reason,
              payload: { target_user_id: review.user_id, reviewed_role: review.role, outcome, notes: reason },
            },
            {
              onSuccess: () => {
                toast.success("Review recorded");
                setReview(null);
              },
              onError: (e: any) => toast.error(e.message),
            },
          )
        }
      >
        <div>
          <label className="text-xs font-medium">Outcome</label>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmed — access is still required</SelectItem>
              <SelectItem value="flagged">Flagged — needs follow-up</SelectItem>
              <SelectItem value="revoke_requested">Revoke requested</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </HighRiskActionDialog>
    </div>
  );
}
