import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const variantIconMap = {
  default: { Icon: Info, tint: "bg-accent/10 text-accent" },
  destructive: { Icon: XCircle, tint: "bg-destructive/10 text-destructive" },
  success: { Icon: CheckCircle2, tint: "bg-emerald-500/10 text-emerald-600" },
  warning: { Icon: AlertTriangle, tint: "bg-accent/15 text-accent-foreground" },
  info: { Icon: Info, tint: "bg-primary/10 text-primary" },
} as const;

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const key = (variant ?? "default") as keyof typeof variantIconMap;
        const { Icon, tint } = variantIconMap[key] ?? variantIconMap.default;
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tint)}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
              {action && <div className="mt-2">{action}</div>}
            </div>
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
