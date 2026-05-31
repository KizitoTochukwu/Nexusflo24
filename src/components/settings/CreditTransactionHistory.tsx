import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatMinor, isCurrencyCode } from "@/lib/currency/config";

interface CreditTransaction {
  id: string;
  channel: string;
  amount: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
  currency: string | null;
  amount_minor: number | null;
}

const REASON_LABELS: Record<string, string> = {
  message_sent: "Message Sent",
  purchase: "Credit Purchase",
  plan_allocation: "Plan Allocation",
  admin_grant: "Admin Grant",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

export default function CreditTransactionHistory() {
  const workspaceId = useWorkspaceId();
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["credit-transactions", workspaceId, page],
    queryFn: async () => {
      if (!workspaceId) return { rows: [] as CreditTransaction[], count: 0 };
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data: rows, error, count } = await supabase
        .from("credit_transactions")
        .select("*", { count: "exact" })
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (rows || []) as CreditTransaction[], count: count || 0 };
    },
    enabled: !!workspaceId,
  });

  const totalPages = Math.ceil((data?.count || 0) / pageSize);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Transaction History
        </CardTitle>
        <CardDescription>
          All credit purchases, allocations, and deductions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.rows.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions yet. Credits will appear here as you send messages or purchase packs.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Channel</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Type</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground text-right">Credits</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((tx) => {
                    const cur = tx.currency && isCurrencyCode(tx.currency) ? tx.currency : null;
                    const showCost = tx.reason === "purchase" && cur && tx.amount_minor != null;
                    return (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="text-xs">
                            {CHANNEL_LABELS[tx.channel] || tx.channel}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          {REASON_LABELS[tx.reason] || tx.reason}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            tx.amount > 0 ? "text-emerald-600" : "text-red-500"
                          }`}>
                            {tx.amount > 0 ? (
                              <ArrowUpCircle className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownCircle className="h-3.5 w-3.5" />
                            )}
                            {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">
                          {showCost ? formatMinor(tx.amount_minor!, cur!) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages} ({data.count} total)
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    Previous
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
