import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCY_LIST, type CurrencyCode } from "@/lib/currency/config";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "default" | "compact";
  className?: string;
}

export default function CurrencySwitcher({ variant = "default", className }: Props) {
  const { currency, setCurrency } = useCurrency();
  const active = CURRENCY_LIST.find((c) => c.code === currency)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none",
          variant === "compact" && "px-2 py-1 text-xs",
          className,
        )}
        aria-label="Change currency"
      >
        <span className="text-base leading-none">{active.flag}</span>
        <span>{active.code}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Currency
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CURRENCY_LIST.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setCurrency(c.code as CurrencyCode)}
            className="flex items-center gap-2"
          >
            <span className="text-base leading-none">{c.flag}</span>
            <span className="flex-1">
              <span className="font-medium">{c.code}</span>{" "}
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </span>
            {currency === c.code && <Check className="h-3.5 w-3.5 text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
