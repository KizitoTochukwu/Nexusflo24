import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanyOptions } from "@/hooks/useCompanies";
import { useCreateDeal, type PipelineStage } from "@/hooks/useDeals";

const CURRENCIES = ["USD", "GBP", "EUR", "NGN", "ZAR", "KES", "GHS", "CAD", "AUD"];

function useContactOptions(workspaceId: string) {
  return useQuery({
    queryKey: ["crm-contact-options", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts" as any)
        .select("id, full_name, email, company_id")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  pipelineId: string;
  stages: PipelineStage[];
  defaultStageId?: string;
};

const DealCreateDrawer = ({ open, onOpenChange, workspaceId, pipelineId, stages, defaultStageId }: Props) => {
  const create = useCreateDeal();
  const { data: companies = [] } = useCompanyOptions(workspaceId);
  const { data: contacts = [] } = useContactOptions(workspaceId);

  const [form, setForm] = useState({
    name: "",
    amount: "",
    currency: "USD",
    stage_id: defaultStageId ?? stages[0]?.id ?? "",
    contact_id: "none",
    company_id: "none",
    expected_close_date: "",
    description: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return;
    const stage = stages.find((s) => s.id === form.stage_id);
    await create.mutateAsync({
      workspace_id: workspaceId,
      pipeline_id: pipelineId,
      stage_id: form.stage_id || null,
      name: form.name.trim(),
      amount: Number(form.amount) || 0,
      currency: form.currency,
      probability: stage?.probability ?? null,
      status: stage?.stage_type === "won" ? "won" : stage?.stage_type === "lost" ? "lost" : "open",
      contact_id: form.contact_id === "none" ? null : form.contact_id,
      company_id: form.company_id === "none" ? null : form.company_id,
      expected_close_date: form.expected_close_date || null,
      description: form.description || null,
    } as any);
    onOpenChange(false);
    setForm((f) => ({ ...f, name: "", amount: "", description: "" }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New deal</SheetTitle>
          <SheetDescription>Track an opportunity through your pipeline.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deal-name">Deal name</Label>
            <Input id="deal-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme — annual plan" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="deal-amount">Value</Label>
              <Input id="deal-amount" type="number" min="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={form.stage_id} onValueChange={(v) => set("stage_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select a stage" /></SelectTrigger>
              <SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Primary contact</Label>
            <Select value={form.contact_id} onValueChange={(v) => set("contact_id", v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name || c.email || "Unnamed contact"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Company</Label>
            <Select value={form.company_id} onValueChange={(v) => set("company_id", v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-close">Expected close date</Label>
            <Input id="deal-close" type="date" value={form.expected_close_date} onChange={(e) => set("expected_close_date", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-desc">Notes</Label>
            <Textarea id="deal-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Context, requirements, next steps…" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.name.trim() || create.isPending}>
              {create.isPending ? "Creating…" : "Create deal"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DealCreateDrawer;
