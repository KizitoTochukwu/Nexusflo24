import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, User } from "lucide-react";
import { toast } from "sonner";

interface LinkContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  channel: "whatsapp" | "sms";
  identifier: string;
  onLinked: () => void;
}

interface ContactRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

export default function LinkContactDialog({ open, onOpenChange, workspaceId, channel, identifier, onLinked }: LinkContactDialogProps) {
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["link-contact-search", workspaceId, search],
    enabled: open,
    queryFn: async () => {
      let q = supabase
        .from("contacts")
        .select("id, full_name, email, phone")
        .eq("workspace_id", workspaceId)
        .is("merged_into_id", null)
        .order("last_activity_at", { ascending: false, nullsFirst: false })
        .limit(20);
      const term = search.trim();
      if (term) {
        q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ContactRow[];
    },
  });

  const handleLink = async (contactId: string) => {
    setLinking(contactId);
    try {
      const { data, error } = await supabase.rpc("crm_link_conversation_contact", {
        _workspace_id: workspaceId,
        _channel: channel,
        _identifier: identifier,
        _contact_id: contactId,
      });
      if (error) throw error;
      toast.success(`Conversation linked — ${data ?? 0} message(s) attached to the contact`);
      onOpenChange(false);
      onLinked();
    } catch (err: any) {
      toast.error(err.message || "Failed to link conversation");
    } finally {
      setLinking(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link conversation to a contact</DialogTitle>
          <DialogDescription>
            Attach <span className="font-medium text-foreground">{identifier}</span> to a CRM contact. All past and
            future messages from this number will appear on that contact's timeline.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts by name, email or phone…"
            className="pl-9"
          />
        </div>
        <div className="max-h-72 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              No contacts found. Create the contact in CRM first, then link them here.
            </p>
          ) : (
            contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5 border-b last:border-0">
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{c.full_name || c.email || c.phone || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground truncate">{[c.email, c.phone].filter(Boolean).join(" · ")}</p>
                </div>
                <Button size="sm" variant="outline" disabled={linking !== null} onClick={() => handleLink(c.id)}>
                  {linking === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Link"}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
