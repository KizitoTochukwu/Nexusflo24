import { Mail, Smartphone, MessageCircle } from "lucide-react";
import { useMessageCredits } from "@/hooks/useMessageCredits";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const channels = [
  { key: "email_balance" as const, icon: Mail, label: "Email", abbr: "E" },
  { key: "sms_balance" as const, icon: Smartphone, label: "SMS", abbr: "S" },
  { key: "whatsapp_balance" as const, icon: MessageCircle, label: "WA", abbr: "W" },
] as const;

export default function SidebarCreditWidget({ collapsed }: { collapsed: boolean }) {
  const { data: credits } = useMessageCredits();

  if (!credits) return null;

  const unlimited = !!credits.unlimited;
  const formatCount = (n: number) =>
    unlimited ? "∞" : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="px-2 pb-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            {channels.map((ch) => {
              const balance = (credits[ch.key] as number) ?? 0;
              const isLow = !unlimited && balance <= 10 && balance > 0;
              const isEmpty = !unlimited && balance === 0;
              return (
                <Tooltip key={ch.key}>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold ${
                        isEmpty
                          ? "bg-destructive/20 text-destructive"
                          : isLow
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-primary-foreground/10 text-primary-foreground/60"
                      }`}
                    >
                      {ch.abbr}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {ch.label}: {unlimited ? "Unlimited" : `${balance.toLocaleString()} credits`}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/40">
              Credits
            </p>
            {channels.map((ch) => {
              const Icon = ch.icon;
              const balance = (credits[ch.key] as number) ?? 0;
              const isLow = !unlimited && balance <= 10 && balance > 0;
              const isEmpty = !unlimited && balance === 0;
              return (
                <div
                  key={ch.key}
                  className="flex items-center gap-2 rounded-md px-3 py-1"
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isEmpty
                        ? "text-destructive"
                        : isLow
                        ? "text-yellow-400"
                        : "text-primary-foreground/50"
                    }`}
                  />
                  <span className="text-xs text-primary-foreground/60">{ch.label}</span>
                  <span
                    className={`ml-auto text-xs font-semibold ${
                      isEmpty
                        ? "text-destructive"
                        : isLow
                        ? "text-yellow-400"
                        : "text-primary-foreground/80"
                    }`}
                  >
                    {formatCount(balance)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
