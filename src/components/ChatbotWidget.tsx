import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Zap, Loader2, UserPlus, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import nexusAiLogo from "@/assets/nexus-ai-logo.png";

type Message = { role: "assistant" | "user"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nexus-ai-chat`;

const LEAD_TAG_RE = /\[LEAD_CAPTURED:name=([^;]+);email=([^\]]+)\]/;
const HANDOFF_TAG_RE = /\[HUMAN_HANDOFF\]/;
async function streamChat({
  messages,
  capturedLead,
  workspaceId,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  capturedLead?: { name: string; email: string; intent?: string } | null;
  workspaceId?: string | null;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, capturedLead, workspaceId }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || "Something went wrong. Please try again.");
    return;
  }

  if (!resp.body) { onError("No response received."); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }
  onDone();
}

// Strip completed tags and hide partial tags that are still streaming in
function stripLeadTag(text: string) {
  let cleaned = text.replace(LEAD_TAG_RE, "").replace(HANDOFF_TAG_RE, "");
  // Hide partial tags at the end of the stream (e.g. "[HUMAN_HAN" or "[LEAD_CAPT")
  cleaned = cleaned.replace(/\[(?:HUMAN_HANDOFF|LEAD_CAPTURED[:;=\w@.]*)?$/i, "");
  return cleaned.trim();
}

function getCurrentWorkspaceId() {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/^\/dashboard\/([^/]+)/);
  return match?.[1] ?? null;
}

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "👋 Hi! I'm **Nexus AI**. How can I help you today? Ask me about features, pricing, or getting started!" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [handoffTriggered, setHandoffTriggered] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const workspaceId = getCurrentWorkspaceId();

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    let pendingLead: { name: string; email: string } | null = null;
    let pendingHandoff = false;

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;

      // Check for lead capture tag
      const match = assistantSoFar.match(LEAD_TAG_RE);
      if (match && !leadCaptured) {
        pendingLead = { name: match[1], email: match[2] };
      }

      if (HANDOFF_TAG_RE.test(assistantSoFar) && !handoffTriggered) {
        pendingHandoff = true;
      }

      const displayText = stripLeadTag(assistantSoFar);

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > allMessages.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: displayText } : m));
        }
        return [...prev.slice(0, allMessages.length), { role: "assistant", content: displayText }];
      });
    };

    try {
      await streamChat({
        messages: allMessages,
        workspaceId,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => {
          setIsLoading(false);
          // Send captured lead to backend
          if (pendingLead && !leadCaptured) {
            setLeadCaptured(true);
            fetch(CHAT_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                messages: [{ role: "user", content: "ping" }],
                capturedLead: { ...pendingLead, intent: "Chatbot conversation" },
                workspaceId,
              }),
            }).catch(() => {});
          }
          // Send human handoff notification
          if (pendingHandoff && !handoffTriggered) {
            setHandoffTriggered(true);
            fetch(CHAT_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                messages: [{ role: "user", content: "ping" }],
                workspaceId,
                humanHandoff: {
                  name: pendingLead?.name || null,
                  email: pendingLead?.email || null,
                },
              }),
            }).catch(() => {});
          }
        },
        onError: (err) => {
          setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I ran into an issue: ${err}` }]);
          setIsLoading(false);
        },
      });
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
      setIsLoading(false);
    }
  }, [input, isLoading, messages, leadCaptured, handoffTriggered, workspaceId]);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-gold transition-transform hover:scale-105 active:scale-95"
          aria-label="Open Nexus AI chat"
        >
          <img src={nexusAiLogo} alt="Nexus AI" className="h-8 w-8 rounded-lg object-cover" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border bg-card shadow-card-hover animate-fade-up">
          <div className="flex items-center justify-between bg-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <img src={nexusAiLogo} alt="Nexus AI" className="h-6 w-6 rounded-md object-cover" />
              <span className="text-sm font-semibold text-primary-foreground">Nexus AI</span>
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            </div>
            <div className="flex items-center gap-1">
              {leadCaptured && (
                <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent font-medium">
                  <UserPlus className="h-2.5 w-2.5" /> Lead saved
                </span>
              )}
              <button onClick={() => setOpen(false)} className="text-primary-foreground/60 hover:text-primary-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {handoffTriggered && (
            <div className="border-t px-3 py-2">
              <a
                href="/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <PhoneCall className="h-4 w-4" />
                Contact Our Team
              </a>
            </div>
          )}

          <div className="border-t p-3">
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything…"
                className="text-sm"
                maxLength={500}
                disabled={isLoading}
              />
              <Button type="submit" size="icon" className="bg-accent text-accent-foreground hover:bg-gold-dark shrink-0" disabled={isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Powered by Nexus AI</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
