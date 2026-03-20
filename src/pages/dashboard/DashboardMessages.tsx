import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWhatsAppThreads, useWhatsAppMessages } from "@/hooks/useWhatsAppInbox";
import { useEmailThreads, useEmailMessages } from "@/hooks/useEmailInbox";
import { useSmsThreads, useSmsMessages } from "@/hooks/useSmsInbox";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AiReplyButton from "@/components/messages/AiReplyButton";
import { Send, MessageCircle, Search, User, Phone, Loader2, Mail, Smartphone, Inbox, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Channel = "all" | "whatsapp" | "email" | "sms";

interface UnifiedThread {
  id: string;
  channel: "whatsapp" | "email" | "sms";
  identifier: string;
  displayName: string;
  subtitle: string;
  lastMessage: string;
  lastMessageAt: string;
  badge?: number;
}

export default function DashboardMessages() {
  const workspaceId = useWorkspaceId();
  const [channel, setChannel] = useState<Channel>("all");
  const [selectedThread, setSelectedThread] = useState<UnifiedThread | null>(null);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [templateMode, setTemplateMode] = useState(false);
  const [templateName, setTemplateName] = useState("hello_world");
  const [templateLang, setTemplateLang] = useState("en_US");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Data sources
  const { data: waThreads = [], isLoading: waLoading } = useWhatsAppThreads(workspaceId);
  const { data: emailThreads = [], isLoading: emailLoading } = useEmailThreads(workspaceId);
  const { data: smsThreads = [], isLoading: smsLoading } = useSmsThreads(workspaceId);

  // Messages for selected thread
  const { data: waMessages = [] } = useWhatsAppMessages(
    workspaceId,
    selectedThread?.channel === "whatsapp" ? selectedThread.identifier : null,
  );
  const { data: emailMessages = [] } = useEmailMessages(
    workspaceId,
    selectedThread?.channel === "email" ? selectedThread.identifier : null,
  );
  const { data: smsMessages = [] } = useSmsMessages(
    workspaceId,
    selectedThread?.channel === "sms" ? selectedThread.identifier : null,
  );

  // Unify threads
  const unifiedThreads: UnifiedThread[] = [
    ...waThreads.map((t) => ({
      id: `wa-${t.phone_number}`,
      channel: "whatsapp" as const,
      identifier: t.phone_number,
      displayName: t.lead_name || t.phone_number,
      subtitle: t.phone_number,
      lastMessage: t.last_message || "...",
      lastMessageAt: t.last_message_at,
      badge: t.unread_count || undefined,
    })),
    ...emailThreads.map((t) => ({
      id: `email-${t.to_email}`,
      channel: "email" as const,
      identifier: t.to_email,
      displayName: t.lead_name || t.to_email,
      subtitle: t.last_subject || t.to_email,
      lastMessage: t.last_subject || "...",
      lastMessageAt: t.last_message_at,
    })),
    ...smsThreads.map((t) => ({
      id: `sms-${t.to_number}`,
      channel: "sms" as const,
      identifier: t.to_number,
      displayName: t.to_number,
      subtitle: `${t.count} messages`,
      lastMessage: t.last_message || "...",
      lastMessageAt: t.last_message_at,
    })),
  ]
    .filter((t) => channel === "all" || t.channel === channel)
    .filter((t) => {
      const q = search.toLowerCase();
      return t.displayName.toLowerCase().includes(q) || t.identifier.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  // Get current messages
  const currentMessages = selectedThread?.channel === "whatsapp"
    ? waMessages.map((m: any) => ({ id: m.id, body: m.body, direction: m.direction, created_at: m.created_at, status: m.status }))
    : selectedThread?.channel === "email"
    ? emailMessages.map((m: any) => ({ id: m.id, body: m.subject ? `${m.subject}\n\n${m.body || ""}` : m.body, direction: m.direction, created_at: m.created_at, status: m.status }))
    : selectedThread?.channel === "sms"
    ? smsMessages.map((m: any) => ({ id: m.id, body: m.message, direction: (m as any).direction || "outbound", created_at: m.created_at, status: m.status }))
    : [];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [currentMessages]);

  // Template mode is kept for manual use but 24h auto-fallback is handled server-side

  const handleSend = async () => {
    if ((!reply.trim() && !templateMode) || !selectedThread || !workspaceId) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` };

      if (selectedThread.channel === "whatsapp") {
        const payload: Record<string, unknown> = { workspaceId, to: selectedThread.identifier };

        if (templateMode) {
          payload.template = { name: templateName, language: templateLang };
          payload.body = ""; // body is optional for templates
        } else {
          payload.body = reply.trim();
        }

        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-send`, {
          method: "POST", headers,
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error((await resp.json()).error || "Failed");
      } else if (selectedThread.channel === "sms") {
        const { error } = await supabase.functions.invoke("sms-send", {
          body: { workspaceId, to: selectedThread.identifier, message: reply.trim() },
        });
        if (error) throw error;
      } else if (selectedThread.channel === "email") {
        const { error } = await supabase.functions.invoke("email-send", {
          body: { workspaceId, to: selectedThread.identifier, subject: "Re: Conversation", html: `<p>${reply.trim()}</p>` },
        });
        if (error) throw error;
      }
      setReply("");
      setTemplateMode(false);
      toast.success("Message sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const channelIcon = (ch: string) => {
    switch (ch) {
      case "whatsapp": return <MessageCircle className="h-3.5 w-3.5 text-green-600" />;
      case "email": return <Mail className="h-3.5 w-3.5 text-blue-600" />;
      case "sms": return <Smartphone className="h-3.5 w-3.5 text-orange-600" />;
      default: return null;
    }
  };

  const conversationContext = currentMessages.map(m => `${m.direction === "outbound" ? "You" : "Them"}: ${m.body}`).join("\n");

  const isLoading = waLoading || emailLoading || smsLoading;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Inbox className="h-6 w-6 text-accent" />
            Messages
          </h1>
        </div>

        {/* Channel tabs */}
        <Tabs value={channel} onValueChange={(v) => { setChannel(v as Channel); setSelectedThread(null); }} className="mb-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5"><Inbox className="h-3.5 w-3.5" />All</TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1.5"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Email</TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5"><Smartphone className="h-3.5 w-3.5" />SMS</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-240px)]">
          {/* Thread List */}
          <Card className="flex flex-col overflow-hidden">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..." className="pl-9" />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : unifiedThreads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No conversations yet</div>
              ) : (
                unifiedThreads.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThread(t)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors",
                      selectedThread?.id === t.id && "bg-accent/10 border-l-2 border-l-accent",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                          {channelIcon(t.channel) || <User className="h-4 w-4 text-accent" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">{t.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">{t.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground">{format(new Date(t.lastMessageAt), "MMM d")}</span>
                        {t.badge && t.badge > 0 && (
                          <Badge variant="default" className="h-5 min-w-[20px] text-[10px] bg-accent text-accent-foreground">{t.badge}</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1 pl-11">{t.lastMessage}</p>
                  </button>
                ))
              )}
            </ScrollArea>
          </Card>

          {/* Chat View */}
          <Card className="flex flex-col overflow-hidden">
            {!selectedThread ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Inbox className="h-12 w-12 opacity-30" />
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                    {channelIcon(selectedThread.channel)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{selectedThread.displayName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] h-4 capitalize">{selectedThread.channel}</Badge>
                      {selectedThread.identifier}
                    </p>
                  </div>
                  <AiReplyButton conversationContext={conversationContext} onSuggestion={(text) => setReply(text)} />
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {currentMessages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-12">No messages yet</p>
                  ) : (
                    currentMessages.map(msg => (
                      <div
                        key={msg.id}
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                          msg.direction === "outbound"
                            ? "ml-auto bg-accent text-accent-foreground rounded-br-md"
                            : "mr-auto bg-muted text-foreground rounded-bl-md",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                        <p className={cn("text-[10px] mt-1", msg.direction === "outbound" ? "text-accent-foreground/60" : "text-muted-foreground")}>
                          {format(new Date(msg.created_at), "h:mm a")}
                          {msg.direction === "outbound" && msg.status && <span className="ml-1.5">• {msg.status}</span>}
                        </p>
                      </div>
                    ))
                  )}
                </div>


                {/* Template selector */}
                {templateMode && selectedThread.channel === "whatsapp" && (
                  <div className="mx-3 mt-3 p-3 rounded-lg bg-muted/50 border space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <LayoutTemplate className="h-3.5 w-3.5" />
                        Send Template Message
                      </p>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setTemplateMode(false)}>Cancel</Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                        placeholder="Template name (e.g. hello_world)"
                        className="flex-1 h-8 text-xs"
                      />
                      <Input
                        value={templateLang}
                        onChange={e => setTemplateLang(e.target.value)}
                        placeholder="Language code"
                        className="w-24 h-8 text-xs"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Enter the exact template name from your Meta Business Manager. The template must be approved before use.
                    </p>
                  </div>
                )}

                <div className="p-3 border-t flex gap-2">
                  {selectedThread.channel === "whatsapp" && !templateMode && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      title="Send template message"
                      onClick={() => setTemplateMode(true)}
                    >
                      <LayoutTemplate className="h-4 w-4" />
                    </Button>
                  )}
                  {templateMode ? (
                    <Button
                      onClick={handleSend}
                      disabled={sending || !templateName.trim()}
                      className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Send Template
                    </Button>
                  ) : (
                    <>
                      <Input
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        placeholder={`Reply via ${selectedThread.channel}...`}
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
                    </>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
