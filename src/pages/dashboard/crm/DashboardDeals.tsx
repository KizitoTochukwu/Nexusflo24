import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Handshake, Plus, Search, Settings2 } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import {
  formatMoney, useDeals, usePipelines, usePipelineStages, type Deal,
} from "@/hooks/useDeals";
import DealsBoard from "@/components/crm/DealsBoard";
import DealCreateDrawer from "@/components/crm/DealCreateDrawer";
import DealDetailsDrawer from "@/components/crm/DealDetailsDrawer";
import PipelineManagerDialog from "@/components/crm/PipelineManagerDialog";

const DashboardDeals = () => {
  const workspaceId = useWorkspaceId();
  const { canEdit } = useWorkspaceRole();

  const { data: pipelines = [], isLoading: loadingPipelines } = usePipelines(workspaceId);
  const [pipelineId, setPipelineId] = useState<string>("");
  const activePipelineId = pipelineId || pipelines[0]?.id || "";
  const activePipeline = pipelines.find((p) => p.id === activePipelineId);

  const { data: stages = [] } = usePipelineStages(activePipelineId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const { data: deals = [], isLoading } = useDeals(workspaceId, activePipelineId, { search, status });

  const [createOpen, setCreateOpen] = useState(false);
  const [createStage, setCreateStage] = useState<string | undefined>();
  const [selected, setSelected] = useState<Deal | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const stats = useMemo(() => {
    const open = deals.filter((d) => d.status === "open");
    const won = deals.filter((d) => d.status === "won");
    const lost = deals.filter((d) => d.status === "lost");
    const sum = (rows: Deal[]) => rows.reduce((t, d) => t + Number(d.amount || 0), 0);
    const currency = deals[0]?.currency ?? "USD";
    const closed = won.length + lost.length;
    return {
      currency,
      openValue: sum(open),
      weighted: open.reduce((t, d) => t + Number(d.amount || 0) * ((d.probability ?? 0) / 100), 0),
      wonValue: sum(won),
      winRate: closed ? Math.round((won.length / closed) * 100) : 0,
      openCount: open.length,
    };
  }, [deals]);

  const stageName = (id: string | null) => stages.find((s) => s.id === id)?.name ?? "—";

  const statCards = [
    { label: "Open pipeline", value: formatMoney(stats.openValue, stats.currency), sub: `${stats.openCount} open deals` },
    { label: "Weighted forecast", value: formatMoney(stats.weighted, stats.currency), sub: "By stage probability" },
    { label: "Won value", value: formatMoney(stats.wonValue, stats.currency), sub: "Closed won" },
    { label: "Win rate", value: `${stats.winRate}%`, sub: "Won vs closed" },
  ];

  return (
    <div className="space-y-6">
      <Seo title="Deals & Pipelines | NexusFlo24 CRM" description="Track opportunities across customisable pipeline stages with weighted forecasting and full deal history." />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Handshake className="h-6 w-6 text-primary" /> Deals
          </h1>
          <p className="text-sm text-muted-foreground">Move opportunities through your pipeline and forecast revenue.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setManageOpen(true)} disabled={!activePipeline}>
            <Settings2 className="mr-1.5 h-4 w-4" /> Pipeline settings
          </Button>
          {canEdit && (
            <Button onClick={() => { setCreateStage(undefined); setCreateOpen(true); }} disabled={!activePipelineId}>
              <Plus className="mr-1.5 h-4 w-4" /> New deal
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search deals…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search deals" />
        </div>
        {pipelines.length > 1 && (
          <Select value={activePipelineId} onValueChange={setPipelineId}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Pipeline" /></SelectTrigger>
            <SelectContent>{pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadingPipelines ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <Tabs defaultValue="board">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="pt-4">
            <DealsBoard
              stages={stages}
              deals={deals}
              isLoading={isLoading}
              canEdit={canEdit}
              onSelect={setSelected}
              onAdd={(stageId) => { setCreateStage(stageId); setCreateOpen(true); }}
            />
          </TabsContent>

          <TabsContent value="list" className="pt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expected close</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.map((d) => (
                      <TableRow key={d.id} className="cursor-pointer" onClick={() => setSelected(d)}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>{stageName(d.stage_id)}</TableCell>
                        <TableCell>{formatMoney(d.amount, d.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === "won" ? "default" : d.status === "lost" ? "destructive" : "secondary"}>{d.status}</Badge>
                        </TableCell>
                        <TableCell>{d.expected_close_date ? new Date(d.expected_close_date).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                    {!deals.length && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          No deals yet. Create your first opportunity to start forecasting.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {activePipelineId && (
        <DealCreateDrawer
          open={createOpen}
          onOpenChange={setCreateOpen}
          workspaceId={workspaceId}
          pipelineId={activePipelineId}
          stages={stages}
          defaultStageId={createStage}
        />
      )}

      <DealDetailsDrawer
        deal={selected}
        stages={stages}
        workspaceId={workspaceId}
        canEdit={canEdit}
        onOpenChange={(v) => !v && setSelected(null)}
      />

      <PipelineManagerDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        workspaceId={workspaceId}
        pipeline={activePipeline}
        stages={stages}
      />
    </div>
  );
};

export default DashboardDeals;
