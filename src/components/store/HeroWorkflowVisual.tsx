import { CalendarCheck, Database, Mail, MessageCircle, UserPlus, Zap } from "lucide-react";

const NODES = [
  { icon: UserPlus, label: "New Lead", note: "Enquiry received" },
  { icon: Database, label: "CRM", note: "Record created" },
  { icon: Zap, label: "Instant Notification", note: "Team alerted" },
  { icon: Mail, label: "Email", note: "Acknowledgement sent" },
  { icon: MessageCircle, label: "WhatsApp", note: "Conversation opened" },
  { icon: CalendarCheck, label: "Sales Follow-Up", note: "Next step booked" },
];

export default function HeroWorkflowVisual() {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Live automation
        </span>
        <span className="flex items-center gap-1.5 text-xs text-white/60">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Running
        </span>
      </div>

      <div className="space-y-2.5">
        {NODES.map((node, i) => (
          <div key={node.label} className="relative">
            <div
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-navy-light/60 p-3 transition-colors animate-fade-in"
              style={{ animationDelay: `${i * 140}ms`, animationFillMode: "both" }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15">
                <node.icon className="h-4 w-4 text-gold" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{node.label}</span>
                <span className="block truncate text-xs text-white/50">{node.note}</span>
              </span>
              <span
                className="h-1.5 w-1.5 rounded-full bg-gold/70 animate-pulse"
                style={{ animationDelay: `${i * 240}ms` }}
              />
            </div>
            {i < NODES.length - 1 && (
              <div className="ml-[30px] h-2.5 w-px bg-gradient-to-b from-gold/60 to-gold/10" />
            )}
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-xs text-white/50">
        Built, tested and launched for you by NexusFlo24
      </p>
    </div>
  );
}
