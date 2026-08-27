import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, User, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface LinkContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  channel: "whatsapp" | "sms";
  identifier: string;
  suggestedName?: string;
  onLinked: () => void;
}

interface ContactRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

export default function LinkContactDialog({ open, onOpenChange, workspaceId, channel, identifier, suggestedName, onLinked }: LinkContactDialogProps) {
  const [mode, setMode] = useState<"link" | "create">("link");
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("link");
      setSearch("");
      setFullName(suggestedName ?? "");
      setEmail("");
    }
  }, [open, suggestedName]);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["link-contact-search", workspaceId, search],
    enabled: open && mode === "link",
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

  const handleCreate = async () => {
    if (!fullName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("crm_create_contact_from_conversation", {
        _workspace_id: workspaceId,
        _channel: channel,
        _identifier: identifier,
        _full_name: fullName.trim(),
        _email: email.trim() || null,
      });
      if (error) throw error;
      const linked = (data as any)?.linked_messages ?? 0;
      toast.success(`Contact created — ${linked} message(s) attached`);
      onOpenChange(false);
      onLinked();
    } catch (err: any) {
      toast.error(err.message || "Failed to create contact");
    } finally {
      setCreating(false);
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

        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("link")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "link" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Link existing
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "create" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            New contact
          </button>
        </div>

        {mode === "link" ? (
          <>
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
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">No contacts found.</p>
                  <Button variant="link" size="sm" className="mt-1 text-accent" onClick={() => setMode("create")}>
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> Create a new contact instead
                  </Button>
                </div>
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
          </>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nc-name">Full name</Label>
              <Input
                id="nc-name"
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jane Cooper"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-email">Email <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="nc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={identifier} disabled className="bg-muted" />
              <p className="text-[11px] text-muted-foreground">Taken from this conversation.</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={!fullName.trim() || creating}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <UserPlus className="h-4 w-4 mr-1.5" />}
                Create & link
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
