import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { COMPANY_SIZE_BANDS, INDUSTRIES, LIFECYCLE_STAGES } from "@/lib/crm/constants";
import { useCreateCompany } from "@/hooks/useCompanies";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  members: any[];
  onCreated?: (id: string) => void;
};

const empty = {
  name: "", domain: "", website: "", industry: "", size_band: "", phone: "", email: "",
  linkedin_url: "", city: "", country: "", description: "", lifecycle_stage: "lead",
  owner_user_id: "", annual_revenue: "",
};

const CompanyCreateDrawer = ({ open, onOpenChange, workspaceId, members, onCreated }: Props) => {
  const [form, setForm] = useState({ ...empty });
  const create = useCreateCompany();
  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return;
    const company = await create.mutateAsync({
      workspace_id: workspaceId,
      name: form.name.trim(),
      domain: form.domain || null,
      website: form.website || null,
      industry: form.industry || null,
      size_band: form.size_band || null,
      annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : null,
      phone: form.phone || null,
      email: form.email || null,
      linkedin_url: form.linkedin_url || null,
      city: form.city || null,
      country: form.country || null,
      description: form.description || null,
      lifecycle_stage: form.lifecycle_stage,
      owner_user_id: form.owner_user_id || null,
    });
    setForm({ ...empty });
    onOpenChange(false);
    onCreated?.(company.id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New company</SheetTitle>
          <SheetDescription>Group contacts under the organisation they work for.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Company name *</Label>
            <Input id="c-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme Ltd" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-domain">Domain</Label>
              <Input id="c-domain" value={form.domain} onChange={(e) => set("domain", e.target.value)} placeholder="acme.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-website">Website</Label>
              <Input id="c-website" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://acme.com" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Select value={form.industry} onValueChange={(v) => set("industry", v)}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Company size</Label>
              <Select value={form.size_band} onValueChange={(v) => set("size_band", v)}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZE_BANDS.map((s) => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone</Label>
              <Input id="c-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-city">City</Label>
              <Input id="c-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-country">Country</Label>
              <Input id="c-country" value={form.country} onChange={(e) => set("country", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Lifecycle stage</Label>
              <Select value={form.lifecycle_stage} onValueChange={(v) => set("lifecycle_stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIFECYCLE_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={form.owner_user_id} onValueChange={(v) => set("owner_user_id", v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {members.map((m: any) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email || m.user_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-desc">Description</Label>
            <Textarea id="c-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pb-8">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.name.trim() || create.isPending}>
              {create.isPending ? "Creating…" : "Create company"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CompanyCreateDrawer;
