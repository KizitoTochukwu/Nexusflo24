import { useMemo, useState } from "react";
import { KeyRound, Plus, RotateCcw, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import StoreSetupCard from "@/components/commerce/StoreSetupCard";
import { useShopProducts, useShopStore } from "@/hooks/useCommerce";
import {
  entitlementKindLabel,
  useGrantEntitlement,
  useSetEntitlementStatus,
  useStoreEntitlements,
  type EntitlementKind,
} from "@/hooks/useEntitlements";
import { courses as ACADEMY_COURSES } from "@/data/academyCourses";

const KINDS: EntitlementKind[] = ["course", "membership", "digital", "community", "service"];

export default function CommerceAccess() {
  const { data: store, isLoading } = useShopStore();
  const { data: products = [] } = useShopProducts(store?.id);
  const { data: rows = [], isLoading: loadingRows } = useStoreEntitlements(store?.id);
  const grant = useGrantEntitlement(store?.id);
  const setStatus = useSetEntitlementStatus(store?.id);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<EntitlementKind>("course");
  const [ref, setRef] = useState("");
  const [expires, setExpires] = useState("");

  const refOptions = useMemo(() => {
    if (kind === "course") {
      return ACADEMY_COURSES.map((c: any) => ({ value: c.slug, label: c.title }));
    }
    return (products as any[])
      .filter((p) => (kind === "membership" ? p.product_type === "membership" : true))
      .map((p) => ({ value: p.id, label: p.name }));
  }, [kind, products]);

  const visible = rows.filter((r) => (filter === "all" ? true : r.status === filter));

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!store) return <StoreSetupCard />;

  const submit = () => {
    if (!email.trim() || !ref) return;
    const label = refOptions.find((o) => o.value === ref)?.label ?? null;
    grant.mutate(
      {
        email,
        kind,
        resource_ref: ref,
        resource_label: label,
        product_id: kind === "course" ? null : ref,
        expires_at: expires || null,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setEmail("");
          setRef("");
          setExpires("");
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Access</h2>
          <p className="text-sm text-muted-foreground">
            Courses, memberships and downloads unlocked by purchases. Refunded and cancelled orders revoke access
            automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-1 h-4 w-4" /> Grant access</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Grant access manually</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ent-email">Customer email</Label>
                  <Input
                    id="ent-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="buyer@example.com"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={kind} onValueChange={(v) => { setKind(v as EntitlementKind); setRef(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KINDS.map((k) => (
                        <SelectItem key={k} value={k}>{entitlementKindLabel(k)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{kind === "course" ? "Academy course" : "Product"}</Label>
                  <Select value={ref} onValueChange={setRef}>
                    <SelectTrigger><SelectValue placeholder="Choose what to unlock" /></SelectTrigger>
                    <SelectContent>
                      {refOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ent-expires">Expires (optional)</Label>
                  <Input
                    id="ent-expires"
                    type="date"
                    value={expires}
                    onChange={(e) => setExpires(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit} disabled={grant.isPending || !email.trim() || !ref}>Grant</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loadingRows ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No access records yet. They appear automatically when a course, membership or digital product is bought.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Unlocks</th>
                <th className="p-3">Type</th>
                <th className="p-3">Source</th>
                <th className="p-3">Granted</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="p-3">{r.email}</td>
                  <td className="p-3">
                    <p className="font-medium">{r.resource_label ?? r.resource_ref}</p>
                    {r.expires_at && (
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(r.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="p-3">{entitlementKindLabel(r.kind)}</td>
                  <td className="p-3 capitalize">{r.source}</td>
                  <td className="p-3">{new Date(r.granted_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <Badge variant={r.status === "active" ? "default" : "secondary"}>
                      {r.status}
                      {r.status === "revoked" && r.revoke_reason ? ` · ${r.revoke_reason}` : ""}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    {r.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus.mutate({ id: r.id, status: "revoked" })}
                      >
                        <ShieldOff className="mr-1 h-3.5 w-3.5" /> Revoke
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus.mutate({ id: r.id, status: "active" })}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
