import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useDuplicateCandidates,
  useResolveDuplicate,
  useScanDuplicates,
  type DuplicateContactInfo,
} from "@/hooks/useCustomerJourney";

const nameOf = (c?: DuplicateContactInfo | null) =>
  [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email || c?.phone || "Unnamed contact";

const REASON_LABEL: Record<string, string> = {
  same_email: "Same email address",
  same_phone: "Same phone number",
};

const DuplicateReviewPanel = ({ workspaceId, base }: { workspaceId?: string; base: string }) => {
  const { data: candidates = [], isLoading } = useDuplicateCandidates(workspaceId);
  const scan = useScanDuplicates(workspaceId);
  const resolve = useResolveDuplicate(workspaceId);

  const runScan = () =>
    scan.mutate(undefined, {
      onSuccess: (r) =>
        toast.success(
          r.created > 0
            ? `${r.created} new duplicate pair${r.created === 1 ? "" : "s"} found`
            : "No new duplicates found",
        ),
      onError: (e: any) => toast.error(e?.message || "Duplicate scan failed"),
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CopyCheck className="h-4 w-4" /> Duplicate review
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Contacts sharing an email or phone. Nothing is merged automatically — review and decide.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={runScan} disabled={scan.isPending}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${scan.isPending ? "animate-spin" : ""}`} />
          Scan
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : candidates.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            No pending duplicates. Run a scan to check again.
          </div>
        ) : (
          candidates.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{REASON_LABEL[c.match_reason] || c.match_reason}</Badge>
                {c.confidence != null && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(Number(c.confidence) * 100)}% confidence
                  </span>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[c.contact, c.duplicate].map((person, i) => (
                  <div key={i} className="rounded-md bg-muted/40 p-2 text-sm">
                    <Link
                      to={`${base}/crm/contacts/${person?.id}`}
                      className="font-medium hover:underline"
                    >
                      {nameOf(person)}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{person?.email || "No email"}</p>
                    <p className="truncate text-xs text-muted-foreground">{person?.phone || "No phone"}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {person ? new Date(person.created_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={resolve.isPending}
                  onClick={() =>
                    resolve.mutate(
                      { id: c.id },
                      {
                        onSuccess: () => toast.success("Marked as reviewed"),
                        onError: (e: any) => toast.error(e?.message || "Could not update"),
                      },
                    )
                  }
                >
                  Keep both
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default DuplicateReviewPanel;
