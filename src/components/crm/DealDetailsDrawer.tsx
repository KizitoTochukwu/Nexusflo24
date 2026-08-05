import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Trophy, XCircle } from "lucide-react";
import CrmTimeline from "@/components/crm/CrmTimeline";
import CrmNotesPanel from "@/components/crm/CrmNotesPanel";
import CrmFilesPanel from "@/components/crm/CrmFilesPanel";
import CrmTasksPanel from "@/components/crm/CrmTasksPanel";
import { formatMoney, useDeleteDeal, useUpdateDeal, type Deal, type PipelineStage } from "@/hooks/useDeals";

type Props = {
  deal: Deal | null;
  stages: PipelineStage[];
  workspaceId: string;
  canEdit: boolean;
  onOpenChange: (v: boolean) => void;
};

const DealDetailsDrawer = ({ deal, stages, workspaceId, canEdit, onOpenChange }: Props) => {
  const update = useUpdateDeal();
  const remove = useDeleteDeal();
  const [draft, setDraft] = useState<Partial<Deal>>({});

  useEffect(() => {
    setDraft(deal ? { ...deal } : {});
  }, [deal?.id]);

  if (!deal) return null;

  const set = (k: keyof Deal, v: any) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () =>
    update.mutate({
      id: deal.id,
      prev: deal,
      name: draft.name,
      amount: Number(draft.amount) || 0,
      currency: draft.currency,
      stage_id: draft.stage_id ?? null,
      expected_close_date: draft.expected_close_date || null,
      description: draft.description ?? null,
      probability: draft.probability ?? null,
    } as any);

  const close = (status: "won" | "lost") => {
    const target = stages.find((s) => s.stage_type === status);
    update.mutate({
      id: deal.id,
      prev: deal,
      status,
      closed_at: new Date().toISOString(),
      stage_id: target?.id ?? deal.stage_id,
      probability: status === "won" ? 100 : 0,
    } as any);
  };

  return (
    <Sheet open={!!deal} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2 pr-6 text-left">
            {deal.name}
            <Badge variant={deal.status === "won" ? "default" : deal.status === "lost" ? "destructive" : "secondary"}>
              {deal.status}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-2 text-2xl font-semibold text-primary">{formatMoney(deal.amount, deal.currency)}</div>

        <Tabs defaultValue="details" className="mt-5">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="d-name">Deal name</Label>
              <Input id="d-name" value={draft.name ?? ""} disabled={!canEdit} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="d-amount">Value</Label>
                <Input id="d-amount" type="number" value={String(draft.amount ?? "")} disabled={!canEdit} onChange={(e) => set("amount", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-prob">Probability %</Label>
                <Input id="d-prob" type="number" min="0" max="100" value={String(draft.probability ?? "")} disabled={!canEdit} onChange={(e) => set("probability", Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={draft.stage_id ?? undefined} disabled={!canEdit} onValueChange={(v) => set("stage_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select a stage" /></SelectTrigger>
                <SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-close">Expected close date</Label>
              <Input id="d-close" type="date" value={draft.expected_close_date ?? ""} disabled={!canEdit} onChange={(e) => set("expected_close_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-desc">Notes</Label>
              <Textarea id="d-desc" rows={3} value={draft.description ?? ""} disabled={!canEdit} onChange={(e) => set("description", e.target.value)} />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              {deal.contact_id && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/dashboard/${workspaceId}/crm/contacts/${deal.contact_id}`}>View contact</Link>
                </Button>
              )}
              {deal.company_id && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/dashboard/${workspaceId}/crm/companies/${deal.company_id}`}>View company</Link>
                </Button>
              )}
            </div>

            {canEdit && (
              <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => close("won")} disabled={update.isPending}>
                    <Trophy className="mr-1.5 h-4 w-4" /> Mark won
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => close("lost")} disabled={update.isPending}>
                    <XCircle className="mr-1.5 h-4 w-4" /> Mark lost
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => { remove.mutate(deal.id); onOpenChange(false); }}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                  </Button>
                  <Button size="sm" onClick={save} disabled={update.isPending}>Save changes</Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="pt-4">
            <CrmTimeline recordType="deal" recordId={deal.id} emptyLabel="No activity on this deal yet." />
          </TabsContent>
          <TabsContent value="notes" className="pt-4">
            <CrmNotesPanel workspaceId={workspaceId} recordType="deal" recordId={deal.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="files" className="pt-4">
            <CrmFilesPanel workspaceId={workspaceId} recordType="deal" recordId={deal.id} canEdit={canEdit} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default DealDetailsDrawer;
