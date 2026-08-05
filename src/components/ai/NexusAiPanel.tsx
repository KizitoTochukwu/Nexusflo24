import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RotateCcw, Send, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import TrustBadge from "@/components/ai/TrustBadge";
import ProposedActionCard from "@/components/ai/ProposedActionCard";
import { useNexusAi, type NexusCapability, type NexusContext } from "@/hooks/useNexusAi";
import nexusAiMark from "@/assets/nexus-ai-mark.png";

export const OPEN_NEXUS_AI_EVENT = "nexusflo:open-nexus-ai";

export interface OpenNexusAiOptions extends NexusContext {
  /** Optional question to send immediately once the panel opens. */
  prompt?: string;
  capability?: NexusCapability;
}

/** Dispatch this to open the panel with extra record context from any page. */
export function openNexusAi(options?: OpenNexusAiOptions) {
  window.dispatchEvent(new CustomEvent(OPEN_NEXUS_AI_EVENT, { detail: options ?? {} }));
}


const ROUTE_PROMPTS: Array<{
  match: RegExp;
  prompts: Array<{ label: string; prompt: string; capability?: NexusCapability }>;
}> = [
  {
    match: /\/leads/,
    prompts: [
      { label: "Who should I follow up today?", prompt: "Based on my confirmed contact data, who should I follow up with today and why?", capability: "next_actions" },
      { label: "Find data quality issues", prompt: "Review my contact data for duplicates, missing fields and stale records, and suggest clean-up steps.", capability: "data_cleanup" },
    ],
  },
  {
    match: /\/campaigns/,
    prompts: [
      { label: "Optimise my campaigns", prompt: "Review my campaign performance and suggest what to improve.", capability: "campaign_optimizer" },
      { label: "Write subject lines", prompt: "Write 8 subject lines for a re-engagement email to warm contacts.", capability: "subject_lines" },
    ],
  },
  {
    match: /\/analytics|\/overview/,
    prompts: [
      { label: "Summarise performance", prompt: "Summarise my workspace performance and tell me what to focus on next month.", capability: "report_summary" },
      { label: "Where am I losing leads?", prompt: "Based on the confirmed data, where am I most likely losing leads and what should I fix first?" },
    ],
  },
  {
    match: /\/messages/,
    prompts: [
      { label: "Summarise conversations", prompt: "Summarise the state of my current conversations and flag anything urgent.", capability: "conversation_summary" },
      { label: "Draft a follow-up", prompt: "Draft a short, friendly WhatsApp follow-up for a lead who went quiet after a demo.", capability: "reply_suggestion" },
    ],
  },
  {
    match: /\/automations|\/workflows/,
    prompts: [
      { label: "Suggest an automation", prompt: "Suggest one automation I should build next based on my workspace setup, and outline its steps." },
      { label: "Review my automations", prompt: "Review my active automations and tell me if anything looks redundant or missing." },
    ],
  },
];

const DEFAULT_PROMPTS = [
  { label: "What should I do next?", prompt: "Based on my confirmed workspace data, what are the three highest-impact things I should do this week?", capability: "next_actions" as NexusCapability },
  { label: "Write a blog post", prompt: "Write a blog post about automating lead follow-up for small businesses.", capability: "blog_writer" as NexusCapability },
  { label: "Write social posts", prompt: "Write LinkedIn and Instagram posts announcing our new AI booking reminders.", capability: "social_writer" as NexusCapability },
];

export default function NexusAiPanel() {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<NexusContext>({});
  const [input, setInput] = useState("");
  const location = useLocation();
  const { messages, send, loading, reset, resolveAction } = useNexusAi(context);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [queued, setQueued] = useState<{ prompt: string; capability: NexusCapability } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = ((e as CustomEvent).detail || {}) as OpenNexusAiOptions;
      const { prompt, capability, ...ctx } = detail;
      if (Object.keys(ctx).length) setContext(ctx);
      setOpen(true);
      if (prompt) {
        reset();
        setQueued({ prompt, capability: capability ?? "chat" });
      }
    };
    window.addEventListener(OPEN_NEXUS_AI_EVENT, handler);
    return () => window.removeEventListener(OPEN_NEXUS_AI_EVENT, handler);
  }, [reset]);

  // Run a queued prompt only after the new context has been applied.
  useEffect(() => {
    if (!queued) return;
    setQueued(null);
    send(queued.prompt, queued.capability);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queued, context]);


  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, loading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestions = useMemo(() => {
    const hit = ROUTE_PROMPTS.find((r) => r.match.test(location.pathname));
    return hit ? hit.prompts : DEFAULT_PROMPTS;
  }, [location.pathname]);

  const submit = (text: string, capability: NexusCapability = "chat") => {
    send(text, capability);
    setInput("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src={nexusAiMark} alt="" className="h-8 w-8 rounded-lg object-cover" />
            <div>
              <p className="text-sm font-semibold text-foreground">Nexus AI</p>
              <p className="text-[11px] text-muted-foreground">Grounded in your workspace data</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reset} aria-label="New chat">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {context.recordType && (
          <div className="border-b bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
            Focused on <span className="font-medium text-foreground">{context.recordType}</span>
            {context.recordSummary ? ` — ${context.recordSummary.slice(0, 70)}` : ""}
          </div>
        )}

        {/* Transcript */}
        <ScrollArea className="flex-1">
          <div className="space-y-4 px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ask about your contacts, campaigns, automations or performance. Nexus AI only quotes data from
                  your workspace, and never changes anything without your approval.
                </p>
                <div className="flex flex-wrap gap-2">
                  <TrustBadge level="confirmed" />
                  <TrustBadge level="insight" />
                  <TrustBadge level="draft" />
                </div>
                <div className="space-y-2 pt-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => submit(s.prompt, s.capability ?? "chat")}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:border-accent hover:bg-muted"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="space-y-2">
                  {m.pending ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Thinking…
                    </div>
                  ) : m.error ? (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                      {m.content}
                    </p>
                  ) : (
                    <>
                      <TrustBadge level="insight" />
                      <div className="prose prose-sm max-w-none text-sm text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-p:my-2 prose-li:my-0.5 prose-ul:my-2">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </>
                  )}
                  {m.actions?.map((a) => (
                    <ProposedActionCard key={a.id} action={a} onResolve={resolveAction} />
                  ))}
                </div>
              ),
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="border-t p-3">
          <div className="relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              placeholder="Ask Nexus AI about your workspace…"
              rows={2}
              className="resize-none pr-12 text-sm"
            />
            <Button
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 bg-accent text-accent-foreground hover:bg-gold-dark"
              disabled={loading || !input.trim()}
              onClick={() => submit(input)}
              aria-label="Send"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Nexus AI can make mistakes. Changes always need your approval.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
