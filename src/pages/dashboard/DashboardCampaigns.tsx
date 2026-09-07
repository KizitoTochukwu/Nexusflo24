import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useCampaigns, useUpdateCampaign, useDeleteCampaign, type Campaign } from "@/hooks/useCampaigns";
import { useWorkspaceCampaignMetrics } from "@/hooks/useCampaignMetrics";
import { resolveCampaignMetrics, formatRate } from "@/lib/campaigns/metrics";
import CreateCampaignDialog from "@/components/campaigns/CreateCampaignDialog";
import CampaignDetailsDrawer from "@/components/campaigns/CampaignDetailsDrawer";
import CampaignAnalytics from "@/components/campaigns/CampaignAnalytics";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Eye, Copy, Pause, Play, Trash2, Pencil, Mail, MessageSquare, Phone, Layers, Zap, Radio } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-accent/20 text-accent-foreground",
  active: "bg-green-100 text-green-800",
  paused: "bg-orange-100 text-orange-800",
  completed: "bg-primary/10 text-primary",
};

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  whatsapp: <MessageSquare className="h-3.5 w-3.5" />,
  sms: <Phone className="h-3.5 w-3.5" />,
  "multi-channel": <Layers className="h-3.5 w-3.5" />,
};

const DashboardCampaigns = () => {
  const workspaceId = useWorkspaceId();
  const { data: campaigns, isLoading } = useCampaigns(workspaceId);
  const { data: metricsMap } = useWorkspaceCampaignMetrics(workspaceId);
  const rowMetrics = (c: Campaign) => resolveCampaignMetrics(c, metricsMap?.[c.id]);
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [templateCampaign, setTemplateCampaign] = useState<Campaign | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const handleEdit = (c: Campaign) => {
    setEditingCampaign(c);
    setTemplateCampaign(null);
    setDrawerOpen(false);
    setEditorOpen(true);
  };

  // Duplicate = open the editor fully prefilled from this campaign.
  // The copy is only created (as a draft) when the user saves — nothing is sent.
  const handleDuplicate = (c: Campaign) => {
    setTemplateCampaign(c);
    setEditingCampaign(null);
    setDrawerOpen(false);
    setEditorOpen(true);
  };

  const handleTogglePause = (c: Campaign) => {
    const newStatus = c.status === "paused" ? "active" : "paused";
    updateCampaign.mutate({ id: c.id, status: newStatus });
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, manage, and track your marketing campaigns.</p>
        </div>
        <CreateCampaignDialog />
      </div>

      <Tabs defaultValue="list" className="mt-6">
        <TabsList>
          <TabsTrigger value="list">All Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : !campaigns?.length ? (
            <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground shadow-card">
              No campaigns yet. Click "Create Campaign" to get started.
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Sent</TableHead>
                    <TableHead className="hidden md:table-cell">Open Rate</TableHead>
                    <TableHead className="hidden lg:table-cell">CTR</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => { setSelectedId(c.id); setDrawerOpen(true); }}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 capitalize">
                          {channelIcons[c.type]} {c.type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize flex items-center gap-1 w-fit">
                          {(c as any).campaign_mode === "triggered" ? <Zap className="h-3 w-3" /> : <Radio className="h-3 w-3" />}
                          {(c as any).campaign_mode || "broadcast"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[c.status] || ""} capitalize`}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{rowMetrics(c).sent}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatRate(rowMetrics(c).openRate)}</TableCell>
                      <TableCell className="hidden lg:table-cell">{formatRate(rowMetrics(c).clickRate)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {format(new Date(c.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => { setSelectedId(c.id); setDrawerOpen(true); }}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            {["draft", "scheduled", "active", "paused"].includes(c.status) && (
                              <DropdownMenuItem onClick={() => handleEdit(c)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDuplicate(c)}>
                              <Copy className="mr-2 h-4 w-4" /> Duplicate / Use as Template
                            </DropdownMenuItem>
                            {(c.status === "active" || c.status === "paused") && (
                              <DropdownMenuItem onClick={() => handleTogglePause(c)}>
                                {c.status === "paused" ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                                {c.status === "paused" ? "Resume" : "Pause"}
                              </DropdownMenuItem>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{c.name}" and all associated message data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteCampaign.mutate(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <CampaignAnalytics />
        </TabsContent>
      </Tabs>

      <CampaignDetailsDrawer
        campaignId={selectedId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={() => {
          const c = campaigns?.find((x) => x.id === selectedId);
          if (c) handleEdit(c);
        }}
      />
      <CreateCampaignDialog
        editCampaign={editingCampaign}
        templateCampaign={templateCampaign}
        open={editorOpen}
        onOpenChange={(v) => {
          setEditorOpen(v);
          if (!v) { setEditingCampaign(null); setTemplateCampaign(null); }
        }}
      />
    </DashboardLayout>
  );
};

export default DashboardCampaigns;
