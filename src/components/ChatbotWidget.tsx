import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Message = { role: "bot" | "user"; text: string };

const faqResponses: Record<string, string> = {
  pricing: "We offer 3 plans: Free Trial ($0 for 14 days), Pro ($49/mo), and Agency ($149/mo). Visit /pricing for details!",
  features: "NexusFlo24 includes AI Lead Gen, Smart CRM, Email & WhatsApp automation, SMS, Funnel Builder, AI Copywriter, and Analytics. Check /features for the full list!",
  trial: "Yes! Start a 14-day free trial with no credit card required. Visit /register to get started.",
  demo: "You can explore our demo dashboard at /dashboard, or contact us at /contact to book a live demo!",
  whatsapp: "NexusFlo24 supports WhatsApp automation including broadcasts, follow-ups, and chatbot replies.",
  integrations: "We integrate with Google Sheets, Zapier, Make.com, Meta Ads, Stripe, PayPal, and more!",
};

const findResponse = (input: string): string => {
  const lower = input.toLowerCase();
  for (const [key, response] of Object.entries(faqResponses)) {
    if (lower.includes(key)) return response;
  }
  if (lower.includes("price") || lower.includes("cost")) return faqResponses.pricing;
  if (lower.includes("free")) return faqResponses.trial;
  return "Great question! I'd love to help. Could you share your name and email so our team can follow up with a detailed answer?";
};

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "👋 Hi! I'm Nexus AI. How can I help you today? Ask me about features, pricing, or getting started!" },
  ]);
  const [input, setInput] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [captureStep, setCaptureStep] = useState(0);
  const [leadData, setLeadData] = useState({ name: "", email: "", goal: "" });
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (role: "bot" | "user", text: string) => {
    setMessages((prev) => [...prev, { role, text }]);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    addMessage("user", userMsg);
    setInput("");

    if (capturing) {
      if (captureStep === 0) {
        setLeadData((prev) => ({ ...prev, name: userMsg }));
        setCaptureStep(1);
        setTimeout(() => addMessage("bot", "Thanks! What's your email address?"), 500);
      } else if (captureStep === 1) {
        if (!/\S+@\S+\.\S+/.test(userMsg)) {
          setTimeout(() => addMessage("bot", "That doesn't look like a valid email. Please try again."), 500);
          return;
        }
        setLeadData((prev) => ({ ...prev, email: userMsg }));
        setCaptureStep(2);
        setTimeout(() => addMessage("bot", "And what's your main marketing goal? (e.g., more leads, better engagement, automation)"), 500);
      } else {
        setLeadData((prev) => ({ ...prev, goal: userMsg }));
        setCapturing(false);
        setCaptureStep(0);
        toast.success("Lead captured! Our team will reach out soon.");
        setTimeout(() => addMessage("bot", `Awesome! We've noted your info. Our team will reach out to help you with "${userMsg}". Anything else I can help with?`), 500);
      }
      return;
    }

    const response = findResponse(userMsg);
    setTimeout(() => addMessage("bot", response), 600);

    if (response.includes("name and email")) {
      setTimeout(() => {
        setCapturing(true);
        setCaptureStep(0);
        addMessage("bot", "What's your name?");
      }, 1200);
    }
  };

  return (
    <>
      {/* Toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-gold transition-transform hover:scale-105"
          aria-label="Open Nexus AI chat"
        >
          <MessageCircle className="h-6 w-6 text-accent-foreground" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-2xl border bg-card shadow-card-hover animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-primary-foreground">Nexus AI</span>
              <span className="h-2 w-2 rounded-full bg-accent" />
            </div>
            <button onClick={() => setOpen(false)} className="text-primary-foreground/60 hover:text-primary-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                className="text-sm"
                maxLength={500}
              />
              <Button type="submit" size="icon" className="bg-accent text-accent-foreground hover:bg-gold-dark shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
