import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, MessageSquare, Search, RefreshCw, Eye, CheckCircle2, XCircle, Clock, Send } from "lucide-react";
import { format } from "date-fns";

interface SmsLog {
  id: string;
  workspace_id: string;
  created_at: string;
  provider: string;
  to_number: string;
  from_number: string | null;
  message: string;
  status: string;
  provider_message_id: string | null;
  error: string | null;
}

interface SmsLogsViewerProps {
  workspaceId: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  sent: { label: "Sent", variant: "default", icon: Send },
  delivered: { label: "Delivered", variant: "default", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  queued: { label: "Queued", variant: "secondary", icon: Clock },
  pending: { label: "Pending", variant: "outline", icon: Clock },
};

export function SmsLogsViewer({ workspaceId }: SmsLogsViewerProps) {
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<SmsLog | null>(null);

  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["sms-logs", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as SmsLog[];
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const filteredLogs = logs?.filter((log) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      log.to_number.toLowerCase().includes(term) ||
      log.message.toLowerCase().includes(term) ||
      log.status.toLowerCase().includes(term) ||
      log.from_number?.toLowerCase().includes(term)
    );
  });

  const stats = {
    total: logs?.length || 0,
    delivered: logs?.filter((l) => l.status === "delivered" || l.status === "sent").length || 0,
    failed: logs?.filter((l) => l.status === "failed").length || 0,
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status] || { label: status, variant: "outline" as const, icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-accent" />
            <CardTitle className="text-lg">SMS Delivery Logs</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>Monitor SMS delivery status and troubleshoot issues.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.delivered}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by phone, message, or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs && filteredLogs.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.to_number}</TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {log.message}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No SMS logs found.</p>
            <p className="text-xs text-muted-foreground">Send a test SMS to see delivery logs here.</p>
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>SMS Log Details</DialogTitle>
              <DialogDescription>Full details for this SMS message.</DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <StatusBadge status={selectedLog.status} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Provider</p>
                    <p className="font-medium capitalize">{selectedLog.provider}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="font-mono">{selectedLog.to_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="font-mono">{selectedLog.from_number || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Sent At</p>
                    <p>{format(new Date(selectedLog.created_at), "PPpp")}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p className="rounded-md border bg-muted p-2 text-sm whitespace-pre-wrap">{selectedLog.message}</p>
                </div>
                {selectedLog.provider_message_id && (
                  <div>
                    <p className="text-xs text-muted-foreground">Provider Message ID</p>
                    <p className="font-mono text-xs break-all">{selectedLog.provider_message_id}</p>
                  </div>
                )}
                {selectedLog.error && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2">
                    <p className="text-xs text-destructive font-medium">Error</p>
                    <p className="text-sm text-destructive">{selectedLog.error}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
