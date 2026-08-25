import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import StoreSetupCard from "@/components/commerce/StoreSetupCard";
import {
  formatMoney,
  ShopProduct,
  useDeleteProduct,
  useSaveProduct,
  useShopProducts,
  useShopStore,
} from "@/hooks/useCommerce";
import { ACADEMY_COURSES } from "@/data/academyCourses";

const TYPES = [
  { value: "physical", label: "Physical product" },
  { value: "digital", label: "Digital download" },
  { value: "service", label: "Service" },
  { value: "course", label: "Course (Academy)" },
  { value: "membership", label: "Membership" },
];

type Draft = Partial<ShopProduct> & { priceMajor?: string };

const emptyDraft: Draft = {
  name: "",
  short_description: "",
  description: "",
  product_type: "digital",
  status: "draft",
  visibility: "public",
  billing_type: "one_time",
  billing_interval: "month",
  requires_shipping: false,
  track_inventory: false,
  inventory_quantity: 0,
  button_text: "Buy now",
  priceMajor: "0",
};

export default function CommerceProducts() {
  const { data: store, isLoading } = useShopStore();
  const { data: products = [], isLoading: loadingProducts } = useShopProducts(store?.id);
  const save = useSaveProduct();
  const remove = useDeleteProduct();
  const [draft, setDraft] = useState<Draft | null>(null);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!store) return <StoreSetupCard />;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...(d ?? {}), [key]: value }));

  const openEdit = (p: ShopProduct) =>
    setDraft({ ...p, priceMajor: (p.price_amount / 100).toFixed(2) });

  const handleSave = () => {
    if (!draft?.name?.trim()) return;
    const { priceMajor, created_at, ...rest } = draft as any;
    save.mutate(
      {
        storeId: store.id,
        product: {
          ...rest,
          currency: store.currency,
          price_amount: Math.round(Number(priceMajor || 0) * 100),
          billing_interval: draft.billing_type === "recurring" ? (draft.billing_interval || "month") : null,
          requires_shipping: draft.product_type === "physical" ? Boolean(draft.requires_shipping) : false,
        },
      },
      { onSuccess: () => setDraft(null) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Products</h2>
        <Button onClick={() => setDraft({ ...emptyDraft })}>
          <Plus className="mr-2 h-4 w-4" /> New product
        </Button>
      </div>

      {loadingProducts ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : products.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">
          No products yet. Add your first product to start selling.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Type</th>
                <th className="p-3">Price</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">/{p.slug}</p>
                  </td>
                  <td className="p-3 capitalize">{p.product_type}</td>
                  <td className="p-3">
                    {formatMoney(p.price_amount, p.currency)}
                    {p.billing_type === "recurring" ? `/${p.billing_interval ?? "month"}` : ""}
                  </td>
                  <td className="p-3">
                    <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{draft?.id ? "Edit product" : "New product"}</SheetTitle>
          </SheetHeader>
          {draft && (
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" value={draft.name ?? ""} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="p-short">Short description</Label>
                <Input
                  id="p-short"
                  value={draft.short_description ?? ""}
                  onChange={(e) => set("short_description", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="p-desc">Full description</Label>
                <Textarea
                  id="p-desc"
                  rows={4}
                  value={draft.description ?? ""}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={draft.product_type}
                    onValueChange={(v) => {
                      set("product_type", v as ShopProduct["product_type"]);
                      set("requires_shipping", v === "physical");
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="p-price">Price ({store.currency})</Label>
                  <Input
                    id="p-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.priceMajor ?? "0"}
                    onChange={(e) => set("priceMajor", e.target.value)}
                  />
                </div>
              </div>

              {draft.product_type === "course" && (
                <div>
                  <Label>Academy course</Label>
                  <Select
                    value={draft.academy_course_slug ?? ""}
                    onValueChange={(v) => set("academy_course_slug", v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
                    <SelectContent>
                      {ACADEMY_COURSES.map((c: any) => (
                        <SelectItem key={c.slug} value={c.slug}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Recurring billing</p>
                  <p className="text-xs text-muted-foreground">Charge on a repeating schedule</p>
                </div>
                <Switch
                  checked={draft.billing_type === "recurring"}
                  onCheckedChange={(v) => set("billing_type", v ? "recurring" : "one_time")}
                />
              </div>
              {draft.billing_type === "recurring" && (
                <div>
                  <Label>Billing interval</Label>
                  <Select value={draft.billing_interval ?? "month"} onValueChange={(v) => set("billing_interval", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["week", "month", "year"].map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {draft.product_type === "physical" && (
                <>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <p className="text-sm font-medium">Track inventory</p>
                    <Switch
                      checked={Boolean(draft.track_inventory)}
                      onCheckedChange={(v) => set("track_inventory", v)}
                    />
                  </div>
                  {draft.track_inventory && (
                    <div>
                      <Label htmlFor="p-stock">Stock quantity</Label>
                      <Input
                        id="p-stock"
                        type="number"
                        min="0"
                        value={draft.inventory_quantity ?? 0}
                        onChange={(e) => set("inventory_quantity", Number(e.target.value))}
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => set("status", v as ShopProduct["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["draft", "active", "archived"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={handleSave} disabled={save.isPending}>
                Save product
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
