import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Bot, User, Mail, MessageCircle, Send, Loader2, CheckCircle, Clock, AlertTriangle, Sparkles,
} from "lucide-react";
import {
  useSalesConversations,
  useProcessInbound,
  useGenerateFollowUp,
  useApproveMessage,
  type SalesConversation,
} from "@/hooks/useSalesCloser";

const intentConfig: Record<string, { label: string; color: string }> = {
  pricing_inquiry: { label: "💰 Pricing", color: "bg-blue-100 text-blue-700" },
  objection: { label: "🛡️ Objection", color: "bg-orange-100 text-orange-700" },
  interest: { label: "👀 Interest", color: "bg-green-100 text-green-700" },
  ready_to_buy: { label: "🚀 Ready to Buy", color: "bg-emerald-100 text-emerald-700" },
  question: { label: "❓ Question", color: "bg-purple-100 text-purple-700" },
  unsubscribe: { label: "🚫 Unsubscribe", color: "bg-red-100 text-red-700" },
  neutral: { label: "💬 Neutral", color: "bg-muted text-muted-foreground" },
};

const channelIcon: Record<string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageCircle,
  sms: MessageCircle,
  web_chat: MessageCircle,
};

const statusIcon: Record<string, { icon: typeof CheckCircle; color: string }> = {
  sent: { icon: CheckCircle, color: "text-green-500" },
  delivered: { icon: CheckCircle, color: "text-green-600" },
  pending_approval: { icon: Clock, color: "text-amber-500" },
  draft: { icon: Clock, color: "text-muted-foreground" },
  failed: { icon: AlertTriangle, color: "text-red-500" },
};

type Props = {
  leadId: string;
  workspaceId: string;
};

const SalesConversationTimeline = ({ leadId, workspaceId }: Props) => {
  const { data: conversations = [], isLoading } = useSalesConversations(leadId, workspaceId);
  const processInbound = useProcessInbound();
  const generateFollowUp = useGenerateFollowUp();
  const approveMessage = useApproveMessage();

  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("email");

  const handleSendSimulation = () => {
    if (!message.trim()) return;
    processInbound.mutate({
      workspace_id: workspaceId,
      lead_id: leadId,
      message: message.trim(),
      channel,
    });
    setMessage("");
  };

  const handleFollowUp = () => {
    generateFollowUp.mutate({
      workspace_id: workspaceId,
      lead_id: leadId,
      channel,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Conversation Thread */}
      {conversations.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No AI sales conversations yet. Simulate an inbound message below to test.
        </p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {conversations.map((msg) => (
            <ConversationBubble
              key={msg.id}
              message={msg}
              onApprove={() => approveMessage.mutate({ messageId: msg.id, leadId })}
            />
          ))}
        </div>
      )}

      <Separator />

      {/* Simulate Inbound / Generate Follow-up */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={handleFollowUp}
            disabled={generateFollowUp.isPending}
            className="text-xs h-8 gap-1"
          >
            {generateFollowUp.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Follow-up
          </Button>
        </div>
        <div className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Simulate an inbound lead message…"
            rows={2}
            className="flex-1 text-sm"
          />
          <Button
            size="sm"
            onClick={handleSendSimulation}
            disabled={!message.trim() || processInbound.isPending}
            className="self-end bg-accent text-accent-foreground h-8"
          >
            {processInbound.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {processInbound.data && (
          <div className="rounded border p-2 text-xs bg-muted/50">
            <span className="font-medium">Detected Intent: </span>
            <Badge className={`${intentConfig[processInbound.data.intent]?.color || ""} text-xs`}>
              {intentConfig[processInbound.data.intent]?.label || processInbound.data.intent}
            </Badge>
            <span className="ml-2 text-muted-foreground">
              ({processInbound.data.confidence}% confident)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

function ConversationBubble({
  message,
  onApprove,
}: {
  message: SalesConversation;
  onApprove: () => void;
}) {
  const isOutbound = message.direction === "outbound";
  const ChannelIcon = channelIcon[message.channel] || MessageCircle;
  const statusInfo = statusIcon[message.status] || statusIcon.sent;
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`flex gap-2 ${isOutbound ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isOutbound ? "bg-accent/20" : "bg-muted"
        }`}
      >
        {isOutbound ? <Bot className="h-4 w-4 text-accent" /> : <User className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-lg p-2.5 text-sm ${
          isOutbound
            ? "bg-accent/10 border border-accent/20"
            : "bg-muted"
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <ChannelIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(message.created_at), "MMM d, h:mm a")}
          </span>
          {message.ai_generated && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0">AI</Badge>
          )}
          {message.intent && (
            <Badge className={`${intentConfig[message.intent]?.color || ""} text-[9px] px-1 py-0`}>
              {intentConfig[message.intent]?.label || message.intent}
            </Badge>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.message_body}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <StatusIcon className={`h-3 w-3 ${statusInfo.color}`} />
          <span className="text-[10px] text-muted-foreground capitalize">{message.status.replace("_", " ")}</span>
          {message.status === "pending_approval" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onApprove}
              className="ml-auto text-[10px] h-5 px-2"
            >
              Approve & Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalesConversationTimeline;
