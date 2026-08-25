import { useState } from "react";
import { ExternalLink, Plus, Trash2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import StoreSetupCard from "@/components/commerce/StoreSetupCard";
import { useShopProducts, useShopStore } from "@/hooks/useCommerce";
import {
  Community, useCommunities, useCommunityMembers, useDeleteCommunity, useSaveCommunity,
} from "@/hooks/useCommunity";

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

const emptyForm = {
  id: undefined as string | undefined,
  name: "",
  slug: "",
  tagline: "",
  description: "",
  access_type: "free" as "free" | "paid",
  visibility: "public" as "public" | "private",
  product_id: "none",
  guidelines: "",
};

export default function CommerceCommunity() {
  const { data: store, isLoading } = useShopStore();
  const { data: communities = [], isLoading: loadingCommunities } = useCommunities(store?.id);
  const { data: products = [] } = useShopProducts(store?.id);
  const save = useSaveCommunity();
  const remove = useDeleteCommunity();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Community | null>(null);
  const { data: members = [] } = useCommunityMembers(selected?.id);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!store) return <StoreSetupCard />;

  const edit = (c: Community) => {
    setForm({
      id: c.id,
      name: c.name,
      slug: c.slug,
      tagline: c.tagline ?? "",
      description: c.description ?? "",
      access_type: c.access_type,
      visibility: c.visibility,
      product_id: c.product_id ?? "none",
      guidelines: c.guidelines ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    await save.mutateAsync({
      ...(form.id ? { id: form.id } : {}),
      workspace_id: store.workspace_id,
      store_id: store.id,
      name: form.name.trim(),
      slug: form.slug ? slugify(form.slug) : slugify(form.name),
      tagline: form.tagline || null,
      description: form.description || null,
      access_type: form.access_type,
      visibility: form.visibility,
      product_id: form.product_id === "none" ? null : form.product_id,
      guidelines: form.guidelines || null,
    } as any);
    setOpen(false);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Community</h2>
          <p className="text-sm text-muted-foreground">
            Run free or paid communities alongside your products.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New community</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit community" : "Create a community"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="c-name">Name</Label>
                <Input id="c-name" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="c-slug">URL slug</Label>
                <Input id="c-slug" placeholder={slugify(form.name) || "inner-circle"} value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="c-tagline">Tagline</Label>
                <Input id="c-tagline" value={form.tagline}
                  onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="c-desc">Description</Label>
                <Textarea id="c-desc" rows={3} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Access</Label>
                  <Select value={form.access_type}
                    onValueChange={(v: "free" | "paid") => setForm((f) => ({ ...f, access_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free to join</SelectItem>
                      <SelectItem value="paid">Paid (product)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Visibility</Label>
                  <Select value={form.visibility}
                    onValueChange={(v: "public" | "private") => setForm((f) => ({ ...f, visibility: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Listed publicly</SelectItem>
                      <SelectItem value="private">Hidden (members only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.access_type === "paid" && (
                <div>
                  <Label>Unlocked by product</Label>
                  <Select value={form.product_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, product_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choose a product" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No product yet</SelectItem>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Buyers of this product are added to the community automatically once their order is paid.
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="c-rules">Community guidelines</Label>
                <Textarea id="c-rules" rows={2} value={form.guidelines}
                  onChange={(e) => setForm((f) => ({ ...f, guidelines: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={save.isPending || !form.name.trim()}>
                {form.id ? "Save changes" : "Create community"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loadingCommunities ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : communities.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">
          No communities yet. Create one to give customers a place to gather.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {communities.map((c) => (
            <div key={c.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{c.name}</h3>
                    <Badge variant={c.access_type === "paid" ? "default" : "secondary"}>
                      {c.access_type === "paid" ? "Paid" : "Free"}
                    </Badge>
                    {c.visibility === "private" && <Badge variant="outline">Hidden</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.tagline ?? c.description ?? "—"}</p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {c.member_count} member{c.member_count === 1 ? "" : "s"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)} aria-label="Delete community">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => edit(c)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(selected?.id === c.id ? null : c)}>
                  {selected?.id === c.id ? "Hide members" : "Members"}
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`/s/${store.slug}/community/${c.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> View
                  </Link>
                </Button>
              </div>

              {selected?.id === c.id && (
                <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                  {members.length === 0 ? (
                    <p className="text-muted-foreground">No members yet.</p>
                  ) : (
                    members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-3">
                        <span className="truncate">{m.display_name ?? m.email ?? "Member"}</span>
                        <Badge variant="outline">{m.role}</Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
