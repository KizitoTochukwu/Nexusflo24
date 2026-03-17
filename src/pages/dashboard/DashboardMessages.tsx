import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWhatsAppThreads, useWhatsAppMessages } from "@/hooks/useWhatsAppInbox";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, Search, User, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function DashboardMessages() {
  const workspaceId = useWorkspaceId();
  const { data: threads = [], isLoading: threadsLoading } = useWhatsAppThreads(workspaceId);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data: messages = [], isLoading: msgsLoading } = useWhatsAppMessages(workspaceId, selectedPhone);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredThreads = threads.filter(t => {
    const q = search.toLowerCase();
    return t.phone_number.includes(q) || (t.lead_name || "").toLowerCase().includes(q);
  });

  const handleSend = async () => {
    if (!reply.trim() || !selectedPhone || !workspaceId) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            workspaceId,
            to: selectedPhone,
            body: reply.trim(),
          }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Failed to send");
      setReply("");
      toast.success("Message sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const selectedThread = threads.find(t => t.phone_number === selectedPhone);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-accent" />
          WhatsApp Inbox
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-180px)]">
          {/* Thread List */}
          <Card className="flex flex-col overflow-hidden">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {threadsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No conversations yet
                </div>
              ) : (
                filteredThreads.map(t => (
                  <button
                    key={t.phone_number}
                    onClick={() => setSelectedPhone(t.phone_number)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors",
                      selectedPhone === t.phone_number && "bg-accent/10 border-l-2 border-l-accent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">
                            {t.lead_name || t.phone_number}
                          </p>
                          {t.lead_name && (
                            <p className="text-xs text-muted-foreground truncate">{t.phone_number}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(t.last_message_at), "MMM d")}
                        </span>
                        {t.unread_count > 0 && (
                          <Badge variant="default" className="h-5 min-w-[20px] text-[10px] bg-accent text-accent-foreground">
                            {t.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1 pl-11">
                      {t.last_message || "..."}
                    </p>
                  </button>
                ))
              )}
            </ScrollArea>
          </Card>

          {/* Chat View */}
          <Card className="flex flex-col overflow-hidden">
            {!selectedPhone ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <MessageCircle className="h-12 w-12 opacity-30" />
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <User className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {selectedThread?.lead_name || selectedPhone}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {selectedPhone}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {msgsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-12">No messages yet</p>
                  ) : (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                          msg.direction === "outbound"
                            ? "ml-auto bg-accent text-accent-foreground rounded-br-md"
                            : "mr-auto bg-muted text-foreground rounded-bl-md"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                        <p className={cn(
                          "text-[10px] mt-1",
                          msg.direction === "outbound" ? "text-accent-foreground/60" : "text-muted-foreground"
                        )}>
                          {format(new Date(msg.created_at), "h:mm a")}
                          {msg.direction === "outbound" && msg.status && (
                            <span className="ml-1.5">• {msg.status}</span>
                          )}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply bar */}
                <div className="p-3 border-t flex gap-2">
                  <Input
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={sending || !reply.trim()}
                    size="icon"
                    className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
