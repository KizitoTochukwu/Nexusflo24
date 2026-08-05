import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { runNexusCapability } from "@/hooks/useNexusAi";

interface AiReplyButtonProps {
  conversationContext: string;
  onSuggestion: (text: string) => void;
}

export default function AiReplyButton({ conversationContext, onSuggestion }: AiReplyButtonProps) {
  const [loading, setLoading] = useState(false);
  const workspaceId = useWorkspaceId();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const reply = await runNexusCapability({
        workspaceId,
        capability: "reply_suggestion",
        prompt:
          `Draft the next reply in this conversation. Keep it under 3 sentences and return only the message text.\n\nConversation:\n${conversationContext}`,
        context: { recordType: "Conversation", recordSummary: conversationContext.slice(0, 4000) },
      });
      if (reply?.trim()) {
        onSuggestion(reply.trim());
      } else {
        toast.error("No suggestion generated");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate suggestion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleGenerate}
      disabled={loading}
      className="gap-1.5 text-xs text-accent hover:text-accent"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      AI Reply
    </Button>
  );
}
