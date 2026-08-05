import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { toast } from "sonner";

export type NexusCapability =
  | "chat"
  | "conversation_summary"
  | "next_actions"
  | "campaign_optimizer"
  | "report_summary"
  | "data_cleanup"
  | "blog_writer"
  | "social_writer"
  | "subject_lines"
  | "reply_suggestion"
  | "lead_score_explain";

export interface NexusContext {
  route?: string;
  recordType?: string;
  recordId?: string;
  recordSummary?: string;
  data?: unknown;
}

export interface ProposedAction {
  id: string;
  action_type: string;
  title: string;
  summary: string | null;
  target_table: string | null;
  target_id: string | null;
  changes: Record<string, unknown>;
  status: string;
}

export interface NexusMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ProposedAction[];
  pending?: boolean;
  error?: boolean;
}

async function invokeNexus(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("nexus-ai", { body });
  if (error) {
    // Surface the real server message instead of the generic edge error.
    let message = error.message;
    try {
      const ctx: any = (error as any).context;
      const parsed = ctx?.body ? JSON.parse(ctx.body) : await ctx?.json?.();
      if (parsed?.error) message = parsed.error;
    } catch { /* keep fallback */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as {
    reply: string;
    conversationId: string | null;
    messageId: string | null;
    actions: ProposedAction[];
  };
}

/** One-shot capability call (no chat thread, no persistence). */
export async function runNexusCapability(opts: {
  workspaceId: string;
  capability: NexusCapability;
  prompt: string;
  context?: NexusContext;
}) {
  const data = await invokeNexus({
    workspaceId: opts.workspaceId,
    capability: opts.capability,
    messages: [{ role: "user", content: opts.prompt }],
    context: opts.context ?? {},
    persist: false,
  });
  return data.reply;
}

/** Chat state for the global Nexus AI panel. */
export function useNexusAi(context?: NexusContext) {
  const workspaceId = useWorkspaceId();
  const location = useLocation();
  const [messages, setMessages] = useState<NexusMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const counter = useRef(0);

  const nextId = () => `m${++counter.current}`;

  const fullContext = useMemo<NexusContext>(
    () => ({ route: location.pathname, ...context }),
    [location.pathname, context],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  // Starting a new page context shouldn't leak the previous record's thread.
  useEffect(() => {
    setConversationId(null);
  }, [workspaceId]);

  const send = useCallback(
    async (text: string, capability: NexusCapability = "chat") => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const history = messages
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.content }));

      const userMsg: NexusMessage = { id: nextId(), role: "user", content: trimmed };
      const placeholder: NexusMessage = { id: nextId(), role: "assistant", content: "", pending: true };
      setMessages((prev) => [...prev, userMsg, placeholder]);
      setLoading(true);

      try {
        const data = await invokeNexus({
          workspaceId,
          capability,
          conversationId,
          messages: [...history, { role: "user", content: trimmed }],
          context: fullContext,
        });
        if (data.conversationId) setConversationId(data.conversationId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholder.id
              ? { ...m, content: data.reply, actions: data.actions ?? [], pending: false }
              : m,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Nexus AI failed to respond.";
        setMessages((prev) =>
          prev.map((m) => (m.id === placeholder.id ? { ...m, content: message, pending: false, error: true } : m)),
        );
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, fullContext, loading, messages, workspaceId],
  );

  const resolveAction = useCallback(
    async (actionId: string, decision: "confirm" | "cancel") => {
      const { data, error } = await supabase.functions.invoke("nexus-ai-execute", {
        body: { workspaceId, actionId, decision },
      });
      if (error || data?.error) {
        const message = data?.error || error?.message || "Could not complete that action.";
        toast.error(message);
        return false;
      }
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          actions: m.actions?.map((a) =>
            a.id === actionId ? { ...a, status: decision === "cancel" ? "cancelled" : "completed" } : a,
          ),
        })),
      );
      toast.success(decision === "cancel" ? "Suggestion dismissed" : "Change applied");
      return true;
    },
    [workspaceId],
  );

  return { messages, send, loading, reset, resolveAction, conversationId };
}
