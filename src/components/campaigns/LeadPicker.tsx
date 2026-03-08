import { useState, useMemo } from "react";
import { useLeads } from "@/hooks/useLeads";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, UserCheck } from "lucide-react";

interface LeadPickerProps {
  channel: string;
  selectedLeadIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function LeadPicker({ channel, selectedLeadIds, onSelectionChange }: LeadPickerProps) {
  const workspaceId = useWorkspaceId();
  const { data: leads = [], isLoading } = useLeads(workspaceId);
  const [search, setSearch] = useState("");

  // Filter leads that have the required contact info for the channel
  const eligibleLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (channel === "email" || channel === "multi-channel") return !!lead.email;
      if (channel === "whatsapp" || channel === "sms") return !!lead.phone;
      return true;
    });
  }, [leads, channel]);

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return eligibleLeads;
    const q = search.toLowerCase();
    return eligibleLeads.filter(
      (l) =>
        l.full_name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q)
    );
  }, [eligibleLeads, search]);

  const toggleLead = (id: string) => {
    onSelectionChange(
      selectedLeadIds.includes(id)
        ? selectedLeadIds.filter((x) => x !== id)
        : [...selectedLeadIds, id]
    );
  };

  const toggleAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredLeads.map((l) => l.id));
    }
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-2">Loading leads...</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> Select Specific Leads
        </p>
        <Badge variant="outline" className="text-xs gap-1">
          <UserCheck className="h-3 w-3" />
          {selectedLeadIds.length} / {eligibleLeads.length}
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="h-8 pl-7 text-xs"
        />
      </div>

      {filteredLeads.length > 0 && (
        <button
          onClick={toggleAll}
          className="text-xs text-accent hover:underline"
        >
          {selectedLeadIds.length === filteredLeads.length ? "Deselect all" : "Select all"}
        </button>
      )}

      <ScrollArea className="h-40 rounded-md border">
        {filteredLeads.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground text-center">
            No leads with {channel === "email" || channel === "multi-channel" ? "email" : "phone"} found.
          </p>
        ) : (
          <div className="divide-y">
            {filteredLeads.map((lead) => (
              <label
                key={lead.id}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedLeadIds.includes(lead.id)}
                  onCheckedChange={() => toggleLead(lead.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {lead.full_name || "Unnamed"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {channel === "email" || channel === "multi-channel"
                      ? lead.email
                      : lead.phone}
                  </p>
                </div>
                {lead.status && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {lead.status}
                  </Badge>
                )}
              </label>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
