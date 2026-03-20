import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AiReplyButtonProps {
  conversationContext: string;
  onSuggestion: (text: string) => void;
}

export default function AiReplyButton({ conversationContext, onSuggestion }: AiReplyButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("nexus-ai-chat", {
        body: {
          messages: [
            { role: "system", content: "You are a helpful sales assistant. Generate a concise, professional reply based on the conversation context below. Keep it under 3 sentences. Only return the reply text, nothing else." },
            { role: "user", content: `Conversation:\n${conversationContext}\n\nSuggest a reply:` },
          ],
        },
      });
      if (error) throw error;
      const reply = data?.reply || data?.message || "";
      if (reply) {
        onSuggestion(reply);
      } else {
        toast.error("No suggestion generated");
      }
    } catch (err: any) {
      toast.error("Failed to generate suggestion");
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
